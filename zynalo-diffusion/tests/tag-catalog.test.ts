import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { validateTagAutocompleteRequest } from '@zynalo/diffusion-contracts';
import { OfflineTagCatalog } from '../apps/diffusion/src/main/tag-catalog';
import { createDevelopmentPromptLanguageService } from '@zynalo/prompt-language';

let catalog: OfflineTagCatalog;

beforeAll(async () => {
  catalog = await OfflineTagCatalog.open(path.resolve('resources/tag-catalog'));
});

describe('offline Danbooru autocomplete snapshot', () => {
  it('loads the complete vendored snapshot with provenance metadata', () => {
    expect(catalog.info).toMatchObject({ id: 'danbooru-offline-snapshot', recordCount: 186_699, offline: true });
    expect(catalog.info.generatedAt).toBe('2026-08-24T04:12:16Z');
  });

  it('normalizes spaces and underscores and returns category and ranking data', () => {
    expect(catalog.complete({ query: 'hatsune_mi', limit: 5 }).items[0]).toMatchObject({ canonicalTag: 'hatsune_miku', category: 'character', postCount: 144_102 });
    expect(catalog.complete({ query: 'nami (one', limit: 5 }).items[0]).toMatchObject({ canonicalTag: 'nami_(one_piece)', category: 'character' });
    expect(catalog.complete({ query: 'nami', limit: 5 }).items[0]).toMatchObject({ canonicalTag: 'nami_(one_piece)' });
    expect(catalog.complete({ query: 'blue_hair', limit: 5 }).items[0]).toMatchObject({ canonicalTag: 'blue_hair' });
  });

  it('resolves aliases, filters categories, excludes duplicates, and bounds results', () => {
    expect(catalog.complete({ query: 'boys on', limit: 5 }).items[0]).toMatchObject({ canonicalTag: 'male_focus', matchedAlias: 'boys_only' });
    const artists = catalog.complete({ query: 'a', category: 'artist', exclude: ['ask_(askzy)'], limit: 7 });
    expect(artists.items).toHaveLength(7);
    expect(artists.items.every((item) => item.category === 'artist' && item.canonicalTag !== 'ask_(askzy)')).toBe(true);
    expect(artists.truncated).toBe(true);
  });

  it('looks up exact canonical names and aliases with their categories', () => {
    expect(catalog.lookup('hatsune miku')).toMatchObject({ canonicalTag: 'hatsune_miku', category: 'character', postCount: 144_102 });
    expect(catalog.lookup('boys only')).toMatchObject({ canonicalTag: 'male_focus', category: 'general', matchedAlias: 'boys_only' });
    expect(catalog.lookup('not_a_real_snapshot_tag')).toBeUndefined();
  });

  it('answers common prefix queries responsively after loading', () => {
    const started = performance.now();
    for (let index = 0; index < 100; index += 1) catalog.complete({ query: 'blue_', limit: 20 });
    expect((performance.now() - started) / 100).toBeLessThan(20);
  });

  it('rejects malformed snapshot rows and metadata mismatches', async () => {
    expect(() => OfflineTagCatalog.fromText('tag,9,1,\n', { generated_at: '2026-01-01T00:00:00Z', tag_count_total: 1 })).toThrow();
    const meta = JSON.parse(await readFile(path.resolve('resources/tag-catalog/meta.json'), 'utf8')) as Record<string, unknown>;
    expect(() => OfflineTagCatalog.fromText('tag,0,1,\n', meta)).toThrow(/declares/);
  });
});

describe('autocomplete IPC validation and language overlay', () => {
  it('accepts only bounded narrow requests', () => {
    expect(validateTagAutocompleteRequest({ query: 'blue e', limit: 20, category: 'general', exclude: ['solo'] }).success).toBe(true);
    expect(validateTagAutocompleteRequest({ query: 'x', limit: 51 }).success).toBe(false);
    expect(validateTagAutocompleteRequest({ query: 'x', extra: true }).success).toBe(false);
    expect(validateTagAutocompleteRequest({ query: 'bad\nquery' }).success).toBe(false);
  });

  it('recognizes safely registered snapshot records without replacing curated semantics', () => {
    const language = createDevelopmentPromptLanguageService();
    language.registerCompletionRecords([{ canonicalName: 'snapshot_only_tag', displayName: 'snapshot_only_tag', category: 'general', displayCategory: 'General', semanticGroups: [], aliases: ['snapshot alias'] }]);
    expect(language.parse('snapshot_only_tag').tokens[0]).toMatchObject({ recognized: true, canonicalTag: 'snapshot_only_tag' });
    expect(language.parse('snapshot alias').tokens[0]).toMatchObject({ recognized: true, canonicalTag: 'snapshot_only_tag', matchKind: 'alias' });
    expect(language.explain(language.parse('blue_eyes').tokens[0]!).meaning).toContain('blue');
  });
});
