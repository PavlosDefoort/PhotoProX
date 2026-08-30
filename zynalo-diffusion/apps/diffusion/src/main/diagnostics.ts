import path from 'node:path';
import type { DiagnosticsReport, DiagnosticValue } from '@zynalo/diffusion-contracts';
import { ENGINE_HOST_PROTOCOL } from '@zynalo/diffusion-contracts';
import type { PythonDiffusionEngine } from '@zynalo/diffusion-engine';
import type { ModelLibrary } from './model-library';

const healthy = <T extends string | number | boolean | null>(value: T, message: string): DiagnosticValue<T> => ({ severity: 'healthy', value, message });
const unknown = <T extends string | number | boolean | null>(value: T, message: string, action?: string): DiagnosticValue<T> => ({ severity: 'unknown', value, message, ...(action ? { action } : {}) });
const blocking = <T extends string | number | boolean | null>(value: T, message: string, action: string): DiagnosticValue<T> => ({ severity: 'blocking', value, message, action });
const warning = <T extends string | number | boolean | null>(value: T, message: string, action?: string): DiagnosticValue<T> => ({ severity: 'warning', value, message, ...(action ? { action } : {}) });

export interface DiagnosticsContext {
  version: string;
  packaged: boolean;
  userData: string;
  outputRoot: string;
  pythonExecutable?: string | undefined;
  python: PythonDiffusionEngine | null;
  library: ModelLibrary;
  engineState(): string;
}

export async function buildDiagnostics(context: DiagnosticsContext): Promise<DiagnosticsReport> {
  const items = context.library.list();
  const selected = items.find((item) => item.selected);
  const loaded = items.find((item) => item.loaded);
  let runtime: Awaited<ReturnType<PythonDiffusionEngine['runtimeDiagnostics']>> | null = null;
  let runtimeFailure = '';
  if (context.python) {
    try { runtime = await context.python.runtimeDiagnostics(); } catch (error) { runtimeFailure = error instanceof Error ? error.message : String(error); }
  }
  const packageValue = (name: 'torch' | 'diffusers' | 'transformers' | 'safetensors') => {
    const value = runtime?.packages[name] ?? null;
    return value ? healthy(value, `${name} is available.`) : blocking('', `${name} is unavailable.`, `Install ${name} in the configured Zynalo Python environment.`);
  };
  const cudaAvailable = runtime?.cudaAvailable ?? null;
  const fileSeverity = selected?.validationStatus === 'valid' ? 'healthy' : selected ? 'blocking' : 'unknown';
  const fileAction = selected && selected.validationStatus !== 'valid' ? 'Revalidate or re-import the checkpoint before loading it.' : undefined;
  return {
    schema: 'zynalo.diffusion.diagnostics/v1', generatedAt: new Date().toISOString(),
    application: {
      version: context.version, mode: context.packaged ? 'packaged' : 'development',
      userDataLocation: redactLocation(context.userData), outputLocation: redactLocation(context.outputRoot),
      engineState: context.engineState(), protocolVersion: ENGINE_HOST_PROTOCOL,
    },
    python: {
      executable: context.pythonExecutable ? healthy(path.basename(context.pythonExecutable), 'Configured Python runtime found.') : blocking('', 'Python runtime not found.', 'Configure the interpreter used by the verified Zynalo engine environment.'),
      version: runtime ? healthy(runtime.pythonVersion, 'Python runtime responded to the engine handshake.') : blocking('', runtimeFailure || 'Python runtime has not been tested.', 'Check the configured interpreter and required packages.'),
      packages: { torch: packageValue('torch'), diffusers: packageValue('diffusers'), transformers: packageValue('transformers'), safetensors: packageValue('safetensors') },
    },
    gpu: {
      cudaAvailable: cudaAvailable === true ? healthy(true, 'CUDA is available in PyTorch.') : cudaAvailable === false ? blocking(false, 'CUDA is unavailable in PyTorch.', 'Install a CUDA-enabled PyTorch wheel compatible with the NVIDIA driver; a separate CUDA Toolkit is usually not required.') : unknown(null, 'CUDA has not been tested.'),
      name: runtime?.gpuName ? healthy(runtime.gpuName, 'NVIDIA GPU detected.') : unknown('', 'GPU name is unavailable.'),
      cudaRuntime: runtime?.cudaRuntime ? healthy(runtime.cudaRuntime, 'CUDA runtime reported by PyTorch.') : unknown('', 'CUDA runtime is unavailable.'),
      computeCapability: runtime?.computeCapability ? healthy(runtime.computeCapability, 'GPU compute capability reported.') : unknown('', 'Compute capability is unavailable.'),
      totalVramMb: runtime?.totalVramMb != null ? healthy(runtime.totalVramMb, 'Total GPU memory reported.') : unknown(null, 'Total GPU memory is unavailable.'),
      allocatedMb: runtime?.allocatedMb != null ? healthy(runtime.allocatedMb, 'Current PyTorch allocation.') : unknown(null, 'Current allocation is unavailable.'),
      reservedMb: runtime?.reservedMb != null ? healthy(runtime.reservedMb, 'Current PyTorch reservation.') : unknown(null, 'Current reservation is unavailable.'),
      driver: runtime?.driver ? healthy(runtime.driver, 'NVIDIA driver reported.') : unknown('', 'Driver version is not reliably exposed by this runtime.'),
    },
    model: {
      selected: selected ? healthy(selected.displayName, 'Registered model selected.') : unknown('', 'No registered model is selected.', 'Import and select an SDXL checkpoint.'),
      loaded: loaded ? healthy(loaded.displayName, 'Model is resident in the Python engine.') : warning('', 'No registered model is currently loaded.', 'Load a valid selected model before generation.'),
      fileStatus: selected ? { severity: fileSeverity, value: selected.validationStatus, message: `Model file status: ${selected.validationStatus}.`, ...(fileAction ? { action: fileAction } : {}) } : unknown('', 'No model file selected.'),
      fileSize: selected ? healthy(selected.fileSize, 'Registered checkpoint size in bytes.') : unknown(null, 'Model size is unavailable.'),
      sha256: selected ? healthy(selected.sha256, 'Streaming SHA-256 recorded at registration.') : unknown('', 'Model SHA-256 is unavailable.'),
      compatibility: selected ? (selected.compatibility.status === 'confirmed-sdxl' ? healthy(selected.compatibility.summary, selected.compatibility.summary) : warning(selected.compatibility.summary, selected.compatibility.summary)) : unknown('', 'Model compatibility is unavailable.'),
      lastValidation: selected ? healthy(selected.lastValidatedAt, 'Last checkpoint validation time.') : unknown('', 'Model has not been validated.'),
      lastLoadError: selected?.lastLoadError ? blocking(selected.lastLoadError, selected.lastLoadError, 'Review runtime diagnostics, then retry loading the model.') : healthy('', 'No model load error recorded.'),
    },
  };
}

export function redactLocation(location: string): string {
  return `%USER_DATA%/${path.basename(location)}`;
}

export function serializedDiagnostics(report: DiagnosticsReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
