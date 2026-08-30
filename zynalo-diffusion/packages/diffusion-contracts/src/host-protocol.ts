import type {
  GenerationFailure,
  GenerationProgress,
  GenerationStageMetrics,
  HardwareProfile,
  ModelInfo,
  ResolvedGenerateRequest,
  StageSeeds,
  ValidationIssue,
  ValidationResult,
} from './index';

export const ENGINE_HOST_PROTOCOL = 'zynalo.diffusion.engine-host/v2' as const;

export const HOST_LIFECYCLE_EVENTS = [
  'hello',
  'model-load-started',
  'model-load-completed',
  'ready',
  'shutting-down',
  'stopped',
] as const;

export type HostLifecycleEventName = (typeof HOST_LIFECYCLE_EVENTS)[number];
export type HostCommandName =
  | 'inspect-hardware'
  | 'list-models'
  | 'generate'
  | 'cancel'
  | 'status'
  | 'runtime-diagnostics'
  | 'load-model'
  | 'unload-model'
  | 'shutdown';

export interface HostCommandEnvelope {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'command';
  id: string;
  command: HostCommandName;
  payload: Record<string, unknown>;
}

export interface HostErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
}

export interface HostLifecycleMessage {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'lifecycle';
  event: HostLifecycleEventName;
  modelId?: string;
  hostVersion?: string;
  pid?: number;
  loadCount?: number;
  elapsedMs?: number;
}

export interface HostResponseMessage {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'response';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: HostErrorPayload;
}

export interface HostProgressMessage extends GenerationProgress {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'progress';
}

export interface HostGeneratedOutput {
  id: string;
  relativePath: string;
  mimeType: 'image/png';
  width: number;
  height: number;
}

export interface HostGenerationResult {
  jobId: string;
  seed: number;
  durationMs: number;
  status: 'completed' | 'base-only' | 'cancelled';
  output: HostGeneratedOutput;
  baseAsset: HostGeneratedOutput;
  finalAsset?: HostGeneratedOutput;
  stages: GenerationStageMetrics[];
  seeds: StageSeeds;
  parameters: ResolvedGenerateRequest;
  basePixelSha256: string;
  finalPixelSha256?: string;
  failure?: GenerationFailure;
}

export interface HostGenerationResultMessage {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'generation-result';
  jobId: string;
  result: HostGenerationResult;
}

export interface HostGenerationErrorMessage {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'generation-error';
  jobId: string;
  error: HostErrorPayload;
}

export interface HostProtocolErrorMessage {
  protocol: typeof ENGINE_HOST_PROTOCOL;
  type: 'protocol-error';
  error: HostErrorPayload;
}

export type EngineHostMessage =
  | HostLifecycleMessage
  | HostResponseMessage
  | HostProgressMessage
  | HostGenerationResultMessage
  | HostGenerationErrorMessage
  | HostProtocolErrorMessage;

export interface HostStatus {
  state: 'loading' | 'ready' | 'generating' | 'stopping';
  modelLoadCount: number;
  generationCount: number;
  activeJobId?: string;
  loadedModelId?: string;
}

export interface HostRuntimeDiagnostics {
  pythonVersion: string;
  packages: Record<'torch' | 'diffusers' | 'transformers' | 'safetensors', string | null>;
  cudaAvailable: boolean;
  cudaRuntime: string | null;
  gpuName: string | null;
  computeCapability: string | null;
  totalVramMb: number | null;
  allocatedMb: number | null;
  reservedMb: number | null;
  driver: string | null;
}

export interface EngineLifecycleNotification {
  state: 'initializing' | 'loading-model' | 'ready' | 'protocol-error' | 'crashed' | 'stopped';
  message: string;
  modelId?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: UnknownRecord, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(record).every((key) => keys.has(key));
}

function validIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(value);
}

function validError(value: unknown): value is HostErrorPayload {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['code', 'message', 'retryable']) &&
    typeof value.code === 'string' &&
    value.code.length > 0 &&
    value.code.length <= 100 &&
    typeof value.message === 'string' &&
    value.message.length > 0 &&
    value.message.length <= 4_000 &&
    typeof value.retryable === 'boolean'
  );
}

function invalid(message: string, path = ''): ValidationResult<never> {
  return { success: false, issues: [{ path, message }] };
}

