import type { GuidanceLevel, PromptDiagnostic, PromptDocument, PromptLanguageService, PromptModelProfile } from '@zynalo/prompt-language';
import type { TagAutocompleteRequest, TagAutocompleteResult, TagCatalogInfo, TagReference, TagReferenceRequest } from '@zynalo/diffusion-contracts';

export interface PromptWorkspaceState {
  positive: string;
  negative: string;
  guidanceLevel: GuidanceLevel;
  problemsVisible: boolean;
  allowNsfwPreview: boolean;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PromptAnalysis {
  document: PromptDocument;
  diagnostics: PromptDiagnostic[];
}

const STORAGE_KEY = 'zynalo.tags-workspace.v1';
const defaults: PromptWorkspaceState = { positive: '', negative: '', guidanceLevel: 'full', problemsVisible: true, allowNsfwPreview: false };

function displayCategory(category: TagReference['category']): string {
  return category ? category[0]!.toUpperCase() + category.slice(1) : 'Unknown tag';
}

function validState(value: unknown): value is PromptWorkspaceState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).every((key) => ['positive', 'negative', 'guidanceLevel', 'problemsVisible', 'allowNsfwPreview'].includes(key)) &&
    typeof record.positive === 'string' && record.positive.length <= 4_000 &&
    typeof record.negative === 'string' && record.negative.length <= 4_000 &&
    ['full', 'important', 'off'].includes(String(record.guidanceLevel)) && typeof record.problemsVisible === 'boolean' && (record.allowNsfwPreview === undefined || typeof record.allowNsfwPreview === 'boolean');
}

export class PromptWorkspaceService {
  readonly language: PromptLanguageService;
  readonly #storage: KeyValueStorage;
  readonly #autocomplete: (request: TagAutocompleteRequest) => Promise<TagAutocompleteResult>;
  readonly #catalogInfo: () => Promise<TagCatalogInfo>;
  readonly #tagReference: (request: TagReferenceRequest) => Promise<TagReference>;

  constructor(language: PromptLanguageService, storage: KeyValueStorage, autocomplete: (request: TagAutocompleteRequest) => Promise<TagAutocompleteResult> = async (request) => ({ query: request.query, items: [], truncated: false }), catalogInfo: () => Promise<TagCatalogInfo> = async () => ({ id: 'curated-only', generatedAt: '1970-01-01T00:00:00.000Z', recordCount: 0, source: 'Curated catalog only', offline: true }), tagReference: (request: TagReferenceRequest) => Promise<TagReference> = async (request) => ({ tag: request.tag, otherNames: [], unavailableReason: 'Online references are unavailable.' })) {
    this.language = language; this.#storage = storage; this.#autocomplete = autocomplete; this.#catalogInfo = catalogInfo; this.#tagReference = tagReference;
  }

  completeTags = async (request: TagAutocompleteRequest): Promise<TagAutocompleteResult> => {
    const result = await this.#autocomplete(request);
    this.language.registerCompletionRecords?.(result.items.map((item) => ({
      canonicalName: item.canonicalTag,
      displayName: item.canonicalTag,
      category: item.category,
      displayCategory: item.category[0]!.toUpperCase() + item.category.slice(1),
      semanticGroups: [],
      aliases: item.matchedAlias ? [item.matchedAlias] : [],
      description: `Danbooru tag used on ${item.postCount.toLocaleString('en-US')} posts in the optional local snapshot.`,
      usageRank: Math.min(1_000_000, Math.round(Math.log10(item.postCount + 1) * 10_000)),
    })));
    return result;
  };

  getCatalogInfo = (): Promise<TagCatalogInfo> => this.#catalogInfo();
  getTagReference = async (tag: string, allowNsfw: boolean): Promise<TagReference> => {
    const reference = await this.#tagReference({ tag, allowNsfw });
    if (reference.category) {
      this.language.registerCompletionRecords?.([{
        canonicalName: reference.tag,
        displayName: reference.tag,
        category: reference.category,
        displayCategory: displayCategory(reference.category),
        semanticGroups: [],
        aliases: reference.matchedAlias ? [reference.matchedAlias] : [],
        ...(reference.description ? { description: reference.description } : reference.postCount === undefined ? {} : { description: `Danbooru tag used on ${reference.postCount.toLocaleString('en-US')} posts in the optional local snapshot.` }),
        ...(reference.postCount === undefined ? {} : { usageRank: Math.min(1_000_000, Math.round(Math.log10(reference.postCount + 1) * 10_000)) }),
      }]);
    }
    return reference;
  };

  load(): PromptWorkspaceState {
    try {
      const serialized = this.#storage.getItem(STORAGE_KEY);
      if (!serialized) return { ...defaults };
      const parsed: unknown = JSON.parse(serialized);
      if (validState(parsed)) return { ...defaults, ...parsed };
    } catch {
      // Corrupt drafts must never prevent renderer startup.
    }
    this.#storage.removeItem(STORAGE_KEY);
    return { ...defaults };
  }

  save(state: PromptWorkspaceState): void {
    if (!validState(state)) throw new TypeError('Prompt workspace state is invalid.');
    this.#storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  analyze(source: string, guidanceLevel: GuidanceLevel, profile: PromptModelProfile | undefined, negative: boolean): PromptAnalysis {
    const document = this.language.parse(source);
    return { document, diagnostics: this.language.lint(document, { guidanceLevel, ...(profile ? { profile } : {}), negative }) };
  }
}
