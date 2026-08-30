import type { EngineLifecycleNotification } from './host-protocol';

export const UINT32_MAX = 4_294_967_295;
export const DIMENSION_ALIGNMENT = 8;
export const MAX_BASE_DIMENSION = 2_048;
export const MAX_FINAL_DIMENSION = 3_072;
export const MAX_FINAL_PIXELS = 4_194_304;

export const GENERATION_STAGES = [
  'queued', 'loading-model', 'encoding-prompt', 'base-generating', 'base-decoding', 'upscaling',
  'detail-preparing', 'detail-generating', 'final-decoding', 'saving', 'completed',
] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];
export type DetailPassPreset = 'off' | 'standard' | 'strong';
export type DetailPassUpscaler = 'lanczos' | 'realesrgan-anime6b';
export type PromptMode = 'inherit' | 'custom';
export type DetailSeedMode = 'derived' | 'custom';
export type ClipLayerSelection = 'penultimate-hidden-state';
export const DEFAULT_SDXL_CLIP_LAYER_SELECTION: ClipLayerSelection = 'penultimate-hidden-state';
export type SamplerSelection = 'checkpoint-default' | 'euler-ancestral';
export const DEFAULT_SAMPLER_SELECTION: SamplerSelection = 'checkpoint-default';

export interface DisabledHighResolutionPass { enabled: false }
export interface EnabledHighResolutionPass {
  enabled: true;
  upscaler: DetailPassUpscaler;
  scale: number;
  targetWidth: number;
  targetHeight: number;
  lockAspectRatio: boolean;
  strength: number;
  steps: number;
  promptMode: PromptMode;
  prompt?: string;
  negativePromptMode: PromptMode;
  negativePrompt?: string;
  seedMode: DetailSeedMode;
  seed?: number;
}
export type HighResolutionPass = DisabledHighResolutionPass | EnabledHighResolutionPass;
export type ResolvedHighResolutionPass = DisabledHighResolutionPass | (EnabledHighResolutionPass & { seed: number });

export interface GenerateRequest {
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  seed?: number;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  sampler?: SamplerSelection;
  clipLayerSelection?: ClipLayerSelection;
  detailPass?: HighResolutionPass;
}
export interface ResolvedGenerateRequest extends Omit<GenerateRequest, 'seed' | 'sampler' | 'clipLayerSelection' | 'detailPass'> {
  seed: number;
  sampler: SamplerSelection;
  clipLayerSelection: ClipLayerSelection;
  detailPass: ResolvedHighResolutionPass;
}
export interface StageSeeds {
  baseSeed: number;
  detailSeed?: number;
  derivation: 'explicit' | 'zynalo-detail-seed-v1';
}
export interface GenerationProgress {
  jobId: string;
  stage: GenerationStage;
  stageProgress: number;
  overallProgress: number;
  /** Backward-compatible alias for overallProgress. */
  progress: number;
  currentStep?: number;
  totalSteps?: number;
  pass?: 'base' | 'detail';
}
export interface GeneratedAsset { id: string; uri: string; mimeType: string; width: number; height: number }
export interface GenerationStageMetrics {
  stage: 'base' | 'upscale' | 'detail' | 'decode' | 'save';
  durationMs: number;
  peakAllocatedVram?: number;
  peakReservedVram?: number;
  processRamBytes?: number;
}
export interface GenerationFailure { stage: GenerationStage; code: string; message: string; retryable: boolean }
export interface GenerationResult {
  jobId: string;
  seed: number;
  durationMs: number;
  status: 'completed' | 'base-only' | 'cancelled';
  output: GeneratedAsset;
  baseAsset: GeneratedAsset;
  finalAsset?: GeneratedAsset;
  stages: GenerationStageMetrics[];
  seeds: StageSeeds;
  parameters: ResolvedGenerateRequest;
  basePixelSha256: string;
  finalPixelSha256?: string;
  failure?: GenerationFailure;
}
export interface EngineCapabilities { detailPass: boolean; detailPassUpscalers: DetailPassUpscaler[] }
export interface ModelInfo { id: string; name: string; family: string; installed: boolean; promptProfileId?: string }
export interface HardwareProfile {
  backend: 'mock' | 'cpu' | 'cuda' | 'directml' | 'metal';
  deviceName: string;
  dedicatedMemoryMb?: number;
  capabilities?: EngineCapabilities;
}
export type ProgressListener = (progress: GenerationProgress) => void;
export interface GenerationJob { jobId: string; result: Promise<GenerationResult>; onProgress(listener: ProgressListener): () => void }
export interface DiffusionEngine {
  inspectHardware(): Promise<HardwareProfile>;
  listModels(): Promise<ModelInfo[]>;
  generate(request: GenerateRequest): Promise<GenerationJob>;
  cancel(jobId: string): Promise<void>;
}
export interface ValidationIssue { path: string; message: string }
export type ValidationResult<T> = { success: true; data: T } | { success: false; issues: ValidationIssue[] };

