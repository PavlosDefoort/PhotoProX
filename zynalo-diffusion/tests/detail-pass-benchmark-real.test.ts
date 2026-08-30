import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDetailPassPreset } from '@zynalo/diffusion-contracts';
import { PythonDiffusionEngine } from '@zynalo/diffusion-engine';
import { WAI_ILLUSTRIOUS_PROFILE } from '@zynalo/prompt-language';
import { ModelLibrary } from '../apps/diffusion/src/main/model-library';

const pythonExecutable = process.env.ZYNALO_REAL_PYTHON;
const checkpoint = process.env.ZYNALO_REAL_CHECKPOINT;
const anime6bModel = process.env.ZYNALO_DIFFUSION_ANIME6B_MODEL;
const enabled = Boolean(pythonExecutable && checkpoint && anime6bModel && process.env.ZYNALO_RUN_DETAIL_BENCHMARK === '1');

describe.runIf(enabled)('real WAI Detail Pass benchmark', () => {
  it('compares base, Standard, and Strong with one resident checkpoint', async () => {
    const userData = path.resolve('.test-output', 'detail-pass-benchmark-user-data');
    const library = new ModelLibrary(userData); await library.initialize();
    const choice = library.addSelection(checkpoint!); const inspection = await library.inspect(choice.token);
    const existing = library.list().find((item) => item.sha256 === inspection.sha256);
    const registered = existing ?? await library.import(choice.token, 'WAI Detail Pass Benchmark', 'external');
    const record = library.getRecord(registered.id);
    const host = new PythonDiffusionEngine({
      pythonExecutable: pythonExecutable!, moduleRoot: path.resolve('spikes/diffusers-sdxl/src'),
      outputRoot: path.join(userData, 'generated-assets'), configSource: 'OnomaAIResearch/Illustrious-xl-early-release-v0',
      offline: true, startupTimeoutMs: 300_000, commandTimeoutMs: 30_000,
      anime6bModel: anime6bModel!,
    });
    const defaults = WAI_ILLUSTRIOUS_PROFILE.generationDefaults!;
    const base = { prompt: '1girl, detailed eyes, intricate clothing, outdoors, masterpiece', negativePrompt: 'blurry, low quality, text, watermark', modelId: record.id, ...defaults, clipLayerSelection: WAI_ILLUSTRIOUS_PROFILE.clipLayerSelection!, seed: 123456 };
    try {
      await host.start();
      const environment = await host.runtimeDiagnostics();
      await host.loadModel({ id: record.id, name: record.displayName, checkpoint: record.source.path, sha256: record.sha256 });
      const baseOnly = await (await host.generate(base)).result;
      const standardRequest = { ...base, detailPass: resolveDetailPassPreset('standard', base.width, base.height, WAI_ILLUSTRIOUS_PROFILE.detailPassPresets?.standard) };
      const strongRequest = { ...base, detailPass: resolveDetailPassPreset('strong', base.width, base.height, WAI_ILLUSTRIOUS_PROFILE.detailPassPresets?.strong) };
      const standard = await (await host.generate(standardRequest)).result;
      const strong = await (await host.generate(strongRequest)).result;
      const repeat = await (await host.generate(standardRequest)).result;
      expect(standard).toMatchObject({ status: 'completed', finalAsset: { width: 1536, height: 2016 } });
      expect(strong).toMatchObject({ status: 'completed', finalAsset: { width: 1536, height: 2016 } });
      expect(repeat).toMatchObject({ status: 'completed', finalAsset: { width: 1536, height: 2016 } });
      expect(repeat.basePixelSha256).toBe(standard.basePixelSha256);
      expect(repeat.finalPixelSha256).toBe(standard.finalPixelSha256);
      expect(await host.status()).toMatchObject({ modelLoadCount: 1, generationCount: 4 });
      const report = {
        schema: 'zynalo.diffusion.detail-pass-benchmark/v1',
        note: 'Quality, composition, face/hand mutation, and fine-detail changes require side-by-side human review.',
        environment, baseOnly, standard, strong, deterministicRepeat: repeat,
      };
      await mkdir(path.resolve('.test-output'), { recursive: true });
      await writeFile(path.resolve('.test-output', 'wai-detail-pass-benchmark.json'), `${JSON.stringify(report, null, 2)}\n`);
    } finally { await host.stop(); }
  }, 1_800_000);
});
