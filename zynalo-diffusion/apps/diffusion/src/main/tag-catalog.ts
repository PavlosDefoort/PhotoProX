import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AutocompleteTagCategory,
  TagAutocompleteItem,
  TagAutocompleteRequest,
  TagAutocompleteResult,
  TagCatalogInfo,
} from '@zynalo/diffusion-contracts';

interface IndexedTag {
  canonicalTag: string;
  category: AutocompleteTagCategory;
  postCount: number;
  aliases: string[];
}

interface AliasEntry { alias: string; recordIndex: number }

interface SnapshotMetadata {
  generated_at: string;
  tag_count_total: number;
  source?: string;
}

const categoryById: Readonly<Record<number, AutocompleteTagCategory | undefined>> = Object.freeze({
  0: 'general',
  1: 'artist',
  3: 'copyright',
  4: 'character',
  5: 'meta',
});

export function normalizeAutocompleteTag(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '_');
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value); value = '';
    } else value += character;
  }
  if (quoted) throw new TypeError('Tag snapshot contains an unterminated quoted field.');
  values.push(value);
  return values;
}

function lowerBound<T>(values: readonly T[], query: string, name: (value: T) => string): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (name(values[middle]!) < query) low = middle + 1;
    else high = middle;
  }
  return low;
}

function validMetadata(value: unknown): value is SnapshotMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.generated_at === 'string' && !Number.isNaN(Date.parse(item.generated_at)) &&
    typeof item.tag_count_total === 'number' && Number.isInteger(item.tag_count_total) && item.tag_count_total > 0;
}

export class OfflineTagCatalog {
  readonly #records: IndexedTag[];
  readonly #canonicalIndex: number[];
  readonly #aliasIndex: AliasEntry[];
  readonly #canonicalByName: Map<string, number>;
  readonly #aliasByName: Map<string, number>;
  readonly info: TagCatalogInfo;

  private constructor(records: IndexedTag[], metadata: SnapshotMetadata) {
    if (records.length !== metadata.tag_count_total) throw new TypeError(`Tag snapshot metadata declares ${metadata.tag_count_total} records but the CSV contains ${records.length}.`);
    this.#records = records;
    this.#canonicalIndex = records.map((_record, index) => index).sort((left, right) => records[left]!.canonicalTag.localeCompare(records[right]!.canonicalTag));
    this.#aliasIndex = records.flatMap((record, recordIndex) => record.aliases.map((alias) => ({ alias, recordIndex }))).sort((left, right) => left.alias.localeCompare(right.alias));
    this.#canonicalByName = new Map(records.map((record, index) => [record.canonicalTag, index]));
    this.#aliasByName = new Map(this.#aliasIndex.map((entry) => [entry.alias, entry.recordIndex]));
    this.info = Object.freeze({
      id: 'danbooru-offline-snapshot',
      generatedAt: metadata.generated_at,
      recordCount: records.length,
      source: metadata.source ?? 'PYU224/tagdb-updater snapshot sourced from the Danbooru public API',
      offline: true,
    });
  }

  static fromText(csv: string, metadataValue: unknown): OfflineTagCatalog {
    if (!validMetadata(metadataValue)) throw new TypeError('Tag snapshot metadata is invalid.');
    const seen = new Set<string>();
    const records: IndexedTag[] = [];
    for (const [lineIndex, rawLine] of csv.split(/\r?\n/).entries()) {
      if (rawLine.length === 0) continue;
      const columns = parseCsvRow(rawLine);
      if (columns.length !== 4) throw new TypeError(`Tag snapshot row ${lineIndex + 1} must contain four columns.`);
      const canonicalTag = normalizeAutocompleteTag(columns[0]!);
      const categoryId = Number(columns[1]);
      const category = categoryById[categoryId];
      const postCount = Number(columns[2]);
      if (!canonicalTag || canonicalTag.length > 256 || containsControlCharacter(canonicalTag) || seen.has(canonicalTag)) throw new TypeError(`Tag snapshot row ${lineIndex + 1} has an invalid or duplicate name.`);
      if (!category || !Number.isSafeInteger(postCount) || postCount < 0) throw new TypeError(`Tag snapshot row ${lineIndex + 1} has an invalid category or post count.`);
      seen.add(canonicalTag);
      const aliases = columns[3]!.split(',').map(normalizeAutocompleteTag).filter((alias, index, all) => alias.length > 0 && alias.length <= 256 && !containsControlCharacter(alias) && all.indexOf(alias) === index);
      records.push({ canonicalTag, category, postCount, aliases });
    }
    return new OfflineTagCatalog(records, metadataValue);
  }

