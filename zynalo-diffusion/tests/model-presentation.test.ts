import { describe, expect, it } from 'vitest';
import { generationModelPresentation, validationPresentation } from '../apps/diffusion/src/renderer/modelPresentation';

describe('model UI state presentation', () => {
  it('distinguishes loading, loaded, failed, and selected-but-idle states', () => {
    expect(generationModelPresentation('one', { state: 'loading', selectedModelId: 'one' })).toMatchObject({ tone: 'loading', canGenerate: false });
    expect(generationModelPresentation('one', { state: 'loaded', selectedModelId: 'one', loadedModelId: 'one' })).toMatchObject({ tone: 'loaded', canGenerate: true });
    expect(generationModelPresentation('two', { state: 'loaded', selectedModelId: 'two', loadedModelId: 'one' })).toMatchObject({ tone: 'idle', canGenerate: false });
    expect(generationModelPresentation('one', { state: 'failed', error: { code: 'OOM', message: 'GPU out of memory' } })).toMatchObject({ tone: 'failed', label: 'GPU out of memory' });
  });

  it.each(['missing', 'changed', 'unsupported', 'invalid'] as const)('marks %s registrations as blocking', (status) => {
    expect(validationPresentation(status).blocking).toBe(true);
  });
});
