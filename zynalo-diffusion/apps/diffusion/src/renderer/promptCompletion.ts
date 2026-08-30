import type { PromptDocument, TextRange } from '@zynalo/prompt-language';

export function autocompleteExclusions(document: PromptDocument, activeRange: TextRange): string[] {
  return document.tokens.flatMap((token) => {
    const active = token.range.from <= activeRange.from && token.range.to >= activeRange.to;
    return !active && token.canonicalTag ? [token.canonicalTag] : [];
  });
}