export interface DetailPassPresetValues {
  enabled: boolean;
  scale?: number;
  strength?: number;
  steps?: number;
  upscaler?: DetailPassUpscaler;
}
export const DETAIL_PASS_PRESETS: Readonly<Record<DetailPassPreset, DetailPassPresetValues>> = Object.freeze({
  off: Object.freeze({ enabled: false }),
  standard: Object.freeze({ enabled: true, scale: 1.5, strength: 0.3, steps: 12, upscaler: 'lanczos' }),
  strong: Object.freeze({ enabled: true, scale: 1.5, strength: 0.45, steps: 16, upscaler: 'lanczos' }),
});

type UnknownRecord = Record<string, unknown>;
const requestKeys = new Set(['prompt', 'negativePrompt', 'modelId', 'seed', 'width', 'height', 'steps', 'guidance', 'sampler', 'clipLayerSelection', 'detailPass']);
const enabledDetailKeys = new Set([
  'enabled', 'upscaler', 'scale', 'targetWidth', 'targetHeight', 'lockAspectRatio', 'strength', 'steps',
  'promptMode', 'prompt', 'negativePromptMode', 'negativePrompt', 'seedMode', 'seed',
]);
function isRecord(value: unknown): value is UnknownRecord { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function finiteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function validateDimension(value: unknown, path: string, maximum: number, issues: ValidationIssue[]): value is number {
  if (!finiteNumber(value) || !Number.isInteger(value) || value < 64 || value > maximum || value % DIMENSION_ALIGNMENT !== 0) {
    issues.push({ path, message: `Dimension must be an integer from 64 to ${maximum} and divisible by ${DIMENSION_ALIGNMENT}.` });
    return false;
  }
  return true;
}
function validateOptionalPrompt(value: unknown, path: string, issues: ValidationIssue[]): value is string | undefined {
  if (value !== undefined && typeof value !== 'string') { issues.push({ path, message: 'Prompt must be text.' }); return false }
  if (typeof value === 'string' && value.length > 4_000) { issues.push({ path, message: 'Prompt is too long.' }); return false }
  return true;
}
function validSeed(value: unknown): value is number {
  return finiteNumber(value) && Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
}
export function alignDimension(value: number): number {
  return Math.max(64, Math.round(value / DIMENSION_ALIGNMENT) * DIMENSION_ALIGNMENT);
}
export function deriveDetailSeed(baseSeed: number): number {
  if (!validSeed(baseSeed)) throw new RangeError('Base seed must be an unsigned 32-bit integer.');
  return (baseSeed + 0x9e3779b9) >>> 0;
}
export function resolveDetailPassPreset(
  preset: DetailPassPreset,
  baseWidth: number,
  baseHeight: number,
  overrides?: Partial<DetailPassPresetValues>,
): HighResolutionPass {
  const values = { ...DETAIL_PASS_PRESETS[preset], ...overrides };
  if (!values.enabled) return { enabled: false };
  const scale = values.scale ?? 1.5;
  return {
    enabled: true, upscaler: values.upscaler ?? 'lanczos', scale,
    targetWidth: alignDimension(baseWidth * scale), targetHeight: alignDimension(baseHeight * scale),
    lockAspectRatio: true, strength: values.strength ?? 0.3, steps: values.steps ?? 12,
    promptMode: 'inherit', negativePromptMode: 'inherit', seedMode: 'derived',
  };
}

function validateDetailPass(value: unknown, baseWidth: unknown, baseHeight: unknown, issues: ValidationIssue[]): HighResolutionPass | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.enabled !== 'boolean') {
    issues.push({ path: 'detailPass', message: 'Detail Pass must be an object with an enabled flag.' }); return undefined;
  }
  if (!value.enabled) {
    if (Object.keys(value).some((key) => key !== 'enabled')) issues.push({ path: 'detailPass', message: 'Disabled Detail Pass settings must not contain ignored fields.' });
    return { enabled: false };
  }
  for (const key of Object.keys(value)) if (!enabledDetailKeys.has(key)) issues.push({ path: `detailPass.${key}`, message: 'Unexpected field.' });
  if (!['lanczos', 'realesrgan-anime6b'].includes(String(value.upscaler))) issues.push({ path: 'detailPass.upscaler', message: 'Upscaler must be Lanczos or R-ESRGAN 4x+ Anime6B.' });
  if (!finiteNumber(value.scale) || value.scale <= 1 || value.scale > 2) issues.push({ path: 'detailPass.scale', message: 'Scale must be greater than 1 and no more than 2.' });
  const widthValid = validateDimension(value.targetWidth, 'detailPass.targetWidth', MAX_FINAL_DIMENSION, issues);
  const heightValid = validateDimension(value.targetHeight, 'detailPass.targetHeight', MAX_FINAL_DIMENSION, issues);
  if (widthValid && heightValid && Number(value.targetWidth) * Number(value.targetHeight) > MAX_FINAL_PIXELS) {
    issues.push({ path: 'detailPass', message: `Final image must not exceed ${MAX_FINAL_PIXELS.toLocaleString('en-US')} pixels.` });
  }
  if (typeof value.lockAspectRatio !== 'boolean') issues.push({ path: 'detailPass.lockAspectRatio', message: 'Aspect-ratio lock must be true or false.' });
  if (value.lockAspectRatio === true && finiteNumber(baseWidth) && finiteNumber(baseHeight) && widthValid && heightValid &&
      Math.abs((Number(value.targetWidth) / Number(value.targetHeight)) - (baseWidth / baseHeight)) / (baseWidth / baseHeight) > 0.005) {
    issues.push({ path: 'detailPass.targetHeight', message: 'Final dimensions must preserve the base aspect ratio while the lock is enabled.' });
  }
  if (value.lockAspectRatio === true && finiteNumber(value.scale) && finiteNumber(baseWidth) && finiteNumber(baseHeight) && widthValid && heightValid &&
      (value.targetWidth !== alignDimension(baseWidth * value.scale) || value.targetHeight !== alignDimension(baseHeight * value.scale))) {
    issues.push({ path: 'detailPass.scale', message: 'Scale and final dimensions are out of sync.' });
  }
  if (!finiteNumber(value.strength) || value.strength < 0.05 || value.strength > 0.95) issues.push({ path: 'detailPass.strength', message: 'Denoising strength must be from 0.05 to 0.95.' });
  if (!finiteNumber(value.steps) || !Number.isInteger(value.steps) || value.steps < 1 || value.steps > 100) issues.push({ path: 'detailPass.steps', message: 'Second-pass steps must be an integer from 1 to 100.' });
  for (const [modeField, promptField] of [['promptMode', 'prompt'], ['negativePromptMode', 'negativePrompt']] as const) {
    if (!['inherit', 'custom'].includes(String(value[modeField]))) issues.push({ path: `detailPass.${modeField}`, message: 'Prompt mode must be inherit or custom.' });
    validateOptionalPrompt(value[promptField], `detailPass.${promptField}`, issues);
    if (value[modeField] === 'custom' && (typeof value[promptField] !== 'string' || !value[promptField].trim())) issues.push({ path: `detailPass.${promptField}`, message: 'A custom second-pass prompt is required.' });
    if (value[modeField] === 'inherit' && value[promptField] !== undefined) issues.push({ path: `detailPass.${promptField}`, message: 'Inherited prompts must not include an ignored custom value.' });
  }
  if (!['derived', 'custom'].includes(String(value.seedMode))) issues.push({ path: 'detailPass.seedMode', message: 'Seed mode must be derived or custom.' });
  if (value.seed !== undefined && !validSeed(value.seed)) issues.push({ path: 'detailPass.seed', message: 'Detail seed must be an unsigned 32-bit integer.' });
  if (value.seedMode === 'custom' && !validSeed(value.seed)) issues.push({ path: 'detailPass.seed', message: 'A custom detail seed is required.' });
  return value as unknown as EnabledHighResolutionPass;
}

