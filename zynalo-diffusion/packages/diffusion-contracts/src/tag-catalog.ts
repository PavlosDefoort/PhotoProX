export type AutocompleteTagCategory = 'general' | 'artist' | 'copyright' | 'character' | 'meta';

export interface TagAutocompleteRequest {
  query: string;
  limit?: number;
  category?: AutocompleteTagCategory;
  exclude?: string[];
}

export interface TagAutocompleteItem {
  canonicalTag: string;
  category: AutocompleteTagCategory;
  postCount: number;
  matchedAlias?: string;
}

export interface TagAutocompleteResult {
  query: string;
  items: TagAutocompleteItem[];
  truncated: boolean;
}

export interface TagCatalogInfo {
  id: string;
  generatedAt: string;
  recordCount: number;
  source: string;
  offline: true;
}

export interface TagReferenceRequest { tag: string; allowNsfw?: boolean }

export interface TagReferencePreview {
  uri: string;
  postId: number;
  width: number;
  height: number;
  rating: 'general' | 'sensitive' | 'questionable' | 'explicit';
}

export interface TagReference {
  tag: string;
  category?: AutocompleteTagCategory;
  postCount?: number;
  matchedAlias?: string;
  description?: string;
  otherNames: string[];
  preview?: TagReferencePreview;
  unavailableReason?: string;
}

export type TagAutocompleteValidationResult =
  | { success: true; data: TagAutocompleteRequest }
  | { success: false; issues: Array<{ path: string; message: string }> };

const categories = new Set<AutocompleteTagCategory>(['general', 'artist', 'copyright', 'character', 'meta']);
const allowedKeys = new Set(['query', 'limit', 'category', 'exclude']);
function printable(value: string, maximum: number): boolean {
  return value.length > 0 && value.length <= maximum && [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}

export function validateTagAutocompleteRequest(value: unknown): TagAutocompleteValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { success: false, issues: [{ path: '', message: 'Autocomplete request must be an object.' }] };
  }
  const record = value as Record<string, unknown>;
  const issues: Array<{ path: string; message: string }> = [];
  for (const key of Object.keys(record)) if (!allowedKeys.has(key)) issues.push({ path: key, message: 'Unexpected field.' });
  if (typeof record.query !== 'string' || (record.query.length > 0 ? !printable(record.query, 256) : false)) {
    issues.push({ path: 'query', message: 'Query must be at most 256 printable characters.' });
  }
  if (record.limit !== undefined && (typeof record.limit !== 'number' || !Number.isInteger(record.limit) || record.limit < 1 || record.limit > 50)) {
    issues.push({ path: 'limit', message: 'Limit must be an integer from 1 to 50.' });
  }
  if (record.category !== undefined && (typeof record.category !== 'string' || !categories.has(record.category as AutocompleteTagCategory))) {
    issues.push({ path: 'category', message: 'Category is invalid.' });
  }
  if (record.exclude !== undefined && (!Array.isArray(record.exclude) || record.exclude.length > 512 || !record.exclude.every((item) => typeof item === 'string' && printable(item, 256)))) {
    issues.push({ path: 'exclude', message: 'Exclude must contain at most 512 valid tag names.' });
  }
  if (issues.length > 0) return { success: false, issues };
  return {
    success: true,
    data: {
      query: record.query as string,
      ...(record.limit === undefined ? {} : { limit: record.limit as number }),
      ...(record.category === undefined ? {} : { category: record.category as AutocompleteTagCategory }),
      ...(record.exclude === undefined ? {} : { exclude: [...record.exclude as string[]] }),
    },
  };
}

export function validateTagReferenceRequest(value: unknown): TagReferenceRequest | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'tag' && key !== 'allowNsfw') || typeof record.tag !== 'string' || record.tag.trim().length === 0 || !printable(record.tag, 256) || (record.allowNsfw !== undefined && typeof record.allowNsfw !== 'boolean')) return undefined;
  return { tag: record.tag, ...(record.allowNsfw === undefined ? {} : { allowNsfw: record.allowNsfw }) };
}
