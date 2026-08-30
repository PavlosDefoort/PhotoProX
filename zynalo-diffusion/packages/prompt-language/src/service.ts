import { normalizeTag, PromptCatalog } from './catalog';
import { PROMPT_LIMITS } from './types';
import type {
  CompletionItem,
  CompletionRequest,
  CompletionResult,
  PromptDiagnostic,
  PromptDocument,
  PromptLanguageService,
  PromptLintContext,
  PromptQuickFix,
  PromptSyntaxNode,
  PromptTextEdit,
  PromptToken,
  TagExplanation,
  TextRange,
} from './types';

const exclusiveGroups = new Set(['female-count', 'male-count', 'setting', 'framing', 'viewpoint', 'viewpoint-direction', 'eye-color', 'hair-color']);
const unsupportedSyntaxCharacters = new Set(['{', '}', '[', ']', '|']);

function trimRange(source: string, range: TextRange): TextRange {
  let { from, to } = range;
  while (from < to && /\s/.test(source[from]!)) from += 1;
  while (to > from && /\s/.test(source[to - 1]!)) to -= 1;
  return { from, to };
}

function diagnostic(code: string, severity: PromptDiagnostic['severity'], message: string, range: TextRange, options: Partial<PromptDiagnostic> = {}): PromptDiagnostic {
  return { id: `${code}:${range.from}:${range.to}`, code, severity, message, range, blocksGeneration: false, ...options };
}

