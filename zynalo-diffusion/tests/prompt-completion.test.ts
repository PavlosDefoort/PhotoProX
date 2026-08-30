import { describe, expect, it } from 'vitest';
import { createDevelopmentPromptLanguageService } from '@zynalo/prompt-language';
import { autocompleteExclusions } from '../apps/diffusion/src/renderer/promptCompletion';

describe('renderer autocomplete request', () => {
  it('does not exclude the recognized alias currently being edited', () => {
    const language = createDevelopmentPromptLanguageService();
    const document = language.parse('solo, nami');
    const completion = language.complete({ document, position: document.source.length });

    expect(document.tokens[1]).toMatchObject({ canonicalTag: 'nami_(one_piece)', matchKind: 'alias' });
    expect(autocompleteExclusions(document, completion.range)).toEqual(['solo']);
    expect(autocompleteExclusions(document, completion.range)).not.toContain('nami_(one_piece)');
  });

  it('continues excluding duplicate tags outside the active token', () => {
    const language = createDevelopmentPromptLanguageService();
    const document = language.parse('nami_(one_piece), blue_hair');
    const completion = language.complete({ document, position: document.source.length });

    expect(autocompleteExclusions(document, completion.range)).toEqual(['nami_(one_piece)']);
  });
});
