import type { ValidationResult } from './index';

export type ModelValidationStatus = 'valid' | 'missing' | 'changed' | 'unsupported' | 'invalid';
export type ModelCompatibilityStatus = 'likely-sdxl' | 'confirmed-sdxl' | 'unsupported' | 'unknown';

export interface ModelCompatibility {
  status: ModelCompatibilityStatus;
  summary: string;
  evidence: string[];
}

export interface ModelLibraryItem {
  id: string;
  displayName: string;
  architecture: 'sdxl';
  format: 'safetensors';
  sourceKind: 'external' | 'managed';
  locationDisplay: string;
  fileSize: number;
  sha256: string;
  importedAt: string;
  lastValidatedAt: string;
  validationStatus: ModelValidationStatus;
  compatibility: ModelCompatibility;
  selected: boolean;
  loaded: boolean;
  lastLoadError?: string;
}

export interface ModelFileChoice {
  cancelled: boolean;
  selection?: { token: string; fileName: string };
}

export interface ModelImportInspection {
  token: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  validationStatus: ModelValidationStatus;
  compatibility: ModelCompatibility;
}

export interface ImportModelRequest {
  token: string;
  displayName: string;
  mode: 'external' | 'managed';
}

export interface ModelIdPayload { modelId: string }
export interface RemoveModelRequest extends ModelIdPayload { deleteManagedFile: boolean }
export interface ImportTokenPayload { token: string }

export interface ModelOperationProgress {
  token: string;
  stage: 'validating' | 'hashing' | 'copying' | 'persisting';
  progress: number;
  bytesProcessed?: number;
  totalBytes?: number;
}

export interface LoadedModelState {
  selectedModelId?: string;
  loadedModelId?: string;
  state: 'idle' | 'loading' | 'loaded' | 'failed';
  error?: { code: string; message: string };
}

export type DiagnosticSeverity = 'healthy' | 'warning' | 'blocking' | 'unknown';
export interface DiagnosticValue<T = string | number | boolean | null> {
  severity: DiagnosticSeverity;
  value: T;
  message: string;
  action?: string;
}

export interface DiagnosticsReport {
  schema: 'zynalo.diffusion.diagnostics/v1';
  generatedAt: string;
  application: {
    version: string;
    mode: 'packaged' | 'development';
    userDataLocation: string;
    outputLocation: string;
    engineState: string;
    protocolVersion: string;
  };
  python: {
    executable: DiagnosticValue<string>;
    version: DiagnosticValue<string>;
    packages: Record<string, DiagnosticValue<string>>;
  };
  gpu: {
    cudaAvailable: DiagnosticValue<boolean | null>;
    name: DiagnosticValue<string>;
    cudaRuntime: DiagnosticValue<string>;
    computeCapability: DiagnosticValue<string>;
    totalVramMb: DiagnosticValue<number | null>;
    allocatedMb: DiagnosticValue<number | null>;
    reservedMb: DiagnosticValue<number | null>;
    driver: DiagnosticValue<string>;
  };
  model: {
    selected: DiagnosticValue<string>;
    loaded: DiagnosticValue<string>;
    fileStatus: DiagnosticValue<string>;
    fileSize: DiagnosticValue<number | null>;
    sha256: DiagnosticValue<string>;
    compatibility: DiagnosticValue<string>;
    lastValidation: DiagnosticValue<string>;
    lastLoadError: DiagnosticValue<string>;
  };
}

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (record: RecordValue, keys: readonly string[]) => Object.keys(record).length === keys.length && Object.keys(record).every((key) => keys.includes(key));
const validId = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const invalid = <T>(message: string): ValidationResult<T> => ({ success: false, issues: [{ path: '', message }] });

export function validateImportModelRequest(value: unknown): ValidationResult<ImportModelRequest> {
  if (!isRecord(value) || !exact(value, ['token', 'displayName', 'mode']) || !validId(value.token) ||
      typeof value.displayName !== 'string' || value.displayName.trim().length < 1 || value.displayName.trim().length > 200 ||
      !['external', 'managed'].includes(String(value.mode))) return invalid('Invalid model import request.');
  return { success: true, data: { token: value.token as string, displayName: value.displayName.trim(), mode: value.mode as 'external' | 'managed' } };
}

export function validateModelIdPayload(value: unknown): ValidationResult<ModelIdPayload> {
  if (!isRecord(value) || !exact(value, ['modelId']) || !validId(value.modelId)) return invalid('Invalid model ID payload.');
  return { success: true, data: { modelId: value.modelId as string } };
}

export function validateRemoveModelRequest(value: unknown): ValidationResult<RemoveModelRequest> {
  if (!isRecord(value) || !exact(value, ['modelId', 'deleteManagedFile']) || !validId(value.modelId) || typeof value.deleteManagedFile !== 'boolean') {
    return invalid('Invalid remove-model request.');
  }
  return { success: true, data: { modelId: value.modelId as string, deleteManagedFile: value.deleteManagedFile } };
}

export function validateImportTokenPayload(value: unknown): ValidationResult<ImportTokenPayload> {
  if (!isRecord(value) || !exact(value, ['token']) || !validId(value.token)) return invalid('Invalid import token.');
  return { success: true, data: { token: value.token as string } };
}
