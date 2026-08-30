import { createHash } from 'node:crypto';
import { access, appendFile, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { inspectCheckpoint, ModelLibrary, ModelLibraryError } from '../apps/diffusion/src/main/model-library';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
async function temp() { const root = await mkdtemp(path.join(os.tmpdir(), 'zynalo-models-')); roots.push(root); return root; }

async function safetensors(filePath: string, dataBytes = 8, overlap = false) {
  const middle = Math.floor(dataBytes / 2);
  const header = Buffer.from(JSON.stringify({
    'conditioner.embedders.1.model.weight': { dtype: 'U8', shape: [middle], data_offsets: [0, middle] },
    'model.diffusion_model.input.weight': { dtype: 'U8', shape: [dataBytes - middle], data_offsets: overlap ? [0, dataBytes] : [middle, dataBytes] },
  }));
  const prefix = Buffer.alloc(8); prefix.writeBigUInt64LE(BigInt(header.length));
  await writeFile(filePath, Buffer.concat([prefix, header, Buffer.alloc(dataBytes, 7)]));
}

describe('safetensors checkpoint inspection', () => {
  it('parses bounded headers, validates ranges, and streams SHA-256', async () => {
    const root = await temp(); const file = path.join(root, 'model.safetensors'); await safetensors(file);
    const inspected = await inspectCheckpoint(file, undefined, 0);
    expect(inspected.validationStatus).toBe('valid');
    expect(inspected.compatibility.status).toBe('likely-sdxl');
    expect(inspected.sha256).toBe(createHash('sha256').update(await readFile(file)).digest('hex'));
  });

  it('rejects truncated, oversized, malformed, and overlapping headers', async () => {
    const root = await temp();
    const truncated = path.join(root, 'truncated.safetensors'); await writeFile(truncated, Buffer.from([1, 2]));
    await expect(inspectCheckpoint(truncated, undefined, 0)).rejects.toMatchObject({ code: 'INVALID_SAFETENSORS' });
    const oversized = path.join(root, 'oversized.safetensors'); const prefix = Buffer.alloc(8); prefix.writeBigUInt64LE(BigInt(17 * 1024 * 1024)); await writeFile(oversized, prefix);
    await expect(inspectCheckpoint(oversized, undefined, 0)).rejects.toMatchObject({ code: 'INVALID_SAFETENSORS' });
    const malformed = path.join(root, 'malformed.safetensors'); const bad = Buffer.from('{no'); const badPrefix = Buffer.alloc(8); badPrefix.writeBigUInt64LE(BigInt(bad.length)); await writeFile(malformed, Buffer.concat([badPrefix, bad]));
    await expect(inspectCheckpoint(malformed, undefined, 0)).rejects.toMatchObject({ code: 'INVALID_SAFETENSORS' });
    const overlapping = path.join(root, 'overlap.safetensors'); await safetensors(overlapping, 8, true);
    await expect(inspectCheckpoint(overlapping, undefined, 0)).rejects.toMatchObject({ code: 'INVALID_SAFETENSORS' });
  });
});

describe('atomic model registry and storage', () => {
  it('persists registrations, selected model, and recovers a corrupt registry', async () => {
    const root = await temp(); const source = path.join(root, 'source.safetensors'); await safetensors(source);
    const library = new ModelLibrary(path.join(root, 'user'), undefined, 0); await library.initialize();
    const choice = library.addSelection(source); await library.inspect(choice.token); const item = await library.import(choice.token, 'Test SDXL', 'external');
    const restarted = new ModelLibrary(path.join(root, 'user'), undefined, 0); await restarted.initialize();
    expect(restarted.list()).toMatchObject([{ id: item.id, displayName: 'Test SDXL', selected: true }]);
    const registry = JSON.parse(await readFile(restarted.registryPath, 'utf8')); expect(registry.schemaVersion).toBe(1);
    expect((await readdir(path.dirname(restarted.registryPath))).some((name) => name.endsWith('.tmp'))).toBe(false);
    await writeFile(restarted.registryPath, '{partial'); const recovered = new ModelLibrary(path.join(root, 'user'), undefined, 0); await recovered.initialize();
    expect(recovered.list()).toEqual([]);
    expect((await readdir(path.join(root, 'user'))).some((name) => name.startsWith('model-registry.corrupt-'))).toBe(true);
  });

  it('detects duplicates and external file changes and removes without deleting sources', async () => {
    const root = await temp(); const source = path.join(root, 'source.safetensors'); await safetensors(source);
    const library = new ModelLibrary(path.join(root, 'user'), undefined, 0); await library.initialize();
    const first = library.addSelection(source); await library.inspect(first.token); const item = await library.import(first.token, 'One', 'external');
    const duplicate = library.addSelection(source); await library.inspect(duplicate.token); await expect(library.import(duplicate.token, 'Two', 'external')).rejects.toBeInstanceOf(ModelLibraryError);
    await appendFile(source, Buffer.from([1])); expect((await library.revalidate(item.id)).validationStatus).toBe('changed');
    await library.remove(item.id, false); await expect(access(source)).resolves.toBeUndefined();
  });

  it('marks disappeared external files missing and rejects managed paths outside storage', async () => {
    const root = await temp(); const source = path.join(root, 'source.safetensors'); await safetensors(source);
    const userData = path.join(root, 'user'); const library = new ModelLibrary(userData, undefined, 0); await library.initialize();
    const choice = library.addSelection(source); await library.inspect(choice.token); const item = await library.import(choice.token, 'Missing', 'external');
    await rm(source); expect((await library.revalidate(item.id)).validationStatus).toBe('missing');
    const record = library.getRecord(item.id); record.source = { kind: 'managed', path: path.join(root, 'outside.safetensors') };
    await writeFile(library.registryPath, JSON.stringify({ schemaVersion: 1, models: [record] }));
    const recovered = new ModelLibrary(userData, undefined, 0); await recovered.initialize(); expect(recovered.list()).toEqual([]);
  });

  it('stages and promotes managed copies, cleans interrupted copies, and explicitly deletes managed files', async () => {
    const root = await temp(); const source = path.join(root, 'large.safetensors'); await safetensors(source, 9 * 1024 * 1024);
    let cancelToken = ''; const holder: { library?: ModelLibrary } = {};
    const library = new ModelLibrary(path.join(root, 'cancel-user'), (event) => { if (event.stage === 'copying' && cancelToken) holder.library?.cancel(cancelToken); }, 0); holder.library = library; await library.initialize();
    const cancelled = library.addSelection(source); cancelToken = cancelled.token; await library.inspect(cancelled.token);
    await expect(library.import(cancelled.token, 'Cancelled', 'managed')).rejects.toMatchObject({ code: 'CANCELLED' });
    expect((await readdir(library.managedRoot)).some((name) => name.endsWith('.tmp'))).toBe(false);

    const complete = new ModelLibrary(path.join(root, 'complete-user'), undefined, 0); await complete.initialize();
    const choice = complete.addSelection(source); await complete.inspect(choice.token); const item = await complete.import(choice.token, 'Managed', 'managed');
    const managedPath = complete.getRecord(item.id).source.path; expect((await stat(managedPath)).size).toBe((await stat(source)).size);
    await complete.remove(item.id, true); await expect(access(managedPath)).rejects.toThrow(); await expect(access(source)).resolves.toBeUndefined();
  });
});
