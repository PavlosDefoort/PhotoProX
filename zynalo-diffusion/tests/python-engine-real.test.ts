import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PythonDiffusionEngine } from '@zynalo/diffusion-engine';
import { resolveDetailPassPreset } from '@zynalo/diffusion-contracts';
import { buildDiagnostics } from '../apps/diffusion/src/main/diagnostics';
import { ModelLibrary } from '../apps/diffusion/src/main/model-library';

const pythonExecutable = process.env.ZYNALO_REAL_PYTHON;
const checkpoint = process.env.ZYNALO_REAL_CHECKPOINT;
const anime6bModel = process.env.ZYNALO_DIFFUSION_ANIME6B_MODEL;
const real = describe.runIf(Boolean(pythonExecutable && checkpoint));
const PRE_PROFILE_CLIP_LAYER_BASELINE = Object.freeze({
  basePixelSha256: '9746c84f2081205e3dde2b0a90e655775f0a82f34736d2733aa5535480901829',
  finalPixelSha256: '5169ca9c9dd5effec707f2910c0de9bf8da65fa839adcd372f845b7e21130ff2',
});

interface EmbeddedMetadata {
  schema: string;
  completion: { status: string; base_pixel_sha256?: string; final_pixel_sha256?: string; failure?: { code?: string } };
  timing: { stages: Array<{ stage?: string; processRamBytes?: number }> };
  parameters: {
    detail_pass?: { enabled?: boolean; upscaler?: string };
    clip_layer_selection?: {
      base?: { semantic?: string; hidden_state_index?: number; diffusers_clip_skip?: number | null; webui_clip_skip_equivalent?: number };
      detail?: { semantic?: string; hidden_state_index?: number; diffusers_clip_skip?: number | null; webui_clip_skip_equivalent?: number } | null;
      passes_match?: boolean;
    };
    sampler_selection?: {
      semantic?: string; base_scheduler?: string; detail_scheduler?: string | null; passes_match?: boolean;
    };
    detail_upscaler?: { semantic?: string; model_sha256?: string; architecture?: string; weights_only_load?: boolean } | null;
  };
}

async function embeddedZynaloMetadata(filename: string): Promise<EmbeddedMetadata> {
  const png = await readFile(filename);
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type !== 'iTXt') continue;
    const keywordEnd = data.indexOf(0);
    if (keywordEnd < 0 || data.toString('latin1', 0, keywordEnd) !== 'zynalo_diffusion') continue;
    let cursor = keywordEnd + 3;
    for (let field = 0; field < 2; field += 1) {
      cursor = data.indexOf(0, cursor) + 1;
      if (cursor === 0) throw new Error('Malformed PNG iTXt metadata.');
    }
    return JSON.parse(data.toString('utf8', cursor)) as EmbeddedMetadata;
  }
  throw new Error('Zynalo PNG metadata was not found.');
}