function validateProgress(record: UnknownRecord): ValidationResult<HostProgressMessage> {
  if (!hasOnlyKeys(record, ['protocol', 'type', 'jobId', 'stage', 'progress', 'stageProgress', 'overallProgress', 'currentStep', 'totalSteps', 'pass'])) {
    return invalid('Progress message contains unexpected fields.');
  }
  if (!validIdentifier(record.jobId)) return invalid('Invalid progress job ID.', 'jobId');
  if (!['queued', 'loading-model', 'encoding-prompt', 'base-generating', 'base-decoding', 'upscaling', 'detail-preparing', 'detail-generating', 'final-decoding', 'saving', 'completed'].includes(String(record.stage))) {
    return invalid('Invalid generation stage.', 'stage');
  }
  for (const field of ['progress', 'stageProgress', 'overallProgress'] as const) {
    if (typeof record[field] !== 'number' || !Number.isFinite(record[field]) || record[field] < 0 || record[field] > 1) {
      return invalid(`${field} must be a finite number from 0 to 1.`, field);
    }
  }
  if (record.progress !== record.overallProgress) return invalid('Progress alias must equal overallProgress.', 'progress');
  if (record.pass !== undefined && !['base', 'detail'].includes(String(record.pass))) return invalid('Invalid generation pass.', 'pass');
  for (const field of ['currentStep', 'totalSteps'] as const) {
    if (record[field] !== undefined && (typeof record[field] !== 'number' || !Number.isInteger(record[field]) || record[field] < 1)) {
      return invalid(`${field} must be a positive integer.`, field);
    }
  }
  return { success: true, data: record as unknown as HostProgressMessage };
}

function validateOutput(value: unknown): value is HostGeneratedOutput {
  if (!isRecord(value)) return false;
  return hasOnlyKeys(value, ['id', 'relativePath', 'mimeType', 'width', 'height']) &&
    validIdentifier(value.id) && typeof value.relativePath === 'string' && value.relativePath === `${value.id}.png` &&
    value.mimeType === 'image/png' && typeof value.width === 'number' && Number.isInteger(value.width) && value.width >= 64 && value.width <= 3_072 &&
    typeof value.height === 'number' && Number.isInteger(value.height) && value.height >= 64 && value.height <= 3_072;
}

function validHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function validStageMetrics(value: unknown): value is GenerationStageMetrics[] {
  return Array.isArray(value) && value.length <= 20 && value.every((item) =>
    isRecord(item) && hasOnlyKeys(item, ['stage', 'durationMs', 'peakAllocatedVram', 'peakReservedVram', 'processRamBytes']) &&
    ['base', 'upscale', 'detail', 'decode', 'save'].includes(String(item.stage)) &&
    typeof item.durationMs === 'number' && Number.isFinite(item.durationMs) && item.durationMs >= 0 &&
    ['peakAllocatedVram', 'peakReservedVram', 'processRamBytes'].every((field) => item[field] === undefined ||
      (typeof item[field] === 'number' && Number.isFinite(item[field]) && item[field] >= 0)));
}

function validSeeds(value: unknown): value is StageSeeds {
  if (!isRecord(value) || !hasOnlyKeys(value, ['baseSeed', 'detailSeed', 'derivation']) ||
      typeof value.baseSeed !== 'number' || !Number.isInteger(value.baseSeed) || value.baseSeed < 0 || value.baseSeed > 4_294_967_295 ||
      !['explicit', 'zynalo-detail-seed-v1'].includes(String(value.derivation))) return false;
  return value.detailSeed === undefined || (typeof value.detailSeed === 'number' && Number.isInteger(value.detailSeed) && value.detailSeed >= 0 && value.detailSeed <= 4_294_967_295);
}

function validParameters(value: unknown): value is ResolvedGenerateRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['prompt', 'negativePrompt', 'modelId', 'seed', 'width', 'height', 'steps', 'guidance', 'sampler', 'clipLayerSelection', 'detailPass'])) return false;
  if (typeof value.prompt !== 'string' || value.prompt.length > 4_000 || typeof value.modelId !== 'string' || !validIdentifier(value.modelId) ||
      typeof value.seed !== 'number' || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 4_294_967_295 ||
      typeof value.width !== 'number' || !Number.isInteger(value.width) || typeof value.height !== 'number' || !Number.isInteger(value.height) ||
      typeof value.steps !== 'number' || !Number.isInteger(value.steps) || typeof value.guidance !== 'number' || !Number.isFinite(value.guidance) ||
      !['checkpoint-default', 'euler-ancestral'].includes(String(value.sampler)) ||
      value.clipLayerSelection !== 'penultimate-hidden-state' ||
      (value.negativePrompt !== undefined && (typeof value.negativePrompt !== 'string' || value.negativePrompt.length > 4_000)) || !isRecord(value.detailPass)) return false;
  return value.detailPass.enabled === false || (value.detailPass.enabled === true && ['lanczos', 'realesrgan-anime6b'].includes(String(value.detailPass.upscaler)) &&
    typeof value.detailPass.seed === 'number' && Number.isInteger(value.detailPass.seed));
}

