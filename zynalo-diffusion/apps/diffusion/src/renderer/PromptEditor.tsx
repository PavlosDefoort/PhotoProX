import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { acceptCompletion, autocompletion, completionKeymap, startCompletion } from '@codemirror/autocomplete';
import type { CompletionContext, CompletionResult as CodeMirrorCompletionResult } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { setDiagnostics } from '@codemirror/lint';
import type { Diagnostic as CodeMirrorDiagnostic } from '@codemirror/lint';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { Decoration, EditorView, hoverTooltip, keymap, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { PromptDiagnostic, PromptLanguageService, PromptQuickFix, PromptTextEdit, PromptToken, TextRange } from '@zynalo/prompt-language';
import type { TagAutocompleteRequest, TagAutocompleteResult, TagReference } from '@zynalo/diffusion-contracts';
import { autocompleteExclusions } from './promptCompletion';

export interface PromptEditorHandle {
  focusRange(range: TextRange): void;
  applyFix(fix: PromptQuickFix): void;
  applyEdits(edits: PromptTextEdit[]): void;
}

interface PromptEditorProps {
  id: string;
  label: string;
  source: string;
  diagnostics: PromptDiagnostic[];
  language: PromptLanguageService;
  completeTags(request: TagAutocompleteRequest): Promise<TagAutocompleteResult>;
  getTagReference(tag: string): Promise<TagReference>;
  disabled: boolean;
  onChange(source: string): void;
  onTokenFocus(token: PromptToken | undefined): void;
}

const editorTheme = EditorView.theme({
  '&': { backgroundColor: '#0f131b', color: '#eef1f8', border: '1px solid #303747', borderRadius: '9px', minHeight: '116px' },
  '&.cm-focused': { outline: '2px solid #8b83ff', outlineOffset: '2px' },
  '.cm-content': { caretColor: '#c9c5ff', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '13px', lineHeight: '1.55', padding: '10px 11px', minHeight: '116px' },
  '.cm-line': { padding: '0' },
  '.cm-gutters': { display: 'none' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-tooltip': { border: '1px solid #3a4255', borderRadius: '8px', backgroundColor: '#181d28', color: '#e9edf5' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'inherit', maxHeight: '260px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#4f47ad', color: 'white' },
  '.cm-completionDetail': { color: '#aeb6c7', fontStyle: 'normal' },
  '.cm-token-recognized': { textDecoration: 'underline dotted rgba(185, 192, 207, .42)', textUnderlineOffset: '3px' },
  '.cm-token-character': { color: '#f0b6ff' },
  '.cm-token-copyright': { color: '#9ed8ff' },
  '.cm-token-meta': { color: '#ffd99a' },
  '.cm-token-general': { color: '#b9edc8' },
  '.cm-token-unknown': { color: '#d0a7a7' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy #e8c24f', textDecorationThickness: '1.5px', textUnderlineOffset: '3px' },
  '&.cm-editor.cm-readonly': { opacity: '.62' },
});

function tokenDecorations(view: EditorView, language: PromptLanguageService): DecorationSet {
  const document = language.parse(view.state.doc.toString());
  const ranges = document.tokens.filter((token) => token.range.to > token.range.from).map((token) => Decoration.mark({
    class: token.recognized ? `cm-token-recognized cm-token-${token.category ?? 'general'}` : 'cm-token-unknown',
    attributes: { 'aria-label': token.recognized ? `${token.canonicalTag}, ${token.displayCategory}` : `${token.raw}, unknown tag` },
  }).range(token.range.from, token.range.to));
  return Decoration.set(ranges, true);
}

function tokenDecorationExtension(language: PromptLanguageService): Extension {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = tokenDecorations(view, language); }
    update(update: ViewUpdate) { if (update.docChanged) this.decorations = tokenDecorations(update.view, language); }
  }, { decorations: (plugin) => plugin.decorations });
}

