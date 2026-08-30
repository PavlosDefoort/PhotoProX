import { describe, expect, it } from 'vitest';
import { createDevelopmentPromptLanguageService, PROMPT_LIMITS, PromptCatalog, StalePromptEditError, validateCatalog, WAI_DEVELOPMENT_CATALOG, WAI_DEVELOPMENT_CATALOG_RECORD_COUNT, WAI_ILLUSTRIOUS_PROFILE } from '@zynalo/prompt-language';

const language = createDevelopmentPromptLanguageService();
const analyze = (source: string, guidanceLevel: 'full' | 'important' | 'off' = 'off') => {
  const document = language.parse(source);
  return { document, diagnostics: language.lint(document, { guidanceLevel }) };
};

it('records the WAI SDXL CLIP layer semantically instead of as a Diffusers clip_skip integer', () => {
  expect(WAI_ILLUSTRIOUS_PROFILE.clipLayerSelection).toBe('penultimate-hidden-state');
  expect(WAI_ILLUSTRIOUS_PROFILE).not.toHaveProperty('clipSkip');
});

it('records the documented WAI generation and high-resolution defaults', () => {
  expect(WAI_ILLUSTRIOUS_PROFILE.generationDefaults).toEqual({
    width: 1024, height: 1344, steps: 25, guidance: 6, sampler: 'euler-ancestral',
  });
  expect(WAI_ILLUSTRIOUS_PROFILE.detailPassPresets).toEqual({
    standard: { scale: 1.5, strength: 0.35, steps: 20, upscaler: 'realesrgan-anime6b' },
    strong: { scale: 1.5, strength: 0.5, steps: 20, upscaler: 'realesrgan-anime6b' },
  });
});

describe('lossless Booru prompt parser', () => {
  it.each(['', 'solo', '  1girl, blue_eyes  ', '1girl,\nblue_eyes,\nreading'])('preserves source byte-for-byte: %j', (source) => {
    expect(language.parse(source).source).toBe(source);
  });

  it('preserves commas, multiline whitespace, empty entries, and stable ranges', () => {
    const source = '  1girl,\n, blue_eyes  ';
    const first = language.parse(source);
    const second = language.parse(source);
    expect(first.tokens.map((token) => source.slice(token.range.from, token.range.to))).toEqual(['1girl', 'blue_eyes']);
    expect(first.tokens.map((token) => token.range)).toEqual(second.tokens.map((token) => token.range));
    expect(first.diagnostics.some((item) => item.code === 'empty-entry')).toBe(true);
  });

  it('distinguishes character parentheses from emphasis and numeric weights', () => {
    const document = language.parse('nami_(one_piece), (smile), ((blue_eyes)), (black_hair:1.2)');
    expect(document.tokens.map((token) => [token.raw, token.syntaxKind, token.weight])).toEqual([
      ['nami_(one_piece)', 'tag', undefined], ['smile', 'tag', undefined], ['blue_eyes', 'tag', undefined], ['black_hair', 'weighted-tag', 1.2],
    ]);
    expect(document.tokens.every((token) => token.recognized)).toBe(true);
  });

  it('accepts escaped parentheses without treating them as structure', () => {
    const document = language.parse(String.raw`custom_\(variant\), smile`);
    expect(document.source).toBe(String.raw`custom_\(variant\), smile`);
    expect(document.diagnostics.some((item) => item.code === 'malformed-parentheses')).toBe(false);
  });

  it.each([
    ['(smile:nope)', 'invalid-weight'],
    ['(smile:Infinity)', 'non-finite-weight'],
    ['(smile:3)', 'weight-out-of-range'],
    ['(smile:1.2', 'unclosed-weight'],
    [')smile(', 'malformed-parentheses'],
  ])('returns a blocking partial document for %s', (source, code) => {
    const document = language.parse(source);
    expect(document.source).toBe(source);
    expect(document.tokens.length).toBeGreaterThan(0);
    expect(document.diagnostics).toContainEqual(expect.objectContaining({ code, severity: 'error', blocksGeneration: true }));
  });

  it('bounds nesting, source length, and token analysis without discarding source', () => {
    const nested = `${'('.repeat(PROMPT_LIMITS.maxNestingDepth + 1)}smile${')'.repeat(PROMPT_LIMITS.maxNestingDepth + 1)}`;
    expect(language.parse(nested).diagnostics.some((item) => item.code === 'excessive-nesting')).toBe(true);
    const long = 'x'.repeat(PROMPT_LIMITS.maxCharacters + 10);
    const document = language.parse(long);
    expect(document.source).toBe(long);
    expect(document.analysisTruncated).toBe(true);
    expect(document.diagnostics.some((item) => item.code === 'prompt-too-long')).toBe(true);
  });

  it('preserves unsupported syntax and explains the analysis boundary', () => {
    const { document, diagnostics } = analyze('{artist:custom}|trigger');
    expect(document.source).toBe('{artist:custom}|trigger');
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'unsupported-syntax', severity: 'warning', blocksGeneration: false }));
  });
});