function validFailure(value: unknown): value is GenerationFailure {
  return isRecord(value) && hasOnlyKeys(value, ['stage', 'code', 'message', 'retryable']) &&
    typeof value.stage === 'string' && typeof value.code === 'string' && value.code.length <= 100 &&
    typeof value.message === 'string' && value.message.length <= 4_000 && typeof value.retryable === 'boolean';
}

function validateGeneratedResult(value: unknown): value is HostGenerationResult {
  if (!isRecord(value) || !hasOnlyKeys(value, ['jobId', 'seed', 'durationMs', 'status', 'output', 'baseAsset', 'finalAsset', 'stages', 'seeds', 'parameters', 'basePixelSha256', 'finalPixelSha256', 'failure'])) return false;
  if (!validIdentifier(value.jobId)) return false;
  if (typeof value.seed !== 'number' || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 4_294_967_295) return false;
  if (typeof value.durationMs !== 'number' || !Number.isFinite(value.durationMs) || value.durationMs < 0) return false;
  if (!['completed', 'base-only', 'cancelled'].includes(String(value.status)) || !validateOutput(value.output) || !validateOutput(value.baseAsset)) return false;
  if (value.finalAsset !== undefined && !validateOutput(value.finalAsset)) return false;
  if (!validStageMetrics(value.stages) || !validSeeds(value.seeds) || !validParameters(value.parameters)) return false;
  if (!validHash(value.basePixelSha256) || (value.finalPixelSha256 !== undefined && !validHash(value.finalPixelSha256))) return false;
  if (value.failure !== undefined && !validFailure(value.failure)) return false;
  const detailEnabled = value.parameters.detailPass.enabled;
  if (value.status === 'completed' && detailEnabled && (!validateOutput(value.finalAsset) || !validHash(value.finalPixelSha256))) return false;
  if (value.status !== 'completed' && (value.finalAsset !== undefined || value.finalPixelSha256 !== undefined || !validFailure(value.failure))) return false;
  const expectedOutput = value.finalAsset ?? value.baseAsset;
  if (value.output.id !== expectedOutput.id) return false;
  return true;
}

export function validateEngineHostMessage(value: unknown): ValidationResult<EngineHostMessage> {
  if (!isRecord(value)) return invalid('Host message must be an object.');
  if (value.protocol !== ENGINE_HOST_PROTOCOL) return invalid('Unsupported host protocol.', 'protocol');
  if (typeof value.type !== 'string') return invalid('Host message type is required.', 'type');

  switch (value.type) {
    case 'lifecycle': {
      if (!hasOnlyKeys(value, ['protocol', 'type', 'event', 'modelId', 'hostVersion', 'pid', 'loadCount', 'elapsedMs'])) {
        return invalid('Lifecycle message contains unexpected fields.');
      }
      if (!HOST_LIFECYCLE_EVENTS.includes(value.event as HostLifecycleEventName)) return invalid('Invalid lifecycle event.', 'event');
      if (value.modelId !== undefined && !validIdentifier(value.modelId)) return invalid('Invalid lifecycle model ID.', 'modelId');
      if (value.hostVersion !== undefined && (typeof value.hostVersion !== 'string' || value.hostVersion.length > 50)) return invalid('Invalid host version.', 'hostVersion');
      if (value.pid !== undefined && (typeof value.pid !== 'number' || !Number.isInteger(value.pid) || value.pid < 1)) return invalid('Invalid host PID.', 'pid');
      for (const field of ['loadCount', 'elapsedMs'] as const) {
        if (value[field] !== undefined && (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || value[field] < 0)) {
          return invalid(`Invalid lifecycle ${field}.`, field);
        }
      }
      return { success: true, data: value as unknown as HostLifecycleMessage };
    }
    case 'response': {
      if (!hasOnlyKeys(value, ['protocol', 'type', 'id', 'ok', 'result', 'error'])) return invalid('Response contains unexpected fields.');
      if (!validIdentifier(value.id) || typeof value.ok !== 'boolean') return invalid('Invalid response envelope.');
      if (value.ok && value.error !== undefined) return invalid('Successful response must not contain an error.');
      if (!value.ok && !validError(value.error)) return invalid('Failed response must contain a valid error.');
      if (!value.ok && value.result !== undefined) return invalid('Failed response must not contain a result.');
      return { success: true, data: value as unknown as HostResponseMessage };
    }
    case 'progress':
      return validateProgress(value);
    case 'generation-result': {
      if (!hasOnlyKeys(value, ['protocol', 'type', 'jobId', 'result'])) return invalid('Generation result contains unexpected fields.');
      if (!validIdentifier(value.jobId) || !validateGeneratedResult(value.result) || value.result.jobId !== value.jobId) {
        return invalid('Invalid generation result.');
      }
      return { success: true, data: value as unknown as HostGenerationResultMessage };
    }
    case 'generation-error': {
      if (!hasOnlyKeys(value, ['protocol', 'type', 'jobId', 'error'])) return invalid('Generation error contains unexpected fields.');
      if (!validIdentifier(value.jobId) || !validError(value.error)) return invalid('Invalid generation error.');
      return { success: true, data: value as unknown as HostGenerationErrorMessage };
    }
    case 'protocol-error': {
      if (!hasOnlyKeys(value, ['protocol', 'type', 'error']) || !validError(value.error)) return invalid('Invalid protocol error.');
      return { success: true, data: value as unknown as HostProtocolErrorMessage };
    }
    default:
      return invalid('Unknown host message type.', 'type');
  }
}

