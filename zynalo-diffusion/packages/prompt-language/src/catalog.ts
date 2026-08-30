import { PROMPT_LIMITS } from './types';
import type { TagCatalogData, TagMatchKind, TagRecord } from './types';

const canonicalPattern = /^[a-z0-9][a-z0-9_()'+.-]*$/;
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);

function own(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function safeString(value: unknown, max: number, pattern?: RegExp): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !dangerousKeys.has(value) && (!pattern || pattern.test(value));
}

function safeStrings(value: unknown, maxItems: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => safeString(item, PROMPT_LIMITS.maxAliasLength));
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

export function validateCatalog(value: unknown): TagCatalogData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Catalog must be an object.');
  const root = value as Record<string, unknown>;
  if (root.schema !== 'zynalo.prompt-catalog/v1' || !safeString(root.id, 80) || !safeString(root.version, 40) || !Array.isArray(root.records)) {
    throw new TypeError('Catalog header is invalid.');
  }
  if (root.records.length === 0 || root.records.length > PROMPT_LIMITS.maxCatalogRecords) throw new RangeError('Catalog record count is outside the supported limit.');
  const seen = new Set<string>();
  const records: TagRecord[] = root.records.map((candidate, index) => {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) throw new TypeError(`Catalog record ${index} is invalid.`);
    const item = candidate as Record<string, unknown>;
    if (!safeString(item.canonicalName, PROMPT_LIMITS.maxAliasLength, canonicalPattern) || seen.has(item.canonicalName)) throw new TypeError(`Catalog record ${index} has an invalid or duplicate canonical name.`);
    seen.add(item.canonicalName);
    if (!safeString(item.displayName, PROMPT_LIMITS.maxAliasLength) || !['general', 'character', 'copyright', 'artist', 'meta'].includes(String(item.category)) || !safeString(item.displayCategory, 48) || !safeStrings(item.semanticGroups, 16) || !safeStrings(item.aliases, 32)) throw new TypeError(`Catalog record ${index} has invalid required fields.`);
    for (const key of ['commonMisspellings', 'implications', 'conflicts'] as const) if (own(item, key) && !safeStrings(item[key], 32)) throw new TypeError(`Catalog record ${index} has an invalid ${key} list.`);
    if (own(item, 'description') && (typeof item.description !== 'string' || item.description.length > PROMPT_LIMITS.maxDescriptionLength)) throw new TypeError(`Catalog record ${index} has an invalid description.`);
    if (own(item, 'usageRank') && (typeof item.usageRank !== 'number' || !Number.isFinite(item.usageRank) || item.usageRank < 0 || item.usageRank > 1_000_000)) throw new TypeError(`Catalog record ${index} has an invalid usage rank.`);
    if (own(item, 'deprecated') && typeof item.deprecated !== 'boolean') throw new TypeError(`Catalog record ${index} has an invalid deprecated flag.`);
    if (own(item, 'replacement') && !safeString(item.replacement, PROMPT_LIMITS.maxAliasLength, canonicalPattern)) throw new TypeError(`Catalog record ${index} has an invalid replacement.`);
    let associations: TagRecord['associations'];
    if (own(item, 'associations')) {
      if (typeof item.associations !== 'object' || item.associations === null || Array.isArray(item.associations)) throw new TypeError(`Catalog record ${index} has invalid associations.`);
      const association = item.associations as Record<string, unknown>;
      if (Object.keys(association).some((key) => key !== 'characterToCopyright') || !safeStrings(association.characterToCopyright, 16)) throw new TypeError(`Catalog record ${index} has invalid associations.`);
      associations = { characterToCopyright: [...association.characterToCopyright] };
    }
    return {
      canonicalName: item.canonicalName,
      displayName: item.displayName,
      category: item.category as TagRecord['category'],
      displayCategory: item.displayCategory,
      semanticGroups: [...item.semanticGroups],
      aliases: [...item.aliases],
      ...(item.commonMisspellings ? { commonMisspellings: [...item.commonMisspellings as string[]] } : {}),
      ...(item.implications ? { implications: [...item.implications as string[]] } : {}),
      ...(item.conflicts ? { conflicts: [...item.conflicts as string[]] } : {}),
      ...(typeof item.description === 'string' ? { description: item.description } : {}),
      ...(typeof item.usageRank === 'number' ? { usageRank: item.usageRank } : {}),
      ...(typeof item.deprecated === 'boolean' ? { deprecated: item.deprecated } : {}),
      ...(typeof item.replacement === 'string' ? { replacement: item.replacement } : {}),
      ...(associations ? { associations } : {}),
    };
  });
  return { schema: 'zynalo.prompt-catalog/v1', id: root.id, version: root.version, records };
}

export function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '_');
}

export interface CatalogMatch { record: TagRecord; kind: TagMatchKind }

export class PromptCatalog {
  readonly data: TagCatalogData;
  readonly #canonical = new Map<string, TagRecord>();
  readonly #aliases = new Map<string, TagRecord>();
  readonly #misspellings = new Map<string, TagRecord>();
  readonly #records: TagRecord[];

  constructor(data: unknown) {
    this.data = validateCatalog(data);
    this.#records = [...this.data.records];
    for (const record of this.data.records) {
      this.#canonical.set(normalizeTag(record.canonicalName), record);
      for (const alias of record.aliases) if (!this.#aliases.has(normalizeTag(alias))) this.#aliases.set(normalizeTag(alias), record);
      for (const misspelling of record.commonMisspellings ?? []) if (!this.#misspellings.has(normalizeTag(misspelling))) this.#misspellings.set(normalizeTag(misspelling), record);
    }
  }

  match(value: string): CatalogMatch | undefined {
    const normalized = normalizeTag(value);
    const canonical = this.#canonical.get(normalized);
    if (canonical && value.trim().toLowerCase() === canonical.canonicalName) return { record: canonical, kind: 'canonical' };
    const alias = this.#aliases.get(normalized);
    if (alias) return { record: alias, kind: 'alias' };
    const misspelling = this.#misspellings.get(normalized);
    if (misspelling) return { record: misspelling, kind: 'misspelling' };
    return canonical ? { record: canonical, kind: 'alias' } : undefined;
  }

  get(canonicalName: string): TagRecord | undefined { return this.#canonical.get(normalizeTag(canonicalName)); }
  records(): readonly TagRecord[] { return this.#records; }

  registerCompletionRecords(records: readonly TagRecord[]): void {
    for (const record of records) {
      const canonical = normalizeTag(record.canonicalName);
      if (!canonical || canonical.length > PROMPT_LIMITS.maxAliasLength || containsControlCharacter(canonical) || dangerousKeys.has(canonical) || this.#canonical.has(canonical)) continue;
      this.#canonical.set(canonical, record);
      this.#records.push(record);
      for (const aliasValue of record.aliases.slice(0, 32)) {
        const alias = normalizeTag(aliasValue);
        if (alias && alias.length <= PROMPT_LIMITS.maxAliasLength && !containsControlCharacter(alias) && !dangerousKeys.has(alias) && !this.#aliases.has(alias)) this.#aliases.set(alias, record);
      }
    }
  }
}
