import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GenerationCancelledError, PythonDiffusionEngine, PythonEngineCrashedError } from '@zynalo/diffusion-engine';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-engine-host.mjs');

function engine(mode = 'normal') {
  return new PythonDiffusionEngine({
    pythonExecutable: 'unused', moduleRoot: 'unused', checkpoint: 'unused', outputRoot: 'unused',
    modelId: 'fake-sdxl', modelName: 'Fake SDXL', startupTimeoutMs: 2_000, commandTimeoutMs: 2_000,
    launchOverride: { executable: process.execPath, args: [fixture], env: { FAKE_HOST_MODE: mode } },
  });
}

const request = { prompt: 'test', modelId: 'fake-sdxl', width: 512, height: 512, steps: 3, guidance: 7, seed: 42 };

describe('persistent Python diffusion engine adapter', () => {
  it('handshakes, reports progress, and performs warm generations without reload', async () => {
    const host = engine();
    const lifecycle: string[] = [];
    host.onLifecycle((event) => lifecycle.push(event.state));
    await host.start();
    expect(await host.listModels()).toMatchObject([{ id: 'fake-sdxl' }]);
    const first = await host.generate(request);
    const progress: number[] = [];
    first.onProgress((event) => progress.push(event.progress));
    await expect(first.result).resolves.toMatchObject({ seed: 42, output: { uri: 'zynalo-asset://generated/fakeasset1' } });
    const second = await host.generate(request);
    await second.result;
    expect(await host.status()).toMatchObject({ modelLoadCount: 1, generationCount: 2 });
    expect(progress.length).toBe(3);
    expect(lifecycle).toContain('ready');
    await host.stop();
    expect(host.state).toBe('stopped');
  });

  it('cancels an active generation', async () => {
    const host = engine();
    await host.start();
    const job = await host.generate({ ...request, steps: 20 });
    await new Promise<void>((resolve) => job.onProgress(() => resolve()));
    await host.cancel(job.jobId);
    await expect(job.result).rejects.toBeInstanceOf(GenerationCancelledError);
    await host.stop();
  });

  it('reports dependencies and switches the single loaded model', async () => {
    const host = engine(); await host.start();
    await expect(host.runtimeDiagnostics()).resolves.toMatchObject({ pythonVersion: '3.10.6', cudaAvailable: true, gpuName: 'Fake GPU' });
    await expect(host.loadModel({ id: 'second-sdxl', name: 'Second', checkpoint: 'C:\\Models\\second.safetensors', sha256: 'a'.repeat(64) })).resolves.toMatchObject({ modelId: 'second-sdxl', loadCount: 2 });
    await expect(host.status()).resolves.toMatchObject({ loadedModelId: 'second-sdxl', modelLoadCount: 2 });
    await expect(host.generate({ ...request, modelId: 'fake-sdxl' })).rejects.toThrow('requires the selected model');
    await host.unloadModel(); await expect(host.status()).resolves.not.toHaveProperty('loadedModelId'); await host.stop();
  });

  it('starts without a model and transitions through an explicit first load', async () => {
    const host = engine('empty'); await host.start();
    expect(await host.status()).toMatchObject({ modelLoadCount: 0, generationCount: 0 });
    expect(await host.listModels()).toEqual([]);
    await host.loadModel({ id: 'registered-sdxl', name: 'Registered', checkpoint: 'C:\\Models\\registered.safetensors', sha256: 'b'.repeat(64) });
    expect(await host.status()).toMatchObject({ loadedModelId: 'registered-sdxl', modelLoadCount: 1 });
    await host.stop();
  });

  it('rejects malformed host output and detects crashes', async () => {
    const malformed = engine('malformed');
    const events: string[] = [];
    malformed.onLifecycle((event) => events.push(event.state));
    await malformed.start();
    await expect(malformed.status()).rejects.toBeInstanceOf(PythonEngineCrashedError);
    expect(events).toContain('protocol-error');

    const crashed = engine('crash');
    await crashed.start();
    const job = await crashed.generate(request);
    await expect(job.result).rejects.toBeInstanceOf(PythonEngineCrashedError);
  });
});
