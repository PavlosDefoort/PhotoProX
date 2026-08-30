import { describe, expect, it } from 'vitest';
import { resolveDetailPassPreset } from '@zynalo/diffusion-contracts';
import type { GenerateRequest, GenerationProgress } from '@zynalo/diffusion-contracts';
import { GenerationCancelledError, MockDiffusionEngine } from '@zynalo/diffusion-engine';

const request: GenerateRequest = {
  prompt: 'a lantern-lit mountain village',
  negativePrompt: 'text, watermark',
  modelId: 'mock-starter-v1',
  seed: 42,
  width: 512,
  height: 768,
  steps: 4,
  guidance: 6,
};

describe('MockDiffusionEngine', () => {
  it('returns deterministic output metadata for a fixed seed', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 0 });
    const first = await (await engine.generate(request)).result;
    const second = await (await engine.generate(request)).result;
    expect(first.seed).toBe(42);
    expect(second.output).toEqual(first.output);
    expect(second.durationMs).toBe(first.durationMs);
    expect(second.jobId).not.toBe(first.jobId);
  });

  it('emits ordered staged progress', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 0 });
    const job = await engine.generate(request);
    const updates: GenerationProgress[] = [];
    job.onProgress((progress) => updates.push(progress));
    await job.result;

    expect(updates[0]?.stage).toBe('queued');
    expect(updates.at(-1)).toMatchObject({ stage: 'completed', progress: 1 });
    for (let index = 1; index < updates.length; index += 1) {
      expect(updates[index]?.progress).toBeGreaterThanOrEqual(updates[index - 1]?.progress ?? 0);
    }
    expect(updates.filter((update) => update.stage === 'base-generating').map((update) => update.currentStep)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('simulates deterministic two-pass progress and final output', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 0 });
    const detailRequest = { ...request, detailPass: resolveDetailPassPreset('standard', request.width, request.height) };
    const job = await engine.generate(detailRequest); const updates: GenerationProgress[] = [];
    job.onProgress((value) => updates.push(value)); const result = await job.result;
    expect(result).toMatchObject({ status: 'completed', baseAsset: { width: 512, height: 768 }, finalAsset: { width: 768, height: 1152 } });
    expect(updates.map((value) => value.stage)).toContain('upscaling');
    expect(updates.map((value) => value.stage)).toContain('detail-generating');
    for (let index = 1; index < updates.length; index += 1) expect(updates[index]!.overallProgress).toBeGreaterThanOrEqual(updates[index - 1]!.overallProgress);
  });

  it('changes only the final output when the custom detail seed changes', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 0 });
    const preset = resolveDetailPassPreset('standard', request.width, request.height);
    if (!preset.enabled) throw new Error('Expected enabled preset.');
    const first = await (await engine.generate({ ...request, detailPass: { ...preset, seedMode: 'custom', seed: 7 } })).result;
    const second = await (await engine.generate({ ...request, detailPass: { ...preset, seedMode: 'custom', seed: 8 } })).result;
    expect(second.basePixelSha256).toBe(first.basePixelSha256);
    expect(second.finalPixelSha256).not.toBe(first.finalPixelSha256);
  });

  it('returns the base image when the detail pass fails', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 0, failDetailPass: true });
    const result = await (await engine.generate({ ...request, detailPass: resolveDetailPassPreset('strong', request.width, request.height) })).result;
    expect(result).toMatchObject({ status: 'base-only', output: result.baseAsset, failure: { code: 'GPU_OUT_OF_MEMORY' } });
    expect(result.finalAsset).toBeUndefined();
  });

  it('preserves the base image when cancellation occurs during detail denoising', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 1 });
    const job = await engine.generate({ ...request, steps: 1, detailPass: resolveDetailPassPreset('strong', request.width, request.height) });
    job.onProgress((value) => { if (value.stage === 'detail-generating') void engine.cancel(job.jobId); });
    await expect(job.result).resolves.toMatchObject({ status: 'cancelled', failure: { code: 'CANCELLED' } });
  });

  it('preserves the base image and exact stage when cancelled between passes', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 1 });
    const job = await engine.generate({ ...request, steps: 1, detailPass: resolveDetailPassPreset('standard', request.width, request.height) });
    job.onProgress((value) => { if (value.stage === 'upscaling') void engine.cancel(job.jobId); });
    const result = await job.result;
    expect(result).toMatchObject({ status: 'cancelled', failure: { stage: 'upscaling', code: 'CANCELLED' } });
    expect(result.finalAsset).toBeUndefined();
  });

  it('cancels an active generation', async () => {
    const engine = new MockDiffusionEngine({ tickMs: 5 });
    const job = await engine.generate({ ...request, steps: 30 });
    await engine.cancel(job.jobId);
    await expect(job.result).rejects.toBeInstanceOf(GenerationCancelledError);
  });
});
