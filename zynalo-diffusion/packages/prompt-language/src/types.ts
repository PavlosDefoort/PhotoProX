export const PROMPT_LIMITS = Object.freeze({
  maxCharacters: 4_000,
  maxTokens: 512,
  maxNestingDepth: 8,
  maxDiagnostics: 200,
  maxCompletionResults: 20,
  maxAliasLength: 256,
  maxCatalogRecords: 1_000,
  maxDescriptionLength: 240,
  minAnalyzedWeight: 0,
  maxAnalyzedWeight: 2,
});

export type DiagnosticSeverity = 'error' | 'warning' | 'guidance';
export type GuidanceLevel = 'full' | 'important' | 'off';
export type TagCategory = 'general' | 'character' | 'copyright' | 'artist' | 'meta';
export type PromptTokenKind = 'tag' | 'weighted-tag' | 'unknown-syntax';
export type TagMatchKind = 'canonical' | 'alias' | 'misspelling' | 'unknown';

export interface TextRange { from: number; to: number }

export interface PromptToken {
  id: string;
  raw: string;
  normalized?: string;
  canonicalTag?: string;
  category?: TagCategory;
  displayCategory?: string;
  range: TextRange;
  entryRange: TextRange;
  weight?: number;
  syntaxKind: PromptTokenKind;
  recognized: boolean;
  matchKind: TagMatchKind;
}

export interface PromptSyntaxNode {
  kind: 'entry' | 'separator' | 'emphasis' | 'weight' | 'unsupported';
  range: TextRange;
  depth?: number;
}

export interface PromptDiagnostic {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  range: TextRange;
  relatedRanges?: TextRange[];
  tokenIds?: string[];
  blocksGeneration: boolean;
  data?: Record<string, string | number | boolean>;
}

export interface PromptDocument {
  source: string;
  tokens: PromptToken[];
  syntax: PromptSyntaxNode[];
  diagnostics: PromptDiagnostic[];
  analysisTruncated: boolean;
}

export interface TagAssociations { characterToCopyright?: string[] }

export interface TagRecord {
  canonicalName: string;
  displayName: string;
  category: TagCategory;
  displayCategory: string;
  semanticGroups: string[];
  aliases: string[];
  commonMisspellings?: string[];
  implications?: string[];
  conflicts?: string[];
  description?: string;
  usageRank?: number;
  deprecated?: boolean;
  replacement?: string;
  associations?: TagAssociations;
}

export interface TagCatalogData {
  schema: 'zynalo.prompt-catalog/v1';
  id: string;
  version: string;
  records: TagRecord[];
}

export interface PromptModelProfile {
  id: string;
  displayName: string;
  dialect: 'booru';
  catalogId: string;
  recommendation: string;
  recommendedPositiveTags: string[];
  recommendedNegativeTags: string[];
  clipLayerSelection?: 'penultimate-hidden-state';
  generationDefaults?: {
    width: number;
    height: number;
    steps: number;
    guidance: number;
    sampler: 'checkpoint-default' | 'euler-ancestral';
  };
  detailPassPresets?: Partial<Record<'standard' | 'strong', {
    scale?: number;
    strength?: number;
    steps?: number;
    upscaler?: 'lanczos' | 'realesrgan-anime6b';
  }>>;
}

export interface PromptLintContext {
  guidanceLevel: GuidanceLevel;
  profile?: PromptModelProfile;
  negative?: boolean;
}

export interface CompletionRequest {
  document: PromptDocument;
  position: number;
  limit?: number;
  category?: TagCategory;
  includeDuplicates?: boolean;
}

export interface CompletionItem {
  canonicalTag: string;
  displayName: string;
  category: TagCategory;
  displayCategory: string;
  description?: string;
  detail?: string;
  matchKind: Exclude<TagMatchKind, 'unknown'> | 'fuzzy';
  score: number;
  alreadyPresent: boolean;
  replacement: PromptTextEdit;
}

export interface CompletionResult {
  query: string;
  range: TextRange;
  items: CompletionItem[];
  truncated: boolean;
  appendSeparator?: boolean;
}

export interface TagExplanation {
  canonicalTag?: string;
  category?: TagCategory;
  displayCategory: string;
  meaning: string;
  aliases: string[];
  associatedTags: string[];
  recognized: boolean;
}

export interface PromptTextEdit {
  range: TextRange;
  insert: string;
  expectedText: string;
  sourceLength: number;
}

export interface PromptQuickFix {
  id: string;
  label: string;
  edits: PromptTextEdit[];
}

export interface PromptLanguageService {
  parse(source: string): PromptDocument;
  complete(request: CompletionRequest): CompletionResult;
  lint(document: PromptDocument, context: PromptLintContext): PromptDiagnostic[];
  explain(token: PromptToken): TagExplanation;
  getQuickFixes(diagnostic: PromptDiagnostic, document: PromptDocument): PromptQuickFix[];
  applyTextEdits(source: string, edits: PromptTextEdit[]): string;
  registerCompletionRecords?(records: readonly TagRecord[]): void;
}