export function validateGenerateRequest(value: unknown): ValidationResult<GenerateRequest> {
  if (!isRecord(value)) return { success: false, issues: [{ path: '', message: 'Request must be an object.' }] };
  const issues: ValidationIssue[] = [];
  for (const key of Object.keys(value)) if (!requestKeys.has(key)) issues.push({ path: key, message: 'Unexpected field.' });
  const prompt = typeof value.prompt === 'string' ? value.prompt : '';
  const modelId = typeof value.modelId === 'string' ? value.modelId.trim() : '';
  const negativePrompt = typeof value.negativePrompt === 'string' ? value.negativePrompt : undefined;
  if (!prompt.trim()) issues.push({ path: 'prompt', message: 'Prompt is required.' });
  if (prompt.length > 4_000) issues.push({ path: 'prompt', message: 'Prompt is too long.' });
  validateOptionalPrompt(value.negativePrompt, 'negativePrompt', issues);
  if (!modelId || modelId.length > 200) issues.push({ path: 'modelId', message: 'A valid model is required.' });
  validateDimension(value.width, 'width', MAX_BASE_DIMENSION, issues);
  validateDimension(value.height, 'height', MAX_BASE_DIMENSION, issues);
  if (finiteNumber(value.width) && finiteNumber(value.height) && value.width * value.height > MAX_FINAL_PIXELS) issues.push({ path: 'width', message: `Base image must not exceed ${MAX_FINAL_PIXELS.toLocaleString('en-US')} pixels.` });
  if (!finiteNumber(value.steps) || !Number.isInteger(value.steps) || value.steps < 1 || value.steps > 150) issues.push({ path: 'steps', message: 'Steps must be an integer from 1 to 150.' });
  if (!finiteNumber(value.guidance) || value.guidance < 0 || value.guidance > 30) issues.push({ path: 'guidance', message: 'Guidance must be from 0 to 30.' });
  if (value.sampler !== undefined && !['checkpoint-default', 'euler-ancestral'].includes(String(value.sampler))) issues.push({ path: 'sampler', message: 'Sampler must be checkpoint default or Euler ancestral.' });
  if (value.clipLayerSelection !== undefined && value.clipLayerSelection !== DEFAULT_SDXL_CLIP_LAYER_SELECTION) issues.push({ path: 'clipLayerSelection', message: 'Only the SDXL penultimate hidden state is currently supported.' });
  if (value.seed !== undefined && !validSeed(value.seed)) issues.push({ path: 'seed', message: 'Seed must be an unsigned 32-bit integer.' });
  const detailPass = validateDetailPass(value.detailPass, value.width, value.height, issues);
  if (issues.length > 0) return { success: false, issues };
  const data: GenerateRequest = { prompt, modelId, width: value.width as number, height: value.height as number, steps: value.steps as number, guidance: value.guidance as number };
  if (negativePrompt !== undefined) data.negativePrompt = negativePrompt;
  if (value.seed !== undefined) data.seed = value.seed as number;
  if (value.sampler !== undefined) data.sampler = value.sampler as SamplerSelection;
  if (value.clipLayerSelection !== undefined) data.clipLayerSelection = value.clipLayerSelection as ClipLayerSelection;
  if (detailPass !== undefined) data.detailPass = detailPass;
  return { success: true, data };
}