function explanationTooltip(language: PromptLanguageService, getTagReference: (tag: string) => Promise<TagReference>): Extension {
  return hoverTooltip(async (view, position) => {
    const document = language.parse(view.state.doc.toString());
    const token = document.tokens.find((candidate) => position >= candidate.range.from && position <= candidate.range.to);
    if (!token) return null;
    const explanation = language.explain(token);
    let reference: TagReference | undefined;
    try { reference = await getTagReference(explanation.canonicalTag ?? token.normalized ?? token.raw); }
    catch { reference = undefined; }
    return {
      pos: token.range.from,
      end: token.range.to,
      above: true,
      create: () => {
        const dom = documentFor(view).createElement('div');
        dom.className = 'tag-tooltip';
        const heading = documentFor(view).createElement('strong');
        heading.textContent = reference?.tag ?? explanation.canonicalTag ?? token.raw;
        const category = documentFor(view).createElement('span');
        const categoryName = reference?.category ? reference.category[0]!.toUpperCase() + reference.category.slice(1) : explanation.displayCategory;
        category.textContent = `Category: ${categoryName}`;
        const meaning = documentFor(view).createElement('span');
        meaning.textContent = reference?.description ?? explanation.meaning;
        dom.append(heading, category, meaning);
        if (explanation.aliases.length > 0) {
          const aliases = documentFor(view).createElement('span');
          aliases.textContent = `Aliases: ${explanation.aliases.join(', ')}`;
          dom.append(aliases);
        }
        if (reference?.otherNames.length) {
          const otherNames = documentFor(view).createElement('span');
          otherNames.textContent = `Other names: ${reference.otherNames.join(', ')}`;
          dom.append(otherNames);
        }
        if (reference?.preview) {
          const preview = documentFor(view).createElement('figure');
          preview.className = 'tag-tooltip-preview';
          const image = documentFor(view).createElement('img');
          image.src = reference.preview.uri;
          image.alt = `Danbooru ${reference.preview.rating} preview example for ${reference.tag}`;
          image.width = 180; image.height = 180;
          const caption = documentFor(view).createElement('figcaption');
          caption.textContent = `${reference.preview.rating} preview · post ${reference.preview.postId}`;
          preview.append(image, caption); dom.append(preview);
        } else if (reference?.unavailableReason) {
          const unavailable = documentFor(view).createElement('span');
          unavailable.textContent = reference.unavailableReason;
          dom.append(unavailable);
        }
        return { dom };
      },
    };
  });
}

function documentFor(view: EditorView): Document { return view.dom.ownerDocument; }

function completionSource(language: PromptLanguageService, completeTags: (request: TagAutocompleteRequest) => Promise<TagAutocompleteResult>) {
  return async (context: CompletionContext): Promise<CodeMirrorCompletionResult | null> => {
    const document = language.parse(context.state.doc.toString());
    const result = language.complete({ document, position: context.pos });
    let external: TagAutocompleteResult = { query: result.query, items: [], truncated: false };
    try {
      external = await completeTags({
        query: result.query,
        limit: 20,
        exclude: autocompleteExclusions(document, result.range),
      });
    } catch {
      // The curated catalog remains usable if the optional snapshot is unavailable.
    }
    if (context.aborted) return null;
    // The optional local Danbooru snapshot is the authoritative ordering when
    // available: it groups
    // exact/prefix matches and sorts peers by post count. Curated records only
    // enrich those rows or provide a fallback when the snapshot is unavailable.
    const seen = new Set<string>();
    const curated = new Map(result.items.map((item) => [item.canonicalTag, item]));
    const options: Array<{ label: string; detail: string; type: string; replacement: PromptTextEdit; info?: string }> = [];
    for (const item of external.items) {
      if (seen.has(item.canonicalTag)) continue;
      seen.add(item.canonicalTag);
      const enriched = curated.get(item.canonicalTag);
      const matched = item.matchedAlias ? ` via ${item.matchedAlias}` : '';
      options.push({
        label: item.canonicalTag,
        detail: enriched?.detail ?? `${item.category} · ${item.postCount.toLocaleString('en-US')} posts${matched}`,
        ...(enriched?.description ? { info: enriched.description } : {}),
        type: item.category === 'copyright' ? 'namespace' : item.category,
        replacement: enriched?.replacement ?? { range: result.range, insert: `${item.canonicalTag}${result.appendSeparator ? ', ' : ''}`, expectedText: document.source.slice(result.range.from, result.range.to), sourceLength: document.source.length },
      });
      if (options.length >= 20) break;
    }
    for (const item of result.items) {
      if (seen.has(item.canonicalTag)) continue;
      seen.add(item.canonicalTag);
      options.push({
        label: item.canonicalTag,
        detail: item.detail ?? item.displayCategory,
        ...(item.description ? { info: item.description } : {}),
        type: item.category === 'copyright' ? 'namespace' : item.category,
        replacement: item.replacement,
      });
      if (options.length >= 20) break;
    }
    if (options.length === 0) return null;
    return {
      from: result.range.from,
      filter: false,
      validFor: (text) => text === context.state.sliceDoc(result.range.from, context.pos),
      options: options.map((item) => ({
        label: item.label,
        detail: item.detail,
        ...(item.info ? { info: item.info } : {}),
        type: item.type,
        apply: (view: EditorView) => {
          const current = view.state.doc.toString();
          if (current.slice(item.replacement.range.from, item.replacement.range.to) !== item.replacement.expectedText) return;
          view.dispatch({ changes: { from: item.replacement.range.from, to: item.replacement.range.to, insert: item.replacement.insert }, selection: { anchor: item.replacement.range.from + item.replacement.insert.length }, scrollIntoView: true, userEvent: 'input.complete' });
        },
      })),
    };
  };
}