  static async open(resourceRoot: string): Promise<OfflineTagCatalog> {
    const [csv, serializedMetadata] = await Promise.all([
      readFile(path.join(resourceRoot, 'danbooru.csv'), 'utf8'),
      readFile(path.join(resourceRoot, 'meta.json'), 'utf8'),
    ]);
    let metadata: unknown;
    try { metadata = JSON.parse(serializedMetadata); }
    catch { throw new TypeError('Tag snapshot metadata is not valid JSON.'); }
    return OfflineTagCatalog.fromText(csv, metadata);
  }

  lookup(value: string): TagAutocompleteItem | undefined {
    const query = normalizeAutocompleteTag(value);
    const canonicalIndex = this.#canonicalByName.get(query);
    const recordIndex = canonicalIndex ?? this.#aliasByName.get(query);
    if (recordIndex === undefined) return undefined;
    const record = this.#records[recordIndex]!;
    return {
      canonicalTag: record.canonicalTag,
      category: record.category,
      postCount: record.postCount,
      ...(canonicalIndex === undefined ? { matchedAlias: query } : {}),
    };
  }

  complete(request: TagAutocompleteRequest): TagAutocompleteResult {
    const query = normalizeAutocompleteTag(request.query);
    const limit = request.limit ?? 20;
    const excluded = new Set((request.exclude ?? []).map(normalizeAutocompleteTag));
    const matches = new Map<number, { score: number; matchedAlias?: string }>();
    const consider = (recordIndex: number, score: number, matchedAlias?: string) => {
      const record = this.#records[recordIndex]!;
      if (excluded.has(record.canonicalTag) || (request.category && request.category !== record.category)) return;
      const previous = matches.get(recordIndex);
      if (!previous || score > previous.score) matches.set(recordIndex, { score, ...(matchedAlias ? { matchedAlias } : {}) });
    };

    if (query.length === 0) {
      for (let recordIndex = 0; recordIndex < this.#records.length && matches.size <= limit; recordIndex += 1) consider(recordIndex, this.#records[recordIndex]!.postCount);
    } else {
      const canonicalStart = lowerBound(this.#canonicalIndex, query, (recordIndex) => this.#records[recordIndex]!.canonicalTag);
      for (let index = canonicalStart; index < this.#canonicalIndex.length; index += 1) {
        const recordIndex = this.#canonicalIndex[index]!;
        const record = this.#records[recordIndex]!;
        if (!record.canonicalTag.startsWith(query)) break;
        consider(recordIndex, (record.canonicalTag === query ? 2_000_000_000 : 1_000_000_000) + record.postCount);
      }
      const aliasStart = lowerBound(this.#aliasIndex, query, (entry) => entry.alias);
      for (let index = aliasStart; index < this.#aliasIndex.length; index += 1) {
        const entry = this.#aliasIndex[index]!;
        if (!entry.alias.startsWith(query)) break;
        const record = this.#records[entry.recordIndex]!;
        consider(entry.recordIndex, (entry.alias === query ? 1_500_000_000 : 500_000_000) + record.postCount, entry.alias);
      }
    }

    const ranked = [...matches.entries()].sort((left, right) => right[1].score - left[1].score || this.#records[left[0]]!.canonicalTag.localeCompare(this.#records[right[0]]!.canonicalTag));
    const items: TagAutocompleteItem[] = ranked.slice(0, limit).map(([recordIndex, match]) => {
      const record = this.#records[recordIndex]!;
      return { canonicalTag: record.canonicalTag, category: record.category, postCount: record.postCount, ...(match.matchedAlias ? { matchedAlias: match.matchedAlias } : {}) };
    });
    return { query, items, truncated: ranked.length > limit };
  }
}
