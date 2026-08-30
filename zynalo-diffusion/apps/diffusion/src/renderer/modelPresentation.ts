import type { LoadedModelState, ModelValidationStatus } from '@zynalo/diffusion-contracts';

export function generationModelPresentation(selectedModelId: string, state: LoadedModelState) {
  if (state.state === 'loading') return { label: 'Loading model…', tone: 'loading', canLoad: false, canGenerate: false } as const;
  if (state.state === 'failed') return { label: state.error?.message ?? 'Model load failed', tone: 'failed', canLoad: true, canGenerate: false } as const;
  if (selectedModelId && state.state === 'loaded' && state.loadedModelId === selectedModelId) return { label: 'Loaded and ready', tone: 'loaded', canLoad: true, canGenerate: true } as const;
  return { label: 'Selected model is not loaded', tone: 'idle', canLoad: Boolean(selectedModelId), canGenerate: false } as const;
}

export function validationPresentation(status: ModelValidationStatus): { blocking: boolean; label: string } {
  const labels: Record<ModelValidationStatus, string> = { valid: 'Valid', missing: 'File missing', changed: 'File changed', unsupported: 'Unsupported checkpoint', invalid: 'Invalid safetensors' };
  return { blocking: status !== 'valid', label: labels[status] };
}
