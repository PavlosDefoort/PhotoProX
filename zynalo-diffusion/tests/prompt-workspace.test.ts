import { describe, expect, it } from 'vitest';
import { createDevelopmentPromptLanguageService } from '@zynalo/prompt-language';
import type { KeyValueStorage } from '../apps/diffusion/src/renderer/promptWorkspace';
import { PromptWorkspaceService } from '../apps/diffusion/src/renderer/promptWorkspace';

class MemoryStorage implements KeyValueStorage {
  value: string | null = null;
  getItem() { return this.value; }
  setItem(_key: string, value: string) { this.value = value; }
  removeItem() { this.value = null; }
}

describe('Tags workspace persistence and application service', () => {
  it('persists only bounded drafts and editor preferences independently', () => {
    const storage = new MemoryStorage();
    const service = new PromptWorkspaceService(createDevelopmentPromptLanguageService(), storage);
    const state = { positive: '1girl, blue_eyes', negative: 'blurry', guidanceLevel: 'important' as const, problemsVisible: false, allowNsfwPreview: true };
    service.save(state);
    expect(service.load()).toEqual(state);
    expect(Object.keys(JSON.parse(storage.value!))).toEqual(['positive', 'negative', 'guidanceLevel', 'problemsVisible', 'allowNsfwPreview']);
  });

  it.each(['not json', '{"positive":7}', '{"positive":"x","negative":"","guidanceLevel":"all","problemsVisible":true}'])('recovers safely from corrupt state: %s', (value) => {
    const storage = new MemoryStorage(); storage.value = value;
    const service = new PromptWorkspaceService(createDevelopmentPromptLanguageService(), storage);
    expect(service.load()).toEqual({ positive: '', negative: '', guidanceLevel: 'full', problemsVisible: true, allowNsfwPreview: false });
    expect(storage.value).toBeNull();
  });

  it('keeps positive and negative analysis independent and warnings non-blocking', () => {
    const service = new PromptWorkspaceService(createDevelopmentPromptLanguageService(), new MemoryStorage());
    const positive = service.analyze('2girls, solo', 'off', undefined, false);
    const negative = service.analyze('custom_negative_trigger', 'off', undefined, true);
    expect(positive.diagnostics.some((item) => item.code === 'semantic-conflict')).toBe(true);
    expect(negative.diagnostics.some((item) => item.code === 'unknown-tag')).toBe(true);
    expect([...positive.diagnostics, ...negative.diagnostics].every((item) => !item.blocksGeneration)).toBe(true);
  });

  it('registers category data returned by an exact tag reference lookup', async () => {
    const service = new PromptWorkspaceService(
      createDevelopmentPromptLanguageService(),
      new MemoryStorage(),
      undefined,
      undefined,
      async () => ({ tag: 'snapshot_only_character', category: 'character', postCount: 42, otherNames: [] }),
    );
    await service.getTagReference('snapshot_only_character', false);
    expect(service.language.parse('snapshot_only_character').tokens[0]).toMatchObject({ recognized: true, category: 'character', displayCategory: 'Character' });
  });
});