describe('curated catalog and contextual completion', () => {
  it('contains a bounded 200–500 record versioned local fixture and required examples', () => {
    expect(WAI_DEVELOPMENT_CATALOG_RECORD_COUNT).toBeGreaterThanOrEqual(200);
    expect(WAI_DEVELOPMENT_CATALOG_RECORD_COUNT).toBeLessThanOrEqual(500);
    const names = new Set(WAI_DEVELOPMENT_CATALOG.records.map((record) => record.canonicalName));
    for (const name of ['nami_(one_piece)', 'one_piece', 'tifa_lockhart', 'final_fantasy_vii', 'frieren_(sousou_no_frieren)', 'sousou_no_frieren', '1girl', '1boy', '2girls', '2boys', 'solo', 'blue_eyes', 'black_hair', 'full_body', 'upper_body', 'from_above', 'from_below', 'from_behind', 'pov', 'indoors', 'outdoors', 'reading', 'eating', 'sandwich', 'exercising', 'warm_lighting', 'night']) expect(names.has(name)).toBe(true);
  });

  it.each([
    ['blue ey', 'blue_eyes'],
    ['blue_eye', 'blue_eyes'],
    ['blue eys', 'blue_eyes'],
    ['nami one', 'nami_(one_piece)'],
    ['one piece', 'one_piece'],
    ['freiren', 'frieren_(sousou_no_frieren)'],
  ])('resolves spaces, underscores, aliases, and misspellings for %s', (query, expected) => {
    const document = language.parse(query);
    expect(language.complete({ document, position: query.length }).items[0]?.canonicalTag).toBe(expected);
  });

  it('ranks exact matches before fuzzy matches and returns category details', () => {
    const source = 'night';
    const result = language.complete({ document: language.parse(source), position: source.length });
    expect(result.items[0]).toMatchObject({ canonicalTag: 'night', matchKind: 'canonical', displayCategory: 'Time' });
  });

  it('never lets popularity overpower exact and prefix match quality', () => {
    language.registerCompletionRecords?.([
      { canonicalName: 'nanami_popular', displayName: 'Nanami Popular', category: 'character', displayCategory: 'Character', semanticGroups: [], aliases: [], usageRank: 1_000_000 },
      { canonicalName: 'blue_shirt_popular', displayName: 'Blue Shirt Popular', category: 'general', displayCategory: 'General', semanticGroups: [], aliases: [], usageRank: 1_000_000 },
    ]);
    expect(language.complete({ document: language.parse('nami'), position: 4 }).items[0]?.canonicalTag).toBe('nami_(one_piece)');
    expect(language.complete({ document: language.parse('blue_hair'), position: 9 }).items[0]?.canonicalTag).toBe('blue_hair');
  });

  it('replaces only the active token and suppresses duplicate insertion', () => {
    const source = 'solo, blue ey, night';
    const document = language.parse(source);
    const completion = language.complete({ document, position: source.indexOf('blue ey') + 7 }).items.find((item) => item.canonicalTag === 'blue_eyes')!;
    expect(language.applyTextEdits(source, [completion.replacement])).toBe('solo, blue_eyes, night');
    expect(language.complete({ document: language.parse('blue_eyes, blue ey'), position: 18 }).items.some((item) => item.canonicalTag === 'blue_eyes')).toBe(false);
  });

  it('inserts a comma without deleting a space-separated tag after the caret', () => {
    const source = '1girl, solo, red_hair cowboy_shot,';
    const caret = source.indexOf('red_hair') + 'red_hair'.length;
    const document = language.parse(source);
    const completion = language.complete({ document, position: caret });
    const item = completion.items.find((candidate) => candidate.canonicalTag === 'red_hair')!;
    expect(completion).toMatchObject({ query: 'red_hair', appendSeparator: true });
    expect(language.applyTextEdits(source, [item.replacement])).toBe('1girl, solo, red_hair, cowboy_shot,');
  });

  it('honors category and result limits', () => {
    const result = language.complete({ document: language.parse(''), position: 0, category: 'character', limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.category === 'character')).toBe(true);
    expect(result.truncated).toBe(true);
  });

  it('rejects malformed, oversized, and prototype-polluting catalog data', () => {
    expect(() => validateCatalog({ schema: 'wrong', id: 'x', version: '1', records: [] })).toThrow();
    expect(() => validateCatalog({ ...WAI_DEVELOPMENT_CATALOG, records: Array.from({ length: PROMPT_LIMITS.maxCatalogRecords + 1 }, () => ({})) })).toThrow();
    const polluted = JSON.parse('{"schema":"zynalo.prompt-catalog/v1","id":"x","version":"1","records":[{"canonicalName":"__proto__","displayName":"x","category":"general","displayCategory":"x","semanticGroups":[],"aliases":[]}]}');
    expect(() => new PromptCatalog(polluted)).toThrow();
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

describe('semantic linting and guidance', () => {
  it('covers the required Nami conflict example without mutating it', () => {
    const source = 'nami one piece, 2girls, solo, blue eye, full_body,\nupper_body';
    const { document, diagnostics } = analyze(source);
    expect(document.source).toBe(source);
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'alias-used' }),
      expect.objectContaining({ code: 'misspelling' }),
      expect.objectContaining({ code: 'missing-associated-series' }),
    ]));
    expect(diagnostics.filter((item) => item.code === 'semantic-conflict').length).toBeGreaterThanOrEqual(2);
    expect(diagnostics.every((item) => item.severity !== 'warning' || !item.blocksGeneration)).toBe(true);
  });

  it.each([
    ['smile, smile', 'duplicate-tag'],
    ['old_fullbody', 'deprecated-tag'],
    ['custom_trigger_xyz', 'unknown-tag'],
    ['1girl, 2girls', 'semantic-conflict'],
    ['1boy, 2boys', 'semantic-conflict'],
    ['2girls, solo', 'semantic-conflict'],
    ['indoors, outdoors', 'semantic-conflict'],
    ['full_body, upper_body', 'semantic-conflict'],
    ['from_above, from_below', 'semantic-conflict'],
    ['nami_(one_piece)', 'missing-associated-series'],
  ])('reports %s as %s', (source, code) => expect(analyze(source).diagnostics.some((item) => item.code === code)).toBe(true));

  it('suggests and fixes a close misspelling without changing surrounding tags', () => {
    const source = 'solo, blue_hairr, night';
    const { document, diagnostics } = analyze(source);
    const item = diagnostics.find((candidate) => candidate.code === 'unknown-tag' && candidate.data?.replacement === 'blue_hair')!;
    expect(item).toMatchObject({ severity: 'warning', message: '“blue_hairr” was not found. Did you mean “blue_hair”?' });
    const fix = language.getQuickFixes(item, document)[0]!;
    expect(fix.label).toBe('Replace “blue_hairr” with “blue_hair”');
    expect(language.applyTextEdits(source, fix.edits)).toBe('solo, blue_hair, night');
  });

  it('does not invent a spelling correction for an unrelated custom tag', () => {
    const { document, diagnostics } = analyze('custom_trigger_xyz');
    const item = diagnostics.find((candidate) => candidate.code === 'unknown-tag')!;
    expect(item.message).not.toContain('Did you mean');
    expect(language.getQuickFixes(item, document)).toEqual([]);
  });

  it('does not report compatible mixed subject counts as a conflict', () => {
    expect(analyze('1girl, 1boy').diagnostics.some((item) => item.code === 'semantic-conflict')).toBe(false);
  });

  it('recognizes the Frieren example and offers only non-blocking composition guidance', () => {
    const source = 'frieren_(sousou_no_frieren), reading, book, library, night, warm_lighting';
    const { document, diagnostics } = analyze(source, 'full');
    expect(document.tokens.every((token) => token.recognized)).toBe(true);
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'missing-associated-series' }));
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'framing-unspecified', severity: 'guidance' }));
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: 'viewpoint-unspecified', severity: 'guidance' }));
    expect(diagnostics.every((item) => !item.blocksGeneration)).toBe(true);
  });

  it('supports Full, Important only, Off, and negative-prompt guidance behavior', () => {
    const document = language.parse('blue_eyes');
    const full = language.lint(document, { guidanceLevel: 'full' }).filter((item) => item.severity === 'guidance');
    const important = language.lint(document, { guidanceLevel: 'important' }).filter((item) => item.severity === 'guidance');
    const off = language.lint(document, { guidanceLevel: 'off' }).filter((item) => item.severity === 'guidance');
    const negative = language.lint(document, { guidanceLevel: 'full', negative: true }).filter((item) => item.severity === 'guidance');
    expect(full.length).toBeGreaterThan(important.length);
    expect(important.map((item) => item.code)).toEqual(expect.arrayContaining(['subject-unspecified', 'framing-unspecified', 'setting-unspecified']));
    expect(off).toHaveLength(0);
    expect(negative).toHaveLength(0);
  });
});

