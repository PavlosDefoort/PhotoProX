import { expect, it } from 'vitest';
import { createDevelopmentPromptLanguageService } from '@zynalo/prompt-language';

it('measures bounded development-catalog prompt operations', () => {
  const catalogStarted = performance.now();
  const language = createDevelopmentPromptLanguageService();
  const catalogLoadMs = performance.now() - catalogStarted;
  const segment = 'custom_trigger_with_a_deliberately_long_name_for_editor_responsiveness';
  const longPrompt = Array.from({ length: 55 }, (_, index) => `${segment}_${index}`).join(', ').slice(0, 3_900);
  const parserStarted = performance.now();
  const document = language.parse(longPrompt);
  const parserMs = performance.now() - parserStarted;
  const lintStarted = performance.now();
  language.lint(document, { guidanceLevel: 'full' });
  const lintMs = performance.now() - lintStarted;
  const completionDocument = language.parse('nami one');
  const completionStarted = performance.now();
  for (let index = 0; index < 200; index += 1) language.complete({ document: completionDocument, position: 8 });
  const autocompleteAverageMs = (performance.now() - completionStarted) / 200;
  const measurements = { catalogLoadMs, parserMs, lintMs, autocompleteAverageMs, characters: longPrompt.length, tokens: document.tokens.length };
  process.stdout.write(`PROMPT_PERFORMANCE ${JSON.stringify(measurements)}\n`);
  expect(catalogLoadMs).toBeLessThan(100);
  expect(parserMs).toBeLessThan(100);
  expect(lintMs).toBeLessThan(100);
  expect(autocompleteAverageMs).toBeLessThan(20);
});