export function validateHostModels(value: unknown): ValidationResult<ModelInfo[]> {
  if (!Array.isArray(value)) return invalid('Model response must be an array.');
  const models: ModelInfo[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, ['id', 'name', 'family', 'installed']) ||
      !validIdentifier(item.id) ||
      typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 200 ||
      typeof item.family !== 'string' || item.family.length < 1 || item.family.length > 100 ||
      typeof item.installed !== 'boolean'
    ) return invalid('Invalid model response item.');
    models.push(item as unknown as ModelInfo);
  }
  return { success: true, data: models };
}

export function validateHostHardware(value: unknown): ValidationResult<HardwareProfile> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['backend', 'deviceName', 'dedicatedMemoryMb', 'capabilities']) ||
    !['mock', 'cpu', 'cuda', 'directml', 'metal'].includes(String(value.backend)) ||
    typeof value.deviceName !== 'string' || value.deviceName.length < 1 || value.deviceName.length > 300 ||
    (value.dedicatedMemoryMb !== undefined && (typeof value.dedicatedMemoryMb !== 'number' || !Number.isFinite(value.dedicatedMemoryMb) || value.dedicatedMemoryMb < 0)) ||
    (value.capabilities !== undefined && (!isRecord(value.capabilities) || !hasOnlyKeys(value.capabilities, ['detailPass', 'detailPassUpscalers']) ||
      typeof value.capabilities.detailPass !== 'boolean' || !Array.isArray(value.capabilities.detailPassUpscalers) ||
      value.capabilities.detailPassUpscalers.some((item) => !['lanczos', 'realesrgan-anime6b'].includes(item))))
  ) return invalid('Invalid hardware response.');
  return { success: true, data: value as unknown as HardwareProfile };
}

export function validateHostRuntimeDiagnostics(value: unknown): ValidationResult<HostRuntimeDiagnostics> {
  const nullableString = (item: unknown) => item === null || (typeof item === 'string' && item.length <= 300);
  const nullableNumber = (item: unknown) => item === null || (typeof item === 'number' && Number.isFinite(item) && item >= 0);
  if (!isRecord(value) || !hasOnlyKeys(value, ['pythonVersion', 'packages', 'cudaAvailable', 'cudaRuntime', 'gpuName', 'computeCapability', 'totalVramMb', 'allocatedMb', 'reservedMb', 'driver']) ||
      typeof value.pythonVersion !== 'string' || value.pythonVersion.length > 100 || typeof value.cudaAvailable !== 'boolean' ||
      !nullableString(value.cudaRuntime) || !nullableString(value.gpuName) || !nullableString(value.computeCapability) || !nullableString(value.driver) ||
      !nullableNumber(value.totalVramMb) || !nullableNumber(value.allocatedMb) || !nullableNumber(value.reservedMb) || !isRecord(value.packages) ||
      !hasOnlyKeys(value.packages, ['torch', 'diffusers', 'transformers', 'safetensors']) || Object.values(value.packages).some((item) => !nullableString(item))) {
    return invalid('Invalid runtime diagnostics response.');
  }
  return { success: true, data: value as unknown as HostRuntimeDiagnostics };
}

export function validationMessage(issues: ValidationIssue[]): string {
  return issues.map((issue) => `${issue.path || 'message'}: ${issue.message}`).join(' ');
}