describe('explicit bounded quick fixes', () => {
  function fixFor(source: string, code: string, label?: RegExp) {
    const { document, diagnostics } = analyze(source, 'full');
    const item = diagnostics.find((candidate) => candidate.code === code)!;
    const fixes = language.getQuickFixes(item, document);
    return { document, fix: label ? fixes.find((candidate) => label.test(candidate.label))! : fixes[0]! };
  }

  it.each([
    ['blue eyes', 'alias-used', 'blue_eyes'],
    ['blue eye', 'misspelling', 'blue_eyes'],
    ['smile, smile, night', 'duplicate-tag', 'smile, night'],
    ['nami_(one_piece)', 'missing-associated-series', 'nami_(one_piece), one_piece'],
    ['solo,, blue_eyes', 'empty-entry', 'solo, blue_eyes'],
    ['custom trigger', 'unknown-tag', 'custom_trigger'],
  ])('applies a %s fix without changing unrelated source', (source, code, expected) => {
    const { fix } = fixFor(source, code);
    expect(language.applyTextEdits(source, fix.edits)).toBe(expected);
  });

  it('offers separate choices for both sides of a conflict', () => {
    const source = 'full_body, upper_body, night';
    const { document, diagnostics } = analyze(source);
    const item = diagnostics.find((candidate) => candidate.code === 'semantic-conflict')!;
    const fixes = language.getQuickFixes(item, document);
    expect(fixes.map((fix) => fix.label)).toEqual(expect.arrayContaining(['Remove “full_body”', 'Remove “upper_body”']));
    expect(fixes.map((fix) => language.applyTextEdits(source, fix.edits))).toEqual(expect.arrayContaining([' upper_body, night', 'full_body, night']));
  });

  it('offers explicit subject, framing, viewpoint, and lighting guidance insertions', () => {
    const { document, diagnostics } = analyze('', 'full');
    for (const code of ['subject-unspecified', 'framing-unspecified', 'viewpoint-unspecified', 'lighting-unspecified']) {
      const item = diagnostics.find((candidate) => candidate.code === code)!;
      expect(language.getQuickFixes(item, document).length).toBeGreaterThan(0);
    }
  });

  it('rejects stale or overlapping edits', () => {
    const { fix } = fixFor('blue eye, night', 'misspelling');
    expect(() => language.applyTextEdits('green eye, night', fix.edits)).toThrow(StalePromptEditError);
    const insertion = fixFor('nami_(one_piece)', 'missing-associated-series').fix;
    expect(() => language.applyTextEdits('smile, nami_(one_piece)', insertion.edits)).toThrow(StalePromptEditError);
    expect(() => language.applyTextEdits('abcdef', [
      { range: { from: 1, to: 4 }, insert: '', expectedText: 'bcd', sourceLength: 6 },
      { range: { from: 3, to: 5 }, insert: '', expectedText: 'de', sourceLength: 6 },
    ])).toThrow(StalePromptEditError);
  });
});

describe('bounded performance', () => {
  it('analyzes a near-limit prompt and completes against the fixture responsively', () => {
    const source = `${'1girl, blue_eyes, black_hair, reading, library, warm_lighting, '.repeat(60)}night`.slice(0, 3_900);
    const parseStarted = performance.now(); const document = language.parse(source); const parseMs = performance.now() - parseStarted;
    const lintStarted = performance.now(); language.lint(document, { guidanceLevel: 'full' }); const lintMs = performance.now() - lintStarted;
    const completionStarted = performance.now(); for (let index = 0; index < 100; index += 1) language.complete({ document: language.parse('nami one'), position: 8 }); const completionAverageMs = (performance.now() - completionStarted) / 100;
    expect(parseMs).toBeLessThan(100);
    expect(lintMs).toBeLessThan(100);
    expect(completionAverageMs).toBeLessThan(20);
  });
});