real('real registered-model SDXL workflow', () => {
  it('persists registration, loads once, generates twice warm, revalidates, removes safely, and re-registers', async () => {
    const userData = path.resolve('.test-output', anime6bModel ? 'real-library-user-data-anime6b' : 'real-library-user-data');
    await rm(userData, { recursive: true, force: true });
    const library = new ModelLibrary(userData); await library.initialize();
    const selection = library.addSelection(checkpoint!); const inspection = await library.inspect(selection.token);
    expect(inspection).toMatchObject({ validationStatus: 'valid', compatibility: { status: 'likely-sdxl' } });
    const registered = await library.import(selection.token, 'WAI Illustrious SDXL v15', 'external');

    const restarted = new ModelLibrary(userData); await restarted.initialize();
    expect(restarted.list()).toMatchObject([{ id: registered.id, selected: true, validationStatus: 'valid' }]);
    const record = restarted.getRecord(registered.id);
    const host = new PythonDiffusionEngine({
      pythonExecutable: pythonExecutable!, moduleRoot: path.resolve('spikes/diffusers-sdxl/src'),
      outputRoot: path.join(userData, 'generated-assets'), configSource: 'OnomaAIResearch/Illustrious-xl-early-release-v0',
      offline: true, startupTimeoutMs: 300_000, commandTimeoutMs: 30_000,
      ...(anime6bModel ? { anime6bModel } : {}),
    });
    try {
      await host.start();
      expect(await host.status()).toMatchObject({ state: 'ready', modelLoadCount: 0 });
      expect((await host.inspectHardware()).capabilities?.detailPassUpscalers).toEqual(anime6bModel ? ['lanczos', 'realesrgan-anime6b'] : ['lanczos']);
      await host.loadModel({ id: record.id, name: record.displayName, checkpoint: record.source.path, sha256: record.sha256 });
      restarted.setLoaded(record.id);
      const request = { prompt: 'a small red fox in a snowy forest, detailed illustration', negativePrompt: 'blurry, low quality', modelId: record.id, width: 512, height: 512, steps: 4, guidance: 5, seed: 123456 };
      const first = await host.generate(request); const progress: number[] = []; first.onProgress((event) => progress.push(event.progress));
      const firstResult = await first.result; expect(firstResult).toMatchObject({ seed: 123456, output: { mimeType: 'image/png', width: 512, height: 512 } });
      expect(firstResult.parameters.clipLayerSelection).toBe('penultimate-hidden-state');
      expect(firstResult.parameters.sampler).toBe('checkpoint-default');
      expect(firstResult.basePixelSha256).toBe(PRE_PROFILE_CLIP_LAYER_BASELINE.basePixelSha256);
      const firstMetadata = await embeddedZynaloMetadata(path.join(userData, 'generated-assets', `${firstResult.baseAsset.id}.png`));
      expect(firstMetadata).toMatchObject({ schema: 'zynalo.diffusion.generated-image/v2', completion: { status: 'completed' } });
      expect(firstMetadata.parameters.clip_layer_selection).toMatchObject({
        base: { semantic: 'penultimate-hidden-state', hidden_state_index: -2, diffusers_clip_skip: null, webui_clip_skip_equivalent: 2 },
        detail: null, passes_match: true,
      });
      expect(firstMetadata.timing.stages.at(-1)).toMatchObject({ stage: 'save', processRamBytes: expect.any(Number) });
      const second = await host.generate(request); const secondResult = await second.result;
      expect(secondResult.basePixelSha256).toBe(firstResult.basePixelSha256);
      const standard = resolveDetailPassPreset('standard', 512, 512);
      const detailedRequest = { ...request, detailPass: standard };
      const detailed = await (await host.generate(detailedRequest)).result;
      const detailedRepeat = await (await host.generate(detailedRequest)).result;
      expect(detailed).toMatchObject({ status: 'completed', finalAsset: { width: 768, height: 768 } });
      if (!detailed.finalAsset) throw new Error('Expected final asset.');
      const detailedMetadata = await embeddedZynaloMetadata(path.join(userData, 'generated-assets', `${detailed.finalAsset.id}.png`));
      expect(detailedMetadata).toMatchObject({
        completion: { status: 'completed', base_pixel_sha256: detailed.basePixelSha256, final_pixel_sha256: detailed.finalPixelSha256 },
        parameters: {
          detail_pass: { enabled: true, upscaler: 'lanczos' },
          clip_layer_selection: {
            base: { semantic: 'penultimate-hidden-state', hidden_state_index: -2, diffusers_clip_skip: null, webui_clip_skip_equivalent: 2 },
            detail: { semantic: 'penultimate-hidden-state', hidden_state_index: -2, diffusers_clip_skip: null, webui_clip_skip_equivalent: 2 },
            passes_match: true,
          },
          sampler_selection: {
            semantic: 'checkpoint-default', base_scheduler: 'EulerDiscreteScheduler',
            detail_scheduler: 'EulerDiscreteScheduler', passes_match: true,
          },
        },
      });
      expect(detailed.basePixelSha256).toBe(PRE_PROFILE_CLIP_LAYER_BASELINE.basePixelSha256);
      expect(detailed.finalPixelSha256).toBe(PRE_PROFILE_CLIP_LAYER_BASELINE.finalPixelSha256);
      expect(detailedMetadata.timing.stages.at(-1)).toMatchObject({ stage: 'save', processRamBytes: expect.any(Number) });
      expect(detailedRepeat.basePixelSha256).toBe(detailed.basePixelSha256);
      expect(detailedRepeat.finalPixelSha256).toBe(detailed.finalPixelSha256);
      if (!standard.enabled) throw new Error('Expected enabled Standard preset.');
      const variation = await (await host.generate({ ...request, detailPass: { ...standard, seedMode: 'custom' as const, seed: standard.seed === undefined ? 987654 : standard.seed + 1 } })).result;
      expect(variation.basePixelSha256).toBe(detailed.basePixelSha256);
      expect(variation.finalPixelSha256).not.toBe(detailed.finalPixelSha256);
      const waiDetail = { ...standard, strength: 0.35, steps: 20 };
      const waiEulerRequest = { ...request, sampler: 'euler-ancestral' as const, detailPass: waiDetail };
      const waiEuler = await (await host.generate(waiEulerRequest)).result;
      const waiEulerRepeat = await (await host.generate(waiEulerRequest)).result;
      expect(waiEulerRepeat.basePixelSha256).toBe(waiEuler.basePixelSha256);
      expect(waiEulerRepeat.finalPixelSha256).toBe(waiEuler.finalPixelSha256);
      if (!waiEuler.finalAsset) throw new Error('Expected WAI Euler ancestral final asset.');
      const waiEulerMetadata = await embeddedZynaloMetadata(path.join(userData, 'generated-assets', `${waiEuler.finalAsset.id}.png`));
      expect(waiEulerMetadata.parameters.sampler_selection).toEqual({
        semantic: 'euler-ancestral', base_scheduler: 'EulerAncestralDiscreteScheduler',
        detail_scheduler: 'EulerAncestralDiscreteScheduler', passes_match: true,
      });
      const cancelledJob = await host.generate({ ...request, detailPass: { ...standard, steps: 30 } });
      await new Promise<void>((resolve) => cancelledJob.onProgress((event) => {
        if (event.stage === 'detail-generating') { void host.cancel(cancelledJob.jobId); resolve(); }
      }));
      const cancelled = await cancelledJob.result;
      expect(cancelled).toMatchObject({ status: 'cancelled', baseAsset: { width: 512, height: 512 }, failure: { code: 'CANCELLED' } });
      const cancelledMetadata = await embeddedZynaloMetadata(path.join(userData, 'generated-assets', `${cancelled.baseAsset.id}.png`));
      expect(cancelledMetadata).toMatchObject({ completion: { status: 'cancelled', failure: { code: 'CANCELLED' } } });
      const warmAfterCancellation = await (await host.generate(request)).result;
      expect(warmAfterCancellation.basePixelSha256).toBe(firstResult.basePixelSha256);
      let anime6b: typeof warmAfterCancellation | undefined;
      if (anime6bModel) {
        const animePreset = resolveDetailPassPreset('standard', 64, 64, { scale: 1.5, strength: 0.35, steps: 4, upscaler: 'realesrgan-anime6b' });
        anime6b = await (await host.generate({ ...request, width: 64, height: 64, steps: 1, detailPass: animePreset })).result;
        expect(anime6b).toMatchObject({ status: 'completed', finalAsset: { width: 96, height: 96 } });
        if (!anime6b.finalAsset) throw new Error('Expected Anime6B final asset.');
        const metadata = await embeddedZynaloMetadata(path.join(userData, 'generated-assets', `${anime6b.finalAsset.id}.png`));
        expect(metadata.parameters.detail_upscaler).toMatchObject({
          semantic: 'realesrgan-x4plus-anime6b', architecture: 'RRDBNet-6B', weights_only_load: true,
          model_sha256: 'f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da',
        });
      }
      expect(await host.status()).toMatchObject({ loadedModelId: record.id, modelLoadCount: 1, generationCount: anime6bModel ? 10 : 9 });
      expect(progress.some((value) => value > 0 && value < 1)).toBe(true);
      await mkdir(path.resolve('.test-output'), { recursive: true });
      await writeFile(path.resolve('.test-output', 'detail-pass-benchmark.json'), JSON.stringify({
        schema: 'zynalo.diffusion.detail-pass-benchmark/v1',
        clipLayerComparison: {
          semantic: 'penultimate-hidden-state', hiddenStateIndex: -2, diffusersClipSkip: null, webUiClipSkipEquivalent: 2,
          beforeProfileChange: PRE_PROFILE_CLIP_LAYER_BASELINE,
          afterProfileChange: { basePixelSha256: detailed.basePixelSha256, finalPixelSha256: detailed.finalPixelSha256 },
          baseUnchanged: detailed.basePixelSha256 === PRE_PROFILE_CLIP_LAYER_BASELINE.basePixelSha256,
          finalUnchanged: detailed.finalPixelSha256 === PRE_PROFILE_CLIP_LAYER_BASELINE.finalPixelSha256,
        },
        baseOnly: firstResult, standard: detailed, deterministicRepeat: detailedRepeat, changedDetailSeed: variation,
        waiEulerAncestral: waiEuler, waiEulerAncestralRepeat: waiEulerRepeat,
        cancellation: cancelled, warmAfterCancellation, anime6b,
      }, null, 2));
      expect((await restarted.revalidate(record.id)).validationStatus).toBe('valid');
      const diagnostics = await buildDiagnostics({ version: '0.1.0', packaged: false, userData, outputRoot: path.join(userData, 'generated-assets'), pythonExecutable, python: host, library: restarted, engineState: () => host.state });
      expect(diagnostics).toMatchObject({ python: { version: { severity: 'healthy' } }, gpu: { cudaAvailable: { value: true } }, model: { loaded: { severity: 'healthy' } } });
      await host.unloadModel(); restarted.setLoaded(undefined); await restarted.remove(record.id, false); await expect(access(checkpoint!)).resolves.toBeUndefined();
      const again = restarted.addSelection(checkpoint!); await restarted.inspect(again.token); const reregistered = await restarted.import(again.token, 'WAI Illustrious SDXL v15', 'external');
      expect(reregistered.validationStatus).toBe('valid');
    } finally { await host.stop(); }
  }, 900_000);
});
