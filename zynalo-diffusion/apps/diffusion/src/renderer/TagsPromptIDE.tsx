import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GuidanceLevel, PromptDiagnostic, PromptModelProfile, PromptQuickFix, PromptToken } from '@zynalo/prompt-language';
import type { TagCatalogInfo, TagReference } from '@zynalo/diffusion-contracts';
import type { PromptWorkspaceService, PromptWorkspaceState } from './promptWorkspace';
import { PromptEditor } from './PromptEditor';
import type { PromptEditorHandle } from './PromptEditor';

interface TagsPromptIDEProps {
  workspace: PromptWorkspaceService;
  state: PromptWorkspaceState;
  profile: PromptModelProfile | undefined;
  hasSelectedModel: boolean;
  disabled: boolean;
  onChange(state: PromptWorkspaceState): void;
}

type LocatedDiagnostic = { side: 'positive' | 'negative'; diagnostic: PromptDiagnostic };

export function TagsPromptIDE({ workspace, state, profile, hasSelectedModel, disabled, onChange }: TagsPromptIDEProps) {
  const positiveRef = useRef<PromptEditorHandle>(null);
  const negativeRef = useRef<PromptEditorHandle>(null);
  const [positiveAnalysis, setPositiveAnalysis] = useState(() => workspace.analyze(state.positive, state.guidanceLevel, profile, false));
  const [negativeAnalysis, setNegativeAnalysis] = useState(() => workspace.analyze(state.negative, 'off', profile, true));
  const [focusedToken, setFocusedToken] = useState<PromptToken | undefined>();
  const [fixError, setFixError] = useState('');
  const [catalogInfo, setCatalogInfo] = useState<TagCatalogInfo | null>(null);
  const [focusedReference, setFocusedReference] = useState<TagReference | undefined>();
  const getTagReference = useCallback((tag: string) => workspace.getTagReference(tag, state.allowNsfwPreview), [state.allowNsfwPreview, workspace]);

  useEffect(() => {
    let active = true;
    workspace.getCatalogInfo().then((info) => { if (active) setCatalogInfo(info); }).catch(() => { if (active) setCatalogInfo(null); });
    return () => { active = false; };
  }, [workspace]);

  useEffect(() => {
    let active = true;
    if (!focusedToken) { setFocusedReference(undefined); return () => { active = false; }; }
    getTagReference(focusedToken.canonicalTag ?? focusedToken.normalized ?? focusedToken.raw)
      .then((reference) => { if (active) setFocusedReference(reference); })
      .catch(() => { if (active) setFocusedReference(undefined); });
    return () => { active = false; };
  }, [focusedToken, getTagReference]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPositiveAnalysis(workspace.analyze(state.positive, state.guidanceLevel, profile, false));
      setNegativeAnalysis(workspace.analyze(state.negative, 'off', profile, true));
    }, 120);
    return () => window.clearTimeout(handle);
  }, [profile, state.guidanceLevel, state.negative, state.positive, workspace]);

  const located = useMemo<LocatedDiagnostic[]>(() => [
    ...positiveAnalysis.diagnostics.map((diagnostic) => ({ side: 'positive' as const, diagnostic })),
    ...negativeAnalysis.diagnostics.map((diagnostic) => ({ side: 'negative' as const, diagnostic })),
  ], [negativeAnalysis, positiveAnalysis]);
  const explanation = focusedToken ? workspace.language.explain(focusedToken) : undefined;
  const focusedCategory = focusedReference?.category ? focusedReference.category[0]!.toUpperCase() + focusedReference.category.slice(1) : explanation?.displayCategory;

  const update = (patch: Partial<PromptWorkspaceState>) => onChange({ ...state, ...patch });
  const focus = (item: LocatedDiagnostic) => (item.side === 'positive' ? positiveRef : negativeRef).current?.focusRange(item.diagnostic.range);
  const fixes = (item: LocatedDiagnostic): PromptQuickFix[] => workspace.language.getQuickFixes(item.diagnostic, item.side === 'positive' ? positiveAnalysis.document : negativeAnalysis.document);
  const apply = (item: LocatedDiagnostic, fix: PromptQuickFix) => {
    setFixError('');
    try { (item.side === 'positive' ? positiveRef : negativeRef).current?.applyFix(fix); }
    catch (error) { setFixError(error instanceof Error ? error.message : 'The quick fix could not be applied.'); }
  };
  const addRecommended = (tag: string) => {
    const insert = state.positive.trim().length === 0 ? tag : `${state.positive.endsWith(',') ? ' ' : ', '}${tag}`;
    positiveRef.current?.applyEdits([{ range: { from: state.positive.length, to: state.positive.length }, insert, expectedText: '', sourceLength: state.positive.length }]);
  };

  return <section className="tags-ide" aria-label="Tags prompt IDE">
    <div className="tags-ide-heading"><div><p className="eyebrow">Prompt authoring</p><h3>Tags mode</h3></div><div className="tags-ide-controls"><label className="preview-toggle"><input type="checkbox" checked={state.allowNsfwPreview} onChange={(event) => update({ allowNsfwPreview: event.target.checked })} disabled={disabled} />Allow NSFW previews</label><label className="guidance-select">Guidance<select value={state.guidanceLevel} onChange={(event) => update({ guidanceLevel: event.target.value as GuidanceLevel })} disabled={disabled}><option value="full">Full</option><option value="important">Important only</option><option value="off">Off</option></select></label></div></div>
    <div className="profile-note"><strong>{profile ? `${profile.displayName} profile` : 'Generic Booru assistance'}</strong><span>{profile ? profile.recommendation : hasSelectedModel ? 'This model has no Booru prompt profile. Tag assistance uses the generic local catalog and may not reflect this checkpoint’s training.' : 'Select a model to see model-aware prompt guidance.'}</span>{catalogInfo && <span>{catalogInfo.recordCount.toLocaleString('en-US')} offline autocomplete tags · snapshot {catalogInfo.generatedAt.slice(0, 10)}</span>}{profile && profile.recommendedPositiveTags.length > 0 && <div className="inline-actions"><span>Optional profile tags:</span>{profile.recommendedPositiveTags.map((tag) => <button type="button" key={tag} onClick={() => addRecommended(tag)} disabled={disabled || positiveAnalysis.document.tokens.some((token) => token.canonicalTag === tag)}>{tag}</button>)}</div>}</div>
    <PromptEditor ref={positiveRef} id="positive-prompt" label="Positive prompt" source={state.positive} diagnostics={positiveAnalysis.diagnostics} language={workspace.language} completeTags={workspace.completeTags} getTagReference={getTagReference} disabled={disabled} onChange={(positive) => update({ positive })} onTokenFocus={setFocusedToken} />
    <PromptEditor ref={negativeRef} id="negative-prompt" label="Negative prompt" source={state.negative} diagnostics={negativeAnalysis.diagnostics} language={workspace.language} completeTags={workspace.completeTags} getTagReference={getTagReference} disabled={disabled} onChange={(negative) => update({ negative })} onTokenFocus={setFocusedToken} />
    <div className="tag-inspector" aria-live="polite"><strong>{focusedReference?.tag ?? explanation?.canonicalTag ?? focusedToken?.raw ?? 'Tag inspector'}</strong>{explanation ? <><span>Category: {focusedCategory}</span><span>{focusedReference?.description ?? explanation.meaning}</span>{explanation.aliases.length > 0 && <span>Aliases: {explanation.aliases.join(', ')}</span>}{explanation.associatedTags.length > 0 && <span>Associated tag: {explanation.associatedTags.join(', ')}</span>}</> : <span>Move the caret into a tag or hover over one to see its explanation.</span>}</div>
    <div className="problems-heading"><button type="button" className="text-button" onClick={() => update({ problemsVisible: !state.problemsVisible })} aria-expanded={state.problemsVisible}>{state.problemsVisible ? 'Hide' : 'Show'} Problems</button><span>{located.filter((item) => item.diagnostic.severity === 'error').length} errors · {located.filter((item) => item.diagnostic.severity === 'warning').length} warnings · {located.filter((item) => item.diagnostic.severity === 'guidance').length} suggestions</span></div>
    {fixError && <div className="error" role="alert">{fixError}</div>}
    {state.problemsVisible && <div className="problems-panel">{(['error', 'warning', 'guidance'] as const).map((severity) => <section key={severity}><h4>{severity === 'error' ? 'Errors' : severity === 'warning' ? 'Warnings' : 'Suggestions'}</h4>{located.filter((item) => item.diagnostic.severity === severity).length === 0 ? <p className="no-problems">None</p> : located.filter((item) => item.diagnostic.severity === severity).map((item) => <article className={`problem-item ${severity}`} key={`${item.side}:${item.diagnostic.id}`}><button type="button" className="problem-message" onClick={() => focus(item)}><span className="severity-label">{severity}</span><span><small>{item.side === 'positive' ? 'Positive' : 'Negative'} prompt</small>{item.diagnostic.message}</span></button>{fixes(item).length > 0 && <div className="quick-fixes">{fixes(item).map((fix) => <button type="button" key={fix.id} onClick={() => apply(item, fix)} disabled={disabled}>{fix.label}</button>)}</div>}</article>)}</section>)}</div>}
    <details className="raw-prompts"><summary>Exact raw prompts</summary><h4>Positive</h4><pre>{state.positive}</pre><h4>Negative</h4><pre>{state.negative}</pre></details>
  </section>;
}
