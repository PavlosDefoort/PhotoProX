import { describe, expect, it } from 'vitest';
import { deriveDetailSeed, ENGINE_HOST_PROTOCOL, resolveDetailPassPreset, resolveGenerateRequest, validateEngineHostMessage, validateGenerateRequest, validateImportModelRequest, validateImportTokenPayload, validateJobPayload, validateModelIdPayload, validateRemoveModelRequest } from '@zynalo/diffusion-contracts';

const validRequest = {
  prompt: 'a glass observatory above the clouds',
  modelId: 'mock-starter-v1',
  width: 512,
  height: 512,
  steps: 12,
  guidance: 7.5,
};

describe('generation request validation', () => {
  it('preserves an exact valid prompt for lossless generation', () => {
    const result = validateGenerateRequest({ ...validRequest, prompt: '  a quiet lake  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.prompt).toBe('  a quiet lake  ');
  });

  it.each([
    ['prompt', { prompt: '   ' }],
    ['width', { width: 510 }],
    ['height', { height: 4_096 }],
    ['steps', { steps: 0 }],
    ['guidance', { guidance: 31 }],
  ])('rejects invalid %s input', (field, override) => {
    const result = validateGenerateRequest({ ...validRequest, ...override });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((issue) => issue.path === field)).toBe(true);
  });

  it('rejects unknown IPC fields and malformed job identifiers', () => {
    expect(validateGenerateRequest({ ...validRequest, command: 'open-shell' }).success).toBe(false);
    expect(validateJobPayload({ jobId: '../escape' }).success).toBe(false);
    expect(validateJobPayload({ jobId: 'mock-safe_123' }).success).toBe(true);
  });

  it('resolves guided presets and stable stage seeds before submission', () => {
    const standard = resolveDetailPassPreset('standard', 832, 1216);
    expect(standard).toMatchObject({ enabled: true, targetWidth: 1248, targetHeight: 1824, strength: 0.3, steps: 12 });
    const resolved = resolveGenerateRequest({ ...validRequest, width: 832, height: 1216, seed: 42, detailPass: standard });
    expect(resolved.detailPass).toMatchObject({ enabled: true, seed: deriveDetailSeed(42) });
    expect(deriveDetailSeed(42)).toBe(2_654_435_811);
  });

  it('keeps disabled requests compatible and resolves a concrete base seed', () => {
    const resolved = resolveGenerateRequest({ ...validRequest, detailPass: { enabled: false } }, () => 99);
    expect(resolved).toMatchObject({ seed: 99, sampler: 'checkpoint-default', clipLayerSelection: 'penultimate-hidden-state', detailPass: { enabled: false } });
  });

  it('records semantic SDXL CLIP selection and rejects numeric or deeper-layer substitutes', () => {
    expect(resolveGenerateRequest({ ...validRequest, clipLayerSelection: 'penultimate-hidden-state' }, () => 1).clipLayerSelection).toBe('penultimate-hidden-state');
    expect(validateGenerateRequest({ ...validRequest, clipLayerSelection: 'fourth-from-last-hidden-state' }).success).toBe(false);
    expect(validateGenerateRequest({ ...validRequest, clipSkip: 2 }).success).toBe(false);
  });

  it('resolves and allow-lists semantic sampler selections', () => {
    expect(resolveGenerateRequest({ ...validRequest, sampler: 'euler-ancestral' }, () => 1).sampler).toBe('euler-ancestral');
    expect(validateGenerateRequest({ ...validRequest, sampler: 'Euler a' }).success).toBe(false);
  });

  it('accepts the explicitly supported Anime6B Detail Pass upscaler', () => {
    const standard = resolveDetailPassPreset('standard', 512, 512, { upscaler: 'realesrgan-anime6b' });
    expect(validateGenerateRequest({ ...validRequest, detailPass: standard }).success).toBe(true);
  });

  it('resolves the Strong preset from data-driven values', () => {
    expect(resolveDetailPassPreset('strong', 832, 1216)).toMatchObject({
      enabled: true, targetWidth: 1248, targetHeight: 1824, strength: 0.45, steps: 16, upscaler: 'lanczos',
    });
  });

  it('preserves an exact unlocked Advanced request with custom prompts and seed', () => {
    const detailPass = {
      enabled: true as const, upscaler: 'lanczos' as const, scale: 1.6, targetWidth: 800, targetHeight: 888,
      lockAspectRatio: false, strength: 0.35, steps: 13, promptMode: 'custom' as const,
      prompt: '  custom detail  ', negativePromptMode: 'custom' as const, negativePrompt: ' custom negative ',
      seedMode: 'custom' as const, seed: 777,
    };
    const validation = validateGenerateRequest({ ...validRequest, detailPass });
    expect(validation.success).toBe(true);
    if (validation.success) expect(resolveGenerateRequest({ ...validation.data, seed: 42 }).detailPass).toEqual(detailPass);
  });

  it.each([
    ['unsupported upscaler', { upscaler: 'latent' }],
    ['invalid strength', { strength: 1 }],
    ['invalid detail steps', { steps: 0 }],
    ['excessive target', { targetWidth: 3072, targetHeight: 3072, lockAspectRatio: false }],
    ['out-of-sync scale', { targetWidth: 1024 }],
  ])('rejects %s', (_name, override) => {
    const standard = resolveDetailPassPreset('standard', 512, 512);
    expect(validateGenerateRequest({ ...validRequest, detailPass: { ...standard, ...override } }).success).toBe(false);
  });
});

describe('engine host message validation', () => {
  it('accepts an exact progress message and rejects malformed host output', () => {
    expect(validateEngineHostMessage({
      protocol: ENGINE_HOST_PROTOCOL, type: 'progress', jobId: 'py-safe', stage: 'base-generating',
      progress: 0.5, stageProgress: 0.5, overallProgress: 0.5, currentStep: 2, totalSteps: 4, pass: 'base',
    }).success).toBe(true);
    expect(validateEngineHostMessage({
      protocol: ENGINE_HOST_PROTOCOL, type: 'progress', jobId: '../escape', stage: 'base-generating', progress: 2, stageProgress: 2, overallProgress: 2,
    }).success).toBe(false);
    expect(validateEngineHostMessage({
      protocol: ENGINE_HOST_PROTOCOL, type: 'response', id: 'cmd-1', ok: false,
      result: {}, error: { code: 'BAD', message: 'bad', retryable: false },
    }).success).toBe(false);
  });
});

describe('model-library IPC payload validation', () => {
  it('allow-lists import, token, model, and destructive-removal payloads', () => {
    expect(validateImportModelRequest({ token: 'imp_safe', displayName: 'Local model', mode: 'external' }).success).toBe(true);
    expect(validateImportModelRequest({ token: 'imp_safe', displayName: 'Local model', mode: 'external', path: 'C:\\secret' }).success).toBe(false);
    expect(validateImportTokenPayload({ token: '../escape' }).success).toBe(false);
    expect(validateModelIdPayload({ modelId: 'mdl_safe' }).success).toBe(true);
    expect(validateRemoveModelRequest({ modelId: 'mdl_safe', deleteManagedFile: true }).success).toBe(true);
    expect(validateRemoveModelRequest({ modelId: 'mdl_safe', deleteManagedFile: 'yes' }).success).toBe(false);
  });
});