function randomUint32(): number {
  const values = new Uint32Array(1); globalThis.crypto.getRandomValues(values); return values[0]!;
}
export function resolveGenerateRequest(request: GenerateRequest, seedSource: () => number = randomUint32): ResolvedGenerateRequest {
  const validation = validateGenerateRequest(request);
  if (!validation.success) throw new TypeError(validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '));
  const baseSeed = validation.data.seed ?? seedSource();
  if (!validSeed(baseSeed)) throw new RangeError('Seed source must return an unsigned 32-bit integer.');
  const detail = validation.data.detailPass;
  const detailPass: ResolvedHighResolutionPass = !detail?.enabled ? { enabled: false } : { ...detail, seed: detail.seedMode === 'custom' ? detail.seed! : deriveDetailSeed(baseSeed) };
  const resolved: ResolvedGenerateRequest = {
    prompt: validation.data.prompt, modelId: validation.data.modelId, seed: baseSeed,
    width: validation.data.width, height: validation.data.height, steps: validation.data.steps,
    guidance: validation.data.guidance,
    sampler: validation.data.sampler ?? DEFAULT_SAMPLER_SELECTION,
    clipLayerSelection: validation.data.clipLayerSelection ?? DEFAULT_SDXL_CLIP_LAYER_SELECTION,
    detailPass,
  };
  if (validation.data.negativePrompt !== undefined) resolved.negativePrompt = validation.data.negativePrompt;
  return resolved;
}

export const IPC_CHANNELS = {
  cancel: 'diffusion:cancel', generate: 'diffusion:generate', inspectHardware: 'diffusion:inspect-hardware', listModels: 'diffusion:list-models', progress: 'diffusion:progress', result: 'diffusion:result', lifecycle: 'diffusion:lifecycle',
  chooseModelFile: 'models:choose-file', inspectModelImport: 'models:inspect-import', importModel: 'models:import', cancelModelImport: 'models:cancel-import', listModelLibrary: 'models:list', revalidateModel: 'models:revalidate', removeModel: 'models:remove', selectModel: 'models:select', loadModel: 'models:load', loadedModel: 'models:loaded', modelOperationProgress: 'models:progress',
  diagnostics: 'diagnostics:get', copyDiagnostics: 'diagnostics:copy', saveDiagnostics: 'diagnostics:save', copyModelSha: 'models:copy-sha', completeTags: 'tags:complete', tagCatalogInfo: 'tags:catalog-info', tagReference: 'tags:reference',
} as const;
export interface StartGenerationResponse { jobId: string }
export interface JobPayload { jobId: string }
export interface DiffusionBridge {
  inspectHardware(): Promise<HardwareProfile>; listModels(): Promise<ModelInfo[]>; generate(request: GenerateRequest): Promise<StartGenerationResponse>; result(jobId: string): Promise<GenerationResult>; cancel(jobId: string): Promise<void>;
  onProgress(listener: ProgressListener): () => void; onLifecycle(listener: (event: EngineLifecycleNotification) => void): () => void;
  chooseModelFile(): Promise<import('./model-library').ModelFileChoice>; inspectModelImport(token: string): Promise<import('./model-library').ModelImportInspection>; importModel(request: import('./model-library').ImportModelRequest): Promise<import('./model-library').ModelLibraryItem>; cancelModelImport(token: string): Promise<void>;
  listModelLibrary(): Promise<import('./model-library').ModelLibraryItem[]>; revalidateModel(modelId: string): Promise<import('./model-library').ModelLibraryItem>; removeModel(request: import('./model-library').RemoveModelRequest): Promise<void>; selectModel(modelId: string): Promise<import('./model-library').LoadedModelState>; loadModel(modelId: string): Promise<import('./model-library').LoadedModelState>; getLoadedModel(): Promise<import('./model-library').LoadedModelState>;
  getDiagnostics(): Promise<import('./model-library').DiagnosticsReport>; copyDiagnostics(): Promise<void>; saveDiagnostics(): Promise<{ cancelled: boolean }>; copyModelSha(modelId: string): Promise<void>; onModelOperationProgress(listener: (event: import('./model-library').ModelOperationProgress) => void): () => void;
  completeTags(request: import('./tag-catalog').TagAutocompleteRequest): Promise<import('./tag-catalog').TagAutocompleteResult>; getTagCatalogInfo(): Promise<import('./tag-catalog').TagCatalogInfo>; getTagReference(request: import('./tag-catalog').TagReferenceRequest): Promise<import('./tag-catalog').TagReference>;
}
export function validateJobPayload(value: unknown): ValidationResult<JobPayload> {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== 'jobId')) return { success: false, issues: [{ path: '', message: 'Invalid job payload.' }] };
  if (typeof value.jobId !== 'string' || value.jobId.length < 1 || value.jobId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(value.jobId)) return { success: false, issues: [{ path: 'jobId', message: 'Invalid job ID.' }] };
  return { success: true, data: { jobId: value.jobId } };
}

export * from './host-protocol';
export * from './model-library';
export * from './tag-catalog';
