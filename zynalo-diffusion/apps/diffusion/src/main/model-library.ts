import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  mkdir, open, readFile, realpath, rename, rm, stat, statfs,
} from 'node:fs/promises';
import path from 'node:path';
import type {
  ModelCompatibility,
  ModelImportInspection,
  ModelLibraryItem,
  ModelOperationProgress,
  ModelValidationStatus,
} from '@zynalo/diffusion-contracts';

export const MODEL_REGISTRY_SCHEMA_VERSION = 1;
const MAX_HEADER_BYTES = 16 * 1024 * 1024;
const PLAUSIBLE_SDXL_BYTES = 100 * 1024 * 1024;
const MODEL_ID = /^mdl_[a-f0-9]{32}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DTYPE_BYTES: Record<string, number> = { BOOL: 1, U8: 1, I8: 1, F8_E4M3: 1, F8_E5M2: 1, U16: 2, I16: 2, F16: 2, BF16: 2, U32: 4, I32: 4, F32: 4, U64: 8, I64: 8, F64: 8 };

export interface ModelRecord {
  id: string;
  displayName: string;
  architecture: 'sdxl';
  format: 'safetensors';
  source: { kind: 'external' | 'managed'; path: string };
  fileSize: number;
  modifiedAtMs: number;
  sha256: string;
  importedAt: string;
  lastValidatedAt: string;
  validationStatus: ModelValidationStatus;
  compatibility: ModelCompatibility;
  lastLoadError?: string;
}

interface RegistryDocument {
  schemaVersion: 1;
  selectedModelId?: string;
  models: ModelRecord[];
}

interface PendingSelection {
  path: string;
  fileName: string;
  inspection?: ModelImportInspection;
  modifiedAtMs?: number;
}

export class ModelLibraryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ModelLibraryError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validCompatibility(value: unknown): value is ModelCompatibility {
  return isRecord(value) && ['likely-sdxl', 'confirmed-sdxl', 'unsupported', 'unknown'].includes(String(value.status)) &&
    typeof value.summary === 'string' && value.summary.length <= 500 && Array.isArray(value.evidence) &&
    value.evidence.length <= 20 && value.evidence.every((item) => typeof item === 'string' && item.length <= 300);
}

export function validateModelRecord(value: unknown, managedRoot: string): value is ModelRecord {
  if (!isRecord(value) || Object.keys(value).some((key) => ![
    'id', 'displayName', 'architecture', 'format', 'source', 'fileSize', 'modifiedAtMs', 'sha256',
    'importedAt', 'lastValidatedAt', 'validationStatus', 'compatibility', 'lastLoadError',
  ].includes(key))) return false;
  if (!MODEL_ID.test(String(value.id)) || typeof value.displayName !== 'string' || value.displayName.length < 1 || value.displayName.length > 200 ||
      value.architecture !== 'sdxl' || value.format !== 'safetensors' || !Number.isSafeInteger(value.fileSize) || Number(value.fileSize) < 0 ||
      typeof value.modifiedAtMs !== 'number' || !Number.isFinite(value.modifiedAtMs) || !SHA256.test(String(value.sha256)) ||
      !['valid', 'missing', 'changed', 'unsupported', 'invalid'].includes(String(value.validationStatus)) ||
      !validCompatibility(value.compatibility) || (value.lastLoadError !== undefined && (typeof value.lastLoadError !== 'string' || value.lastLoadError.length > 4000)) ||
      Number.isNaN(Date.parse(String(value.importedAt))) || Number.isNaN(Date.parse(String(value.lastValidatedAt)))) return false;
  if (!isRecord(value.source) || !['external', 'managed'].includes(String(value.source.kind)) || typeof value.source.path !== 'string' || !path.isAbsolute(value.source.path)) return false;
  if (value.source.kind === 'managed' && !pathWithin(managedRoot, value.source.path)) return false;
  return true;
}

