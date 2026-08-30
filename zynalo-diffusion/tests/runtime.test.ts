import { describe, expect, it, vi } from 'vitest';
import type { DiffusionBridge, GenerationProgress } from '@zynalo/diffusion-contracts';
import { ElectronDiffusionRuntime } from '../apps/diffusion/src/renderer/runtime/DiffusionRuntime';

function fakeBridge(): { bridge: DiffusionBridge; emit(progress: GenerationProgress): void; unsubscribe: ReturnType<typeof vi.fn>; unsubscribeLifecycle: ReturnType<typeof vi.fn> } {
  let progressListener: ((progress: GenerationProgress) => void) | undefined;
  const unsubscribe = vi.fn();
  const unsubscribeLifecycle = vi.fn();
  const bridge: DiffusionBridge = {
    inspectHardware: vi.fn().mockResolvedValue({ backend: 'mock', deviceName: 'test' }),
    listModels: vi.fn().mockResolvedValue([]),
    generate: vi.fn().mockImplementation(async () => {
      progressListener?.({ jobId: 'mock-runtime', stage: 'queued', progress: 0, stageProgress: 0, overallProgress: 0 });
      return { jobId: 'mock-runtime' };
    }),
    result: vi.fn().mockResolvedValue({
      jobId: 'mock-runtime',
      seed: 1,
      durationMs: 10,
      status: 'completed', output: { id: 'asset', uri: 'zynalo-asset://mock/12345678', mimeType: 'image/svg+xml', width: 64, height: 64 },
      baseAsset: { id: 'asset', uri: 'zynalo-asset://mock/12345678', mimeType: 'image/svg+xml', width: 64, height: 64 },
      stages: [], seeds: { baseSeed: 1, derivation: 'explicit' }, parameters: { prompt: 'test', modelId: 'mock', seed: 1, width: 64, height: 64, steps: 1, guidance: 1, detailPass: { enabled: false } }, basePixelSha256: 'a'.repeat(64),
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
    onProgress: vi.fn().mockImplementation((listener) => {
      progressListener = listener;
      return unsubscribe;
    }),
    onLifecycle: vi.fn().mockReturnValue(unsubscribeLifecycle),
    chooseModelFile: vi.fn().mockResolvedValue({ cancelled: true }),
    inspectModelImport: vi.fn(),
    importModel: vi.fn(),
    cancelModelImport: vi.fn().mockResolvedValue(undefined),
    listModelLibrary: vi.fn().mockResolvedValue([]),
    revalidateModel: vi.fn(),
    removeModel: vi.fn().mockResolvedValue(undefined),
    selectModel: vi.fn().mockResolvedValue({ state: 'idle' }),
    loadModel: vi.fn().mockResolvedValue({ state: 'loaded' }),
    getLoadedModel: vi.fn().mockResolvedValue({ state: 'idle' }),
    getDiagnostics: vi.fn(),
    copyDiagnostics: vi.fn().mockResolvedValue(undefined),
    saveDiagnostics: vi.fn().mockResolvedValue({ cancelled: true }),
    copyModelSha: vi.fn().mockResolvedValue(undefined),
    onModelOperationProgress: vi.fn().mockReturnValue(vi.fn()),
    completeTags: vi.fn().mockResolvedValue({ query: '', items: [], truncated: false }),
    getTagCatalogInfo: vi.fn().mockResolvedValue({ id: 'test', generatedAt: '2026-01-01T00:00:00Z', recordCount: 0, source: 'test', offline: true }),
    getTagReference: vi.fn().mockResolvedValue({ tag: 'test', otherNames: [] }),
  };
  return { bridge, emit: (progress) => progressListener?.(progress), unsubscribe, unsubscribeLifecycle };
}

describe('renderer runtime abstraction', () => {
  it('buffers progress that arrives before the job ID response', async () => {
    const fake = fakeBridge();
    const runtime = new ElectronDiffusionRuntime(fake.bridge);
    const listener = vi.fn();
    const active = await runtime.generate({
      prompt: 'test', modelId: 'mock-starter-v1', width: 512, height: 512, steps: 1, guidance: 1,
    }, listener);
    expect(active.jobId).toBe('mock-runtime');
    expect(listener).toHaveBeenCalledWith({ jobId: 'mock-runtime', stage: 'queued', progress: 0, stageProgress: 0, overallProgress: 0 });
    await expect(active.result).resolves.toMatchObject({ seed: 1 });
  });

  it('delegates cancellation and releases its bridge subscription', async () => {
    const fake = fakeBridge();
    const runtime = new ElectronDiffusionRuntime(fake.bridge);
    await runtime.cancel('mock-runtime');
    expect(fake.bridge.cancel).toHaveBeenCalledWith('mock-runtime');
    runtime.dispose();
    expect(fake.unsubscribe).toHaveBeenCalledOnce();
    expect(fake.unsubscribeLifecycle).toHaveBeenCalledOnce();
  });
});