function toCodeMirrorDiagnostics(items: PromptDiagnostic[], length: number): CodeMirrorDiagnostic[] {
  return items.map((item) => ({
    from: Math.min(item.range.from, length),
    to: Math.min(Math.max(item.range.to, item.range.from), length),
    severity: item.severity === 'guidance' ? 'info' : item.severity,
    message: item.message,
    source: 'Zynalo Tags',
  }));
}

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor({ id, label, source, diagnostics, language, completeTags, getTagReference, disabled, onChange, onTokenFocus }, forwardedRef) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onTokenFocus });
  callbacks.current = { onChange, onTokenFocus };
  const editable = useRef(new Compartment());
  const initialSource = useRef(source);
  const initiallyDisabled = useRef(disabled);

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: initialSource.current,
      extensions: [
        history(),
        keymap.of([{ key: 'Tab', run: acceptCompletion }, { key: 'Ctrl-Space', run: startCompletion }, ...completionKeymap, ...defaultKeymap, ...historyKeymap]),
        autocompletion({ override: [completionSource(language, completeTags)], activateOnTyping: true, maxRenderedOptions: 20 }),
        tokenDecorationExtension(language),
        explanationTooltip(language, getTagReference),
        EditorView.lineWrapping,
        editorTheme,
        EditorView.cspNonce.of('zynalo-codemirror'),
        editable.current.of(EditorView.editable.of(!initiallyDisabled.current)),
        EditorView.contentAttributes.of({ 'aria-label': label, 'aria-describedby': `${id}-help`, spellcheck: 'false' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const position = update.state.selection.main.head;
            const document = language.parse(update.state.doc.toString());
            callbacks.current.onTokenFocus(document.tokens.find((token) => position >= token.range.from && position <= token.range.to));
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: host.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // The language service is stable for the lifetime of the application.
  }, [completeTags, getTagReference, id, label, language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === source) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source }, userEvent: 'input' });
  }, [source]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) view.dispatch({ effects: editable.current.reconfigure(EditorView.editable.of(!disabled)) });
  }, [disabled]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) view.dispatch(setDiagnostics(view.state, toCodeMirrorDiagnostics(diagnostics, view.state.doc.length)));
  }, [diagnostics]);

  useImperativeHandle(forwardedRef, () => ({
    focusRange(range) {
      const view = viewRef.current; if (!view) return;
      const from = Math.min(range.from, view.state.doc.length); const to = Math.min(range.to, view.state.doc.length);
      view.dispatch({ selection: EditorSelection.range(from, to), scrollIntoView: true }); view.focus();
    },
    applyFix(fix) { this.applyEdits(fix.edits); },
    applyEdits(edits) {
      const view = viewRef.current; if (!view) return;
      language.applyTextEdits(view.state.doc.toString(), edits);
      view.dispatch({ changes: edits.map((edit) => ({ from: edit.range.from, to: edit.range.to, insert: edit.insert })), scrollIntoView: true, userEvent: 'input' });
      view.focus();
    },
  }), [language]);

  return <div className="prompt-editor-field"><div className="prompt-editor-label"><label id={`${id}-label`}>{label}</label><span>{source.length} / 4,000</span></div><p className="sr-only" id={`${id}-help`}>Comma-separated Booru tags. Press Control Space for suggestions, Enter or Tab to accept, and Escape to close suggestions.</p><div ref={host} aria-labelledby={`${id}-label`} /></div>;
});