function isEscaped(source: string, position: number): boolean {
  let slashes = 0;
  for (let index = position - 1; index >= 0 && source[index] === '\\'; index -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function outerExpression(source: string, range: TextRange): { closed: boolean; colon?: number; maxDepth: number; malformedAt?: number } {
  let depth = 0;
  let maxDepth = 0;
  let colon: number | undefined;
  for (let index = range.from; index < range.to; index += 1) {
    const character = source[index]!;
    if (isEscaped(source, index)) continue;
    if (character === '(') { depth += 1; maxDepth = Math.max(maxDepth, depth); }
    else if (character === ')') {
      depth -= 1;
      if (depth < 0) return { closed: false, maxDepth, malformedAt: index };
      if (depth === 0 && index !== range.to - 1) return { closed: false, maxDepth, malformedAt: index };
    } else if (character === ':' && depth === 1) colon = index;
  }
  return { closed: depth === 0 && source[range.to - 1] === ')', ...(colon === undefined ? {} : { colon }), maxDepth };
}

function splitEntries(source: string): { entries: TextRange[]; separators: TextRange[] } {
  const entries: TextRange[] = [];
  const separators: TextRange[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (isEscaped(source, index)) continue;
    if (character === '(') depth += 1;
    else if (character === ')' && depth > 0) depth -= 1;
    else if (character === ',' && depth === 0) {
      entries.push({ from: start, to: index });
      separators.push({ from: index, to: index + 1 });
      start = index + 1;
    }
  }
  entries.push({ from: start, to: source.length });
  return { entries, separators };
}

function tokenRemovalEdit(source: string, token: PromptToken): PromptTextEdit {
  const range = { ...token.entryRange };
  if (source[range.to] === ',') range.to += 1;
  else if (range.from > 0 && source[range.from - 1] === ',') range.from -= 1;
  return { range, insert: '', expectedText: source.slice(range.from, range.to), sourceLength: source.length };
}

function insertionEdit(source: string, tag: string): PromptTextEdit {
  const insert = source.trim().length === 0 ? tag : `${source.endsWith(',') ? ' ' : ', '}${tag}`;
  return { range: { from: source.length, to: source.length }, insert, expectedText: '', sourceLength: source.length };
}

function boundedDistance(left: string, right: string, maximum: number): number {
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= right.length; j += 1) {
      const value = Math.min((current[j - 1] ?? 0) + 1, (previous[j] ?? 0) + 1, (previous[j - 1] ?? 0) + (left[i - 1] === right[j - 1] ? 0 : 1));
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }
  return previous[right.length] ?? maximum + 1;
}

function completionScore(query: string, canonical: string, aliases: string[], misspellings: string[], usageRank: number): { score: number; kind: CompletionItem['matchKind'] } | undefined {
  // Match quality must dominate popularity. Dynamic snapshot records can have a
  // usage rank up to 1,000,000, so small match bonuses are not sufficient.
  const ranked = (tier: number) => tier * 2_000_000 + usageRank;
  if (query.length === 0) return { score: usageRank, kind: 'canonical' };
  if (canonical === query) return { score: ranked(10), kind: 'canonical' };
  if (aliases.includes(query)) return { score: ranked(9), kind: 'alias' };
  if (misspellings.includes(query)) return { score: ranked(8), kind: 'misspelling' };
  if (canonical.startsWith(query)) return { score: ranked(7), kind: 'canonical' };
  if (aliases.some((alias) => alias.startsWith(query))) return { score: ranked(6), kind: 'alias' };
  if (canonical.includes(query) || aliases.some((alias) => alias.includes(query))) return { score: ranked(4), kind: 'fuzzy' };
  const maximum = query.length < 5 ? 1 : query.length < 9 ? 2 : 3;
  const distance = Math.min(boundedDistance(query, canonical, maximum), ...aliases.map((alias) => boundedDistance(query, alias, maximum)), ...misspellings.map((misspelling) => boundedDistance(query, misspelling, maximum)));
  return distance <= maximum ? { score: ranked(3) - distance * 100_000, kind: 'fuzzy' } : undefined;
}

function spellingSuggestion(catalog: PromptCatalog, value: string): string | undefined {
  const query = normalizeTag(value);
  if (query.length < 4) return undefined;
  const maximum = query.length < 8 ? 1 : 2;
  let best: { canonical: string; distance: number; usageRank: number } | undefined;
  for (const record of catalog.records()) {
    const candidates = [record.canonicalName, ...record.aliases, ...(record.commonMisspellings ?? [])].map(normalizeTag);
    const distance = Math.min(...candidates.map((candidate) => boundedDistance(query, candidate, maximum)));
    if (distance > maximum) continue;
    const usageRank = record.usageRank ?? 0;
    if (!best || distance < best.distance || (distance === best.distance && usageRank > best.usageRank) || (distance === best.distance && usageRank === best.usageRank && record.canonicalName.localeCompare(best.canonical) < 0)) {
      best = { canonical: record.canonicalName, distance, usageRank };
    }
  }
  return best?.canonical;
}

export class StalePromptEditError extends Error {
  constructor() { super('The prompt changed after this fix was created. Re-run analysis before applying it.'); this.name = 'StalePromptEditError'; }
}

export class BooruPromptLanguageService implements PromptLanguageService {
  readonly catalog: PromptCatalog;
  constructor(catalog: PromptCatalog) { this.catalog = catalog; }

  registerCompletionRecords(records: readonly import('./types').TagRecord[]): void { this.catalog.registerCompletionRecords(records); }

  parse(source: string): PromptDocument {
    const tokens: PromptToken[] = [];
    const syntax: PromptSyntaxNode[] = [];
    const diagnostics: PromptDiagnostic[] = [];
    let analysisTruncated = false;
    if (source.length > PROMPT_LIMITS.maxCharacters) {
      diagnostics.push(diagnostic('prompt-too-long', 'error', `Prompt exceeds the ${PROMPT_LIMITS.maxCharacters}-character analysis and generation limit. The source is preserved.`, { from: PROMPT_LIMITS.maxCharacters, to: source.length }, { blocksGeneration: true }));
      analysisTruncated = true;
    }
    const analyzedSource = source.slice(0, PROMPT_LIMITS.maxCharacters);
    const { entries, separators } = splitEntries(analyzedSource);
    syntax.push(...separators.map((range) => ({ kind: 'separator' as const, range })));
    for (const entryRange of entries.slice(0, PROMPT_LIMITS.maxTokens)) {
      syntax.push({ kind: 'entry', range: entryRange });
      const trimmed = trimRange(analyzedSource, entryRange);
      if (trimmed.from === trimmed.to) {
        if (analyzedSource.length > 0) {
          const range = analyzedSource[trimmed.to] === ',' ? { from: trimmed.to, to: trimmed.to + 1 } : { from: Math.max(0, trimmed.from - 1), to: trimmed.from };
          diagnostics.push(diagnostic('empty-entry', 'warning', 'Empty entry between commas has no effect.', range, { data: { entryFrom: entryRange.from, entryTo: entryRange.to } }));
        }
        continue;
      }
      let tokenRange = trimmed;
      let syntaxKind: PromptToken['syntaxKind'] = [...analyzedSource.slice(trimmed.from, trimmed.to)].some((character) => unsupportedSyntaxCharacters.has(character)) ? 'unknown-syntax' : 'tag';
      let weight: number | undefined;
      if (analyzedSource[trimmed.from] === '(' && !isEscaped(analyzedSource, trimmed.from)) {
        const expression = outerExpression(analyzedSource, trimmed);
        if (expression.maxDepth > PROMPT_LIMITS.maxNestingDepth) {
          diagnostics.push(diagnostic('excessive-nesting', 'error', `Parenthesis nesting exceeds the analyzed depth of ${PROMPT_LIMITS.maxNestingDepth}.`, trimmed, { blocksGeneration: true }));
        }
        if (!expression.closed) {
          const weighted = analyzedSource.slice(trimmed.from, trimmed.to).includes(':');
          diagnostics.push(diagnostic(weighted ? 'unclosed-weight' : 'malformed-parentheses', 'error', weighted ? 'Weighted expression is not closed.' : 'Parenthesized emphasis is structurally malformed.', trimmed, { blocksGeneration: true }));
          syntaxKind = 'unknown-syntax';
          syntax.push({ kind: 'unsupported', range: trimmed, depth: expression.maxDepth });
        } else {
          syntax.push({ kind: expression.colon === undefined ? 'emphasis' : 'weight', range: trimmed, depth: expression.maxDepth });
          if (expression.colon !== undefined) {
            tokenRange = trimRange(analyzedSource, { from: trimmed.from + 1, to: expression.colon });
            const weightRange = trimRange(analyzedSource, { from: expression.colon + 1, to: trimmed.to - 1 });
            const rawWeight = analyzedSource.slice(weightRange.from, weightRange.to);
            const parsedWeight = Number(rawWeight);
            if (rawWeight.length === 0 || Number.isNaN(parsedWeight)) diagnostics.push(diagnostic('invalid-weight', 'error', 'Weight must be a numeric value.', weightRange, { blocksGeneration: true }));
            else if (!Number.isFinite(parsedWeight)) diagnostics.push(diagnostic('non-finite-weight', 'error', 'Weight must be finite.', weightRange, { blocksGeneration: true }));
            else if (parsedWeight < PROMPT_LIMITS.minAnalyzedWeight || parsedWeight > PROMPT_LIMITS.maxAnalyzedWeight) diagnostics.push(diagnostic('weight-out-of-range', 'error', `Weight is outside Zynalo’s safe analyzed range of ${PROMPT_LIMITS.minAnalyzedWeight} to ${PROMPT_LIMITS.maxAnalyzedWeight}.`, weightRange, { blocksGeneration: true }));
            else weight = parsedWeight;
            syntaxKind = 'weighted-tag';
          } else {
            tokenRange = trimRange(analyzedSource, { from: trimmed.from + 1, to: trimmed.to - 1 });
            while (analyzedSource[tokenRange.from] === '(' && analyzedSource[tokenRange.to - 1] === ')') {
              const nested = outerExpression(analyzedSource, tokenRange);
              if (!nested.closed || nested.colon !== undefined) break;
              tokenRange = trimRange(analyzedSource, { from: tokenRange.from + 1, to: tokenRange.to - 1 });
            }
          }
        }
      } else {
        let depth = 0;
        let maxDepth = 0;
        let malformed = false;
        for (let position = trimmed.from; position < trimmed.to; position += 1) {
          if (isEscaped(analyzedSource, position)) continue;
          if (analyzedSource[position] === '(') { depth += 1; maxDepth = Math.max(maxDepth, depth); }
          if (analyzedSource[position] === ')') { depth -= 1; if (depth < 0) malformed = true; }
        }
        if (depth !== 0 || malformed) diagnostics.push(diagnostic('malformed-parentheses', 'error', 'Parentheses are structurally malformed.', trimmed, { blocksGeneration: true }));
        if (maxDepth > PROMPT_LIMITS.maxNestingDepth) diagnostics.push(diagnostic('excessive-nesting', 'error', `Parenthesis nesting exceeds the analyzed depth of ${PROMPT_LIMITS.maxNestingDepth}.`, trimmed, { blocksGeneration: true }));
      }
      const raw = analyzedSource.slice(tokenRange.from, tokenRange.to);
      const match = syntaxKind === 'unknown-syntax' ? undefined : this.catalog.match(raw);
      tokens.push({
        id: `token:${tokenRange.from}:${tokenRange.to}`,
        raw,
        normalized: normalizeTag(raw),
        ...(match ? { canonicalTag: match.record.canonicalName, category: match.record.category, displayCategory: match.record.displayCategory } : {}),
        range: tokenRange,
        entryRange,
        ...(weight === undefined ? {} : { weight }),
        syntaxKind,
        recognized: Boolean(match),
        matchKind: match?.kind ?? 'unknown',
      });
    }
    if (entries.length > PROMPT_LIMITS.maxTokens) {
      const overflow = entries[PROMPT_LIMITS.maxTokens]!;
      diagnostics.push(diagnostic('too-many-tokens', 'error', `Prompt exceeds the ${PROMPT_LIMITS.maxTokens}-token analysis limit. The source is preserved.`, { from: overflow.from, to: analyzedSource.length }, { blocksGeneration: true }));
      analysisTruncated = true;
    }
    return { source, tokens, syntax, diagnostics: diagnostics.slice(0, PROMPT_LIMITS.maxDiagnostics), analysisTruncated };
  }

  complete(request: CompletionRequest): CompletionResult {
    const position = Math.max(0, Math.min(request.position, request.document.source.length));
    const active = request.document.tokens.find((token) => position >= token.range.from && position <= token.range.to);
    let range = active?.range;
    if (!range) {
      const before = request.document.source.lastIndexOf(',', Math.max(0, position - 1));
      const after = request.document.source.indexOf(',', position);
      range = trimRange(request.document.source, { from: before + 1, to: after < 0 ? request.document.source.length : after });
    }
    let appendSeparator = false;
    if (active && position < active.range.to) {
      const afterCaret = request.document.source.slice(position, active.range.to);
      const leadingWhitespace = afterCaret.match(/^\s*/)?.[0].length ?? 0;
      const textAfterWhitespace = afterCaret.slice(leadingWhitespace);
      const textBeforeCaret = request.document.source.slice(active.range.from, position);
      if (textAfterWhitespace.trim().length > 0 && (leadingWhitespace > 0 || /\s$/.test(textBeforeCaret))) {
        range = { from: active.range.from, to: position + leadingWhitespace };
        appendSeparator = true;
      }
    }
    const query = normalizeTag(request.document.source.slice(range.from, Math.min(position, range.to)));
    const present = new Set(request.document.tokens.filter((token) => token !== active).map((token) => token.canonicalTag ?? token.normalized));
    const limit = Math.max(1, Math.min(request.limit ?? PROMPT_LIMITS.maxCompletionResults, PROMPT_LIMITS.maxCompletionResults));
    const candidates: CompletionItem[] = [];
    for (const record of this.catalog.records()) {
      if (request.category && record.category !== request.category) continue;
      const canonical = normalizeTag(record.canonicalName);
      const aliases = record.aliases.map(normalizeTag);
      const misspellings = (record.commonMisspellings ?? []).map(normalizeTag);
      const matched = completionScore(query, canonical, aliases, misspellings, record.usageRank ?? 0);
      if (!matched) continue;
      const alreadyPresent = present.has(canonical);
      if (alreadyPresent && !request.includeDuplicates) continue;
      const associated = record.associations?.characterToCopyright?.[0];
      candidates.push({
        canonicalTag: record.canonicalName,
        displayName: record.displayName,
        category: record.category,
        displayCategory: record.displayCategory,
        ...(record.description ? { description: record.description } : {}),
        ...(associated ? { detail: `${record.displayCategory} · ${titleForTag(associated)}` } : { detail: record.displayCategory }),
        matchKind: matched.kind,
        score: matched.score,
        alreadyPresent,
        replacement: { range, insert: `${record.canonicalName}${appendSeparator ? ', ' : ''}`, expectedText: request.document.source.slice(range.from, range.to), sourceLength: request.document.source.length },
      });
    }
    candidates.sort((left, right) => right.score - left.score || left.canonicalTag.localeCompare(right.canonicalTag));
    return { query, range, items: candidates.slice(0, limit), truncated: candidates.length > limit, ...(appendSeparator ? { appendSeparator: true } : {}) };
  }

  lint(document: PromptDocument, context: PromptLintContext): PromptDiagnostic[] {
    const results = [...document.diagnostics];
    const push = (item: PromptDiagnostic) => { if (results.length < PROMPT_LIMITS.maxDiagnostics) results.push(item); };
    const seen = new Map<string, PromptToken>();
    const canonicalPresent = new Set(document.tokens.map((token) => token.canonicalTag).filter((tag): tag is string => Boolean(tag)));
    for (const token of document.tokens) {
      if (token.syntaxKind === 'unknown-syntax') {
        push(diagnostic('unsupported-syntax', 'warning', 'Zynalo does not analyze this syntax yet. It is preserved and will be sent unchanged.', token.range, { tokenIds: [token.id] }));
        continue;
      }
      if (!token.recognized) {
        const replacement = spellingSuggestion(this.catalog, token.normalized ?? token.raw);
        const message = replacement
          ? `“${token.raw}” was not found. Did you mean “${replacement}”?`
          : `“${token.raw}” was not found in the installed catalog. It will be preserved and sent unchanged.`;
        push(diagnostic('unknown-tag', 'warning', message, token.range, { tokenIds: [token.id], data: { tokenId: token.id, ...(replacement ? { replacement } : {}) } }));
      } else {
        const record = this.catalog.get(token.canonicalTag!);
        if (token.matchKind === 'alias') push(diagnostic('alias-used', 'warning', `Alias used. The canonical tag is ${token.canonicalTag}.`, token.range, { tokenIds: [token.id], data: { tokenId: token.id, replacement: token.canonicalTag! } }));
        if (token.matchKind === 'misspelling') push(diagnostic('misspelling', 'warning', `Possible misspelling. Replace with ${token.canonicalTag}.`, token.range, { tokenIds: [token.id], data: { tokenId: token.id, replacement: token.canonicalTag! } }));
        if (record?.deprecated) push(diagnostic('deprecated-tag', 'warning', record.replacement ? `This tag is deprecated; ${record.replacement} is preferred.` : 'This tag is deprecated.', token.range, { tokenIds: [token.id], data: { tokenId: token.id, ...(record.replacement ? { replacement: record.replacement } : {}) } }));
        for (const associated of record?.associations?.characterToCopyright ?? []) {
          if (!canonicalPresent.has(associated)) push(diagnostic('missing-associated-series', 'warning', `${record?.displayName ?? token.canonicalTag} is associated with ${titleForTag(associated)}. Add the series tag explicitly if intended.`, token.range, { tokenIds: [token.id], data: { tag: associated } }));
        }
      }
      const key = token.canonicalTag ?? token.normalized ?? token.raw;
      const first = seen.get(key);
      if (first) push(diagnostic('duplicate-tag', 'warning', `Exact duplicate tag “${token.raw}”.`, token.range, { relatedRanges: [first.range], tokenIds: [first.id, token.id], data: { removeTokenId: token.id } }));
      else seen.set(key, token);
    }
    const conflicted = new Set<string>();
    for (let leftIndex = 0; leftIndex < document.tokens.length; leftIndex += 1) {
      const left = document.tokens[leftIndex]!;
      if (!left.canonicalTag) continue;
      const leftRecord = this.catalog.get(left.canonicalTag);
      for (let rightIndex = leftIndex + 1; rightIndex < document.tokens.length; rightIndex += 1) {
        const right = document.tokens[rightIndex]!;
        if (!right.canonicalTag || right.canonicalTag === left.canonicalTag) continue;
        const rightRecord = this.catalog.get(right.canonicalTag);
        const explicit = leftRecord?.conflicts?.includes(right.canonicalTag) || rightRecord?.conflicts?.includes(left.canonicalTag);
        const sharedExclusive = leftRecord?.semanticGroups.some((group) => exclusiveGroups.has(group) && rightRecord?.semanticGroups.includes(group));
        if (!explicit && !sharedExclusive) continue;
        const pair = [left.id, right.id].sort().join('|');
        if (conflicted.has(pair)) continue;
        conflicted.add(pair);
        push(diagnostic('semantic-conflict', 'warning', `“${left.canonicalTag}” may conflict with “${right.canonicalTag}”. Both are preserved.`, left.range, { relatedRanges: [right.range], tokenIds: [left.id, right.id], data: { leftTokenId: left.id, rightTokenId: right.id } }));
      }
    }
    if (!context.negative && context.guidanceLevel !== 'off') {
      const groups = new Set(document.tokens.flatMap((token) => token.canonicalTag ? this.catalog.get(token.canonicalTag)?.semanticGroups ?? [] : []));
      const addGuidance = (code: string, message: string, tags: string[], important: boolean) => {
        if (context.guidanceLevel === 'important' && !important) return;
        push(diagnostic(code, 'guidance', message, { from: document.source.length, to: document.source.length }, { data: { tags: tags.join(',') } }));
      };
      if (![...groups].some((group) => ['subject-count', 'character'].includes(group))) addGuidance('subject-unspecified', 'Subject is unspecified, so the model will decide who or what appears.', ['1girl', '1boy', 'solo'], true);
      if (!groups.has('framing')) addGuidance('framing-unspecified', 'Framing is unspecified, so the model will decide how much of the subject appears.', ['full_body', 'upper_body', 'portrait'], true);
      if (![...groups].some((group) => group.startsWith('viewpoint'))) addGuidance('viewpoint-unspecified', 'Viewpoint is unspecified, so the model will choose the camera angle.', ['eye_level', 'from_above', 'from_below'], false);
      if (!groups.has('action')) addGuidance('action-unspecified', 'Action is unspecified, so the model will decide what the subject is doing.', ['standing', 'reading', 'walking'], false);
      if (!groups.has('setting')) addGuidance('setting-unspecified', 'Setting is unspecified, so the model will invent the environment.', ['indoors', 'outdoors', 'library'], true);
      if (!groups.has('lighting') && !groups.has('time')) addGuidance('lighting-unspecified', 'Lighting and time are unspecified, so the model will choose the scene’s illumination.', ['warm_lighting', 'day', 'night'], false);
      if (groups.has('portrait-oriented') && !groups.has('expression')) addGuidance('expression-unspecified', 'Expression is unspecified in this portrait-oriented prompt, so the model will choose it.', ['smile', 'serious', 'gentle_smile'], false);
    }
    return results;
  }

  explain(token: PromptToken): TagExplanation {
    const record = token.canonicalTag ? this.catalog.get(token.canonicalTag) : undefined;
    if (!record) return { displayCategory: token.syntaxKind === 'unknown-syntax' ? 'Unsupported syntax' : 'Unknown tag', meaning: token.syntaxKind === 'unknown-syntax' ? 'Zynalo does not analyze this syntax yet. It is preserved and sent unchanged.' : 'Not present in the installed catalog. It will be preserved and sent unchanged.', aliases: [], associatedTags: [], recognized: false };
    return { canonicalTag: record.canonicalName, category: record.category, displayCategory: record.displayCategory, meaning: record.description ?? record.displayName, aliases: record.aliases, associatedTags: record.associations?.characterToCopyright ?? [], recognized: true };
  }

  getQuickFixes(item: PromptDiagnostic, document: PromptDocument): PromptQuickFix[] {
    const tokenById = (id: unknown) => typeof id === 'string' ? document.tokens.find((token) => token.id === id) : undefined;
    const replaceToken = (token: PromptToken | undefined, replacement: unknown, prefix: string): PromptQuickFix[] => token && typeof replacement === 'string' ? [{ id: `${prefix}:${token.id}`, label: `Replace “${token.raw}” with “${replacement}”`, edits: [{ range: token.range, insert: replacement, expectedText: document.source.slice(token.range.from, token.range.to), sourceLength: document.source.length }] }] : [];
    if (['alias-used', 'misspelling', 'deprecated-tag'].includes(item.code)) return replaceToken(tokenById(item.data?.tokenId), item.data?.replacement, item.code);
    if (item.code === 'duplicate-tag') {
      const token = tokenById(item.data?.removeTokenId);
      return token ? [{ id: `remove-duplicate:${token.id}`, label: `Remove duplicate “${token.raw}”`, edits: [tokenRemovalEdit(document.source, token)] }] : [];
    }
    if (item.code === 'semantic-conflict') {
      return [tokenById(item.data?.leftTokenId), tokenById(item.data?.rightTokenId)].filter((token): token is PromptToken => Boolean(token)).map((token) => ({ id: `remove-conflict:${token.id}`, label: `Remove “${token.raw}”`, edits: [tokenRemovalEdit(document.source, token)] }));
    }
    if (item.code === 'missing-associated-series' && typeof item.data?.tag === 'string') return [{ id: `add-series:${item.data.tag}`, label: `Add associated series tag “${item.data.tag}”`, edits: [insertionEdit(document.source, item.data.tag)] }];
    if (item.code === 'empty-entry') {
      const entryFrom = Number(item.data?.entryFrom); const entryTo = Number(item.data?.entryTo);
      if (!Number.isInteger(entryFrom) || !Number.isInteger(entryTo)) return [];
      const range = { from: entryFrom, to: entryTo };
      if (document.source[range.to] === ',') range.to += 1; else if (range.from > 0 && document.source[range.from - 1] === ',') range.from -= 1;
      return [{ id: `remove-empty:${range.from}`, label: 'Remove empty comma entry', edits: [{ range, insert: '', expectedText: document.source.slice(range.from, range.to), sourceLength: document.source.length }] }];
    }
    if (item.code === 'unknown-tag') {
      const token = tokenById(item.data?.tokenId);
      if (typeof item.data?.replacement === 'string') return replaceToken(token, item.data.replacement, 'correct-spelling');
      if (token && /\s/.test(token.raw)) return replaceToken(token, normalizeTag(token.raw), 'normalize-spaces');
    }
    if (item.severity === 'guidance' && typeof item.data?.tags === 'string') return item.data.tags.split(',').slice(0, 3).map((tag) => ({ id: `add-guidance:${item.code}:${tag}`, label: `Add “${tag}”`, edits: [insertionEdit(document.source, tag)] }));
    return [];
  }

  applyTextEdits(source: string, edits: PromptTextEdit[]): string {
    const sorted = [...edits].sort((left, right) => right.range.from - left.range.from || right.range.to - left.range.to);
    let previousFrom = source.length + 1;
    let result = source;
    for (const edit of sorted) {
      if (edit.sourceLength !== source.length || !Number.isInteger(edit.range.from) || !Number.isInteger(edit.range.to) || edit.range.from < 0 || edit.range.to < edit.range.from || edit.range.to > source.length || edit.range.to > previousFrom || source.slice(edit.range.from, edit.range.to) !== edit.expectedText) throw new StalePromptEditError();
      result = result.slice(0, edit.range.from) + edit.insert + result.slice(edit.range.to);
      previousFrom = edit.range.from;
    }
    return result;
  }
}

function titleForTag(tag: string): string { return tag.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()); }