function pathWithin(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function publicItem(record: ModelRecord, selectedId?: string, loadedId?: string): ModelLibraryItem {
  return {
    id: record.id,
    displayName: record.displayName,
    architecture: record.architecture,
    format: record.format,
    sourceKind: record.source.kind,
    locationDisplay: record.source.kind === 'managed' ? `Zynalo storage / ${path.basename(record.source.path)}` : path.basename(record.source.path),
    fileSize: record.fileSize,
    sha256: record.sha256,
    importedAt: record.importedAt,
    lastValidatedAt: record.lastValidatedAt,
    validationStatus: record.validationStatus,
    compatibility: record.compatibility,
    selected: record.id === selectedId,
    loaded: record.id === loadedId,
    ...(record.lastLoadError ? { lastLoadError: record.lastLoadError } : {}),
  };
}

export class ModelLibrary {
  readonly registryPath: string;
  readonly managedRoot: string;
  readonly #pending = new Map<string, PendingSelection>();
  readonly #cancelled = new Set<string>();
  #document: RegistryDocument = { schemaVersion: 1, models: [] };
  #loadedModelId: string | undefined;

  constructor(
    readonly userData: string,
    readonly onProgress: (event: ModelOperationProgress) => void = () => undefined,
    readonly minimumPlausibleBytes = PLAUSIBLE_SDXL_BYTES,
  ) {
    this.registryPath = path.join(userData, 'model-registry.v1.json');
    this.managedRoot = path.join(userData, 'models');
  }

  async initialize(): Promise<void> {
    await mkdir(this.managedRoot, { recursive: true });
    await this.#cleanupStaging();
    try {
      const value = JSON.parse(await readFile(this.registryPath, 'utf8')) as unknown;
      if (!isRecord(value) || value.schemaVersion !== MODEL_REGISTRY_SCHEMA_VERSION || !Array.isArray(value.models) ||
          value.models.some((record) => !validateModelRecord(record, this.managedRoot)) ||
          (value.selectedModelId !== undefined && !MODEL_ID.test(String(value.selectedModelId)))) {
        throw new Error('Registry schema validation failed.');
      }
      this.#document = value as unknown as RegistryDocument;
      if (this.#document.selectedModelId && !this.#document.models.some((model) => model.id === this.#document.selectedModelId)) {
        delete this.#document.selectedModelId;
      }
      await this.#refreshStatStatuses();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        const corrupt = path.join(this.userData, `model-registry.corrupt-${Date.now()}.json`);
        await rename(this.registryPath, corrupt).catch(() => undefined);
      }
      this.#document = { schemaVersion: 1, models: [] };
      await this.#persist();
    }
  }

  list(): ModelLibraryItem[] {
    return this.#document.models.map((record) => publicItem(record, this.#document.selectedModelId, this.#loadedModelId));
  }

  getRecord(modelId: string): ModelRecord {
    const record = this.#document.models.find((model) => model.id === modelId);
    if (!record) throw new ModelLibraryError('MODEL_NOT_FOUND', 'The registered model was not found.');
    return structuredClone(record);
  }

  get selectedModelId(): string | undefined { return this.#document.selectedModelId; }
  get loadedModelId(): string | undefined { return this.#loadedModelId; }

  async setSelected(modelId: string | undefined): Promise<void> {
    if (modelId && !this.#document.models.some((model) => model.id === modelId)) throw new ModelLibraryError('MODEL_NOT_FOUND', 'The selected model is not registered.');
    if (modelId) this.#document.selectedModelId = modelId;
    else delete this.#document.selectedModelId;
    await this.#persist();
  }

  setLoaded(modelId: string | undefined, error?: string): void {
    this.#loadedModelId = modelId;
    if (error && this.#document.selectedModelId) {
      const record = this.#document.models.find((model) => model.id === this.#document.selectedModelId);
      if (record) record.lastLoadError = error.slice(0, 4000);
      void this.#persist();
    } else if (modelId) {
      const record = this.#document.models.find((model) => model.id === modelId);
      if (record) delete record.lastLoadError;
      void this.#persist();
    }
  }

  addSelection(filePath: string): { token: string; fileName: string } {
    const token = `imp_${randomUUID().replaceAll('-', '')}`;
    this.#pending.set(token, { path: filePath, fileName: path.basename(filePath) });
    return { token, fileName: path.basename(filePath) };
  }

  cancel(token: string): void { this.#cancelled.add(token); }
  cancelAll(): void { for (const token of this.#pending.keys()) this.#cancelled.add(token); }

  async inspect(token: string): Promise<ModelImportInspection> {
    const pending = this.#pending.get(token);
    if (!pending) throw new ModelLibraryError('IMPORT_NOT_FOUND', 'The model import selection expired. Choose the file again.');
    this.#checkCancelled(token);
    const inspected = await inspectCheckpoint(pending.path, (stage, progress, bytesProcessed, totalBytes) => {
      this.onProgress({ token, stage, progress, bytesProcessed, totalBytes });
      this.#checkCancelled(token);
    }, this.minimumPlausibleBytes);
    const inspection: ModelImportInspection = { token, fileName: pending.fileName, ...inspected };
    pending.inspection = inspection;
    pending.modifiedAtMs = (await stat(pending.path)).mtimeMs;
    return inspection;
  }

  async import(token: string, displayName: string, mode: 'external' | 'managed'): Promise<ModelLibraryItem> {
    const pending = this.#pending.get(token);
    if (!pending?.inspection) throw new ModelLibraryError('IMPORT_NOT_INSPECTED', 'Validate the checkpoint before importing it.');
    if (pending.inspection.validationStatus !== 'valid') throw new ModelLibraryError('MODEL_UNSUPPORTED', pending.inspection.compatibility.summary);
    this.#checkCancelled(token);
    const sourcePath = await realpath(pending.path);
    const current = await stat(sourcePath).catch(() => { throw new ModelLibraryError('SOURCE_MISSING', 'The selected checkpoint disappeared. Choose it again.'); });
    if (!current.isFile() || current.size !== pending.inspection.fileSize || current.mtimeMs !== pending.modifiedAtMs) {
      throw new ModelLibraryError('SOURCE_CHANGED', 'The checkpoint changed after validation. Validate it again.');
    }
    const duplicate = this.#document.models.find((record) => path.resolve(record.source.path).toLowerCase() === path.resolve(sourcePath).toLowerCase() && record.sha256 === pending.inspection!.sha256);
    if (duplicate) throw new ModelLibraryError('DUPLICATE_MODEL', 'This exact checkpoint is already registered.');

    const id = `mdl_${randomUUID().replaceAll('-', '')}`;
    let finalPath = sourcePath;
    if (mode === 'managed') finalPath = await this.#copyManaged(token, id, sourcePath, pending.inspection);
    const finalStat = await stat(finalPath);
    const now = new Date().toISOString();
    const record: ModelRecord = {
      id, displayName, architecture: 'sdxl', format: 'safetensors', source: { kind: mode, path: finalPath },
      fileSize: finalStat.size, modifiedAtMs: finalStat.mtimeMs, sha256: pending.inspection.sha256,
      importedAt: now, lastValidatedAt: now, validationStatus: 'valid', compatibility: pending.inspection.compatibility,
    };
    this.#document.models.push(record);
    this.#document.selectedModelId = id;
    this.onProgress({ token, stage: 'persisting', progress: 1 });
    try { await this.#persist(); } catch (error) {
      this.#document.models.pop();
      if (mode === 'managed') await rm(finalPath, { force: true });
      throw new ModelLibraryError('REGISTRY_WRITE_FAILED', `Could not save the model registry: ${String(error)}`);
    } finally {
      this.#pending.delete(token);
      this.#cancelled.delete(token);
    }
    return publicItem(record, id, this.#loadedModelId);
  }

  async revalidate(modelId: string): Promise<ModelLibraryItem> {
    const record = this.#document.models.find((model) => model.id === modelId);
    if (!record) throw new ModelLibraryError('MODEL_NOT_FOUND', 'The registered model was not found.');
    const token = `val_${randomUUID().replaceAll('-', '')}`;
    try {
      const inspected = await inspectCheckpoint(record.source.path, (stage, progress, bytesProcessed, totalBytes) => this.onProgress({ token, stage, progress, bytesProcessed, totalBytes }), this.minimumPlausibleBytes);
      record.lastValidatedAt = new Date().toISOString();
      record.compatibility = inspected.compatibility;
      const info = await stat(record.source.path);
      record.validationStatus = inspected.sha256 === record.sha256 ? inspected.validationStatus : 'changed';
      record.fileSize = info.size;
      record.modifiedAtMs = info.mtimeMs;
    } catch (error) {
      record.lastValidatedAt = new Date().toISOString();
      record.validationStatus = (error as NodeJS.ErrnoException).code === 'ENOENT' || (error as ModelLibraryError).code === 'SOURCE_MISSING' ? 'missing' : 'invalid';
    }
    await this.#persist();
    return publicItem(record, this.#document.selectedModelId, this.#loadedModelId);
  }

  async remove(modelId: string, deleteManagedFile: boolean): Promise<void> {
    const index = this.#document.models.findIndex((model) => model.id === modelId);
    if (index < 0) throw new ModelLibraryError('MODEL_NOT_FOUND', 'The registered model was not found.');
    const record = this.#document.models[index]!;
    if (deleteManagedFile && record.source.kind !== 'managed') throw new ModelLibraryError('EXTERNAL_DELETE_DENIED', 'Zynalo never deletes externally owned checkpoints.');
    if (deleteManagedFile) {
      if (!pathWithin(this.managedRoot, record.source.path)) throw new ModelLibraryError('PATH_BOUNDARY', 'Managed model path failed its storage-boundary check.');
      await rm(record.source.path, { force: true });
    }
    this.#document.models.splice(index, 1);
    if (this.#document.selectedModelId === modelId) delete this.#document.selectedModelId;
    if (this.#loadedModelId === modelId) this.#loadedModelId = undefined;
    await this.#persist();
  }

  async #copyManaged(token: string, id: string, sourcePath: string, inspection: ModelImportInspection): Promise<string> {
    const available = await statfs(this.managedRoot);
    if (available.bavail * available.bsize < inspection.fileSize + 64 * 1024 * 1024) throw new ModelLibraryError('INSUFFICIENT_SPACE', 'Not enough free space to copy this checkpoint into Zynalo storage.');
    const destination = path.join(this.managedRoot, `${id}.safetensors`);
    const temporary = path.join(this.managedRoot, `.import-${token}.tmp`);
    const source = await open(sourcePath, 'r');
    const output = await open(temporary, 'wx');
    const hash = createHash('sha256');
    let offset = 0;
    let copyError: unknown;
    const buffer = Buffer.allocUnsafe(8 * 1024 * 1024);
    try {
      while (offset < inspection.fileSize) {
        this.#checkCancelled(token);
        const { bytesRead } = await source.read(buffer, 0, Math.min(buffer.length, inspection.fileSize - offset), offset);
        if (bytesRead === 0) throw new ModelLibraryError('SOURCE_MISSING', 'The checkpoint became unavailable during copying.');
        hash.update(buffer.subarray(0, bytesRead));
        await output.write(buffer, 0, bytesRead, offset);
        offset += bytesRead;
        this.onProgress({ token, stage: 'copying', progress: offset / inspection.fileSize, bytesProcessed: offset, totalBytes: inspection.fileSize });
      }
      await output.sync();
    } catch (error) { copyError = error; } finally {
      await source.close();
      await output.close();
    }
    if (copyError) { await rm(temporary, { force: true }); throw copyError; }
    if (hash.digest('hex') !== inspection.sha256) {
      await rm(temporary, { force: true });
      throw new ModelLibraryError('COPY_VERIFICATION_FAILED', 'The managed copy did not match the validated source checkpoint.');
    }
    try { await rename(temporary, destination); } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    return destination;
  }

  #checkCancelled(token: string): void {
    if (this.#cancelled.has(token)) throw new ModelLibraryError('CANCELLED', 'Model import cancelled.');
  }

  async #refreshStatStatuses(): Promise<void> {
    let changed = false;
    for (const record of this.#document.models) {
      try {
        const info = await stat(record.source.path);
        const next = !info.isFile() ? 'missing' : info.size !== record.fileSize || info.mtimeMs !== record.modifiedAtMs ? 'changed' : record.validationStatus;
        if (next !== record.validationStatus) { record.validationStatus = next; changed = true; }
      } catch { if (record.validationStatus !== 'missing') { record.validationStatus = 'missing'; changed = true; } }
    }
    if (changed) await this.#persist();
  }

  async #cleanupStaging(): Promise<void> {
    const entries = await import('node:fs/promises').then(({ readdir }) => readdir(this.managedRoot));
    await Promise.all(entries.filter((entry) => /^\.import-[a-zA-Z0-9_-]+\.tmp$/.test(entry)).map((entry) => rm(path.join(this.managedRoot, entry), { force: true })));
  }

  async #persist(): Promise<void> {
    await mkdir(path.dirname(this.registryPath), { recursive: true });
    const temporary = `${this.registryPath}.${process.pid}.${randomUUID()}.tmp`;
    const serialized = `${JSON.stringify(this.#document, null, 2)}\n`;
    const handle = await open(temporary, 'wx');
    try { await handle.writeFile(serialized, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, this.registryPath).catch(async (error) => { await rm(temporary, { force: true }); throw error; });
  }
}

export async function inspectCheckpoint(
  filePath: string,
  progress: (stage: 'validating' | 'hashing', value: number, processed: number, total: number) => void = () => undefined,
  minimumPlausibleBytes = PLAUSIBLE_SDXL_BYTES,
): Promise<Omit<ModelImportInspection, 'token' | 'fileName'>> {
  if (path.extname(filePath).toLowerCase() !== '.safetensors') throw new ModelLibraryError('UNSUPPORTED_EXTENSION', 'Only .safetensors checkpoints are supported.');
  const info = await stat(filePath).catch((error: NodeJS.ErrnoException) => { throw new ModelLibraryError(error.code === 'ENOENT' ? 'SOURCE_MISSING' : 'FILESYSTEM_ERROR', 'The checkpoint could not be read.'); });
  if (!info.isFile()) throw new ModelLibraryError('NOT_A_FILE', 'The selected path is not a regular file.');
  progress('validating', 0, 0, info.size);
  const handle = await open(filePath, 'r');
  let keys: string[];
  try {
    const prefix = Buffer.alloc(8);
    if ((await handle.read(prefix, 0, 8, 0)).bytesRead !== 8) throw new ModelLibraryError('INVALID_SAFETENSORS', 'The safetensors header is truncated.');
    const headerLength = Number(prefix.readBigUInt64LE());
    if (!Number.isSafeInteger(headerLength) || headerLength < 2 || headerLength > MAX_HEADER_BYTES || 8 + headerLength > info.size) {
      throw new ModelLibraryError('INVALID_SAFETENSORS', 'The safetensors header length is invalid or exceeds the 16 MiB safety limit.');
    }
    const headerBytes = Buffer.alloc(headerLength);
    if ((await handle.read(headerBytes, 0, headerLength, 8)).bytesRead !== headerLength) throw new ModelLibraryError('INVALID_SAFETENSORS', 'The safetensors JSON header is truncated.');
    let header: unknown;
    try { header = JSON.parse(headerBytes.toString('utf8').trimEnd()); } catch { throw new ModelLibraryError('INVALID_SAFETENSORS', 'The safetensors JSON header is malformed.'); }
    if (!isRecord(header)) throw new ModelLibraryError('INVALID_SAFETENSORS', 'The safetensors header must be an object.');
    if (header.__metadata__ !== undefined && (!isRecord(header.__metadata__) || Object.values(header.__metadata__).some((item) => typeof item !== 'string'))) {
      throw new ModelLibraryError('INVALID_SAFETENSORS', 'Safetensors metadata must contain only text values.');
    }
    const ranges: Array<[number, number]> = [];
    keys = Object.keys(header).filter((key) => key !== '__metadata__');
    const dataBytes = info.size - 8 - headerLength;
    for (const key of keys) {
      const tensor = header[key];
      if (!isRecord(tensor) || !Array.isArray(tensor.shape) || !tensor.shape.every((dimension) => Number.isSafeInteger(dimension) && Number(dimension) >= 0) ||
          typeof tensor.dtype !== 'string' || DTYPE_BYTES[tensor.dtype] === undefined || !Array.isArray(tensor.data_offsets) || tensor.data_offsets.length !== 2 ||
          !tensor.data_offsets.every((offset) => Number.isSafeInteger(offset))) throw new ModelLibraryError('INVALID_SAFETENSORS', `Tensor metadata is invalid for ${key.slice(0, 100)}.`);
      const start = Number(tensor.data_offsets[0]); const end = Number(tensor.data_offsets[1]);
      if (start < 0 || end < start || end > dataBytes) throw new ModelLibraryError('INVALID_SAFETENSORS', 'A tensor byte range lies outside the checkpoint.');
      const elements = tensor.shape.reduce((product, dimension) => product * Number(dimension), 1);
      if (!Number.isSafeInteger(elements) || elements * DTYPE_BYTES[tensor.dtype]! !== end - start) throw new ModelLibraryError('INVALID_SAFETENSORS', 'A tensor shape and byte range are inconsistent.');
      ranges.push([start, end]);
    }
    ranges.sort((left, right) => left[0] - right[0]);
    for (let index = 1; index < ranges.length; index += 1) if (ranges[index]![0] < ranges[index - 1]![1]) throw new ModelLibraryError('INVALID_SAFETENSORS', 'Tensor byte ranges overlap.');
  } finally { await handle.close(); }

  const compatibility = detectCompatibility(keys, info.size, minimumPlausibleBytes);
  const hash = createHash('sha256');
  let processed = 0;
  for await (const chunk of createReadStream(filePath, { highWaterMark: 8 * 1024 * 1024 })) {
    hash.update(chunk as Buffer); processed += (chunk as Buffer).length;
    progress('hashing', info.size === 0 ? 1 : processed / info.size, processed, info.size);
  }
  return { fileSize: info.size, sha256: hash.digest('hex'), validationStatus: compatibility.status === 'likely-sdxl' ? 'valid' : 'unsupported', compatibility };
}

function detectCompatibility(keys: string[], size: number, minimumPlausibleBytes: number): ModelCompatibility {
  const evidence: string[] = [];
  if (keys.some((key) => key.startsWith('conditioner.embedders.1.'))) evidence.push('Second SDXL text-conditioning encoder keys');
  if (keys.some((key) => key.includes('text_encoder_2') || key.includes('add_embedding') || key.includes('label_emb'))) evidence.push('SDXL secondary conditioning/additional embedding keys');
  if (keys.some((key) => key.startsWith('model.diffusion_model.') || key.startsWith('unet.'))) evidence.push('Diffusion UNet weights');
  if (size < minimumPlausibleBytes) return { status: 'unsupported', summary: 'File is structurally valid but too small to be a plausible SDXL checkpoint.', evidence };
  if (evidence.length >= 2) return { status: 'likely-sdxl', summary: 'Likely SDXL checkpoint. Compatibility is confirmed when loaded.', evidence };
  return { status: 'unknown', summary: 'Safetensors file is valid, but SDXL compatibility could not be established from its keys.', evidence };
}
