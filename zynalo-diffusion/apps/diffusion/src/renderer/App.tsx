import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { DetailPassPreset, DetailPassUpscaler, GenerateRequest, GenerationProgress, GenerationResult, LoadedModelState, ModelInfo } from '@zynalo/diffusion-contracts';
import { alignDimension, resolveDetailPassPreset, resolveGenerateRequest, validateGenerateRequest } from '@zynalo/diffusion-contracts';
import { getPromptModelProfile } from '@zynalo/prompt-language';
import { DetailPassControls, detailPassRequest, initialDetailPassState } from './DetailPassControls';
import type { DetailPassState } from './DetailPassControls';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { ModelLibraryPanel } from './ModelLibraryPanel';
import type { DiffusionRuntime } from './runtime/DiffusionRuntime';
import { generationModelPresentation } from './modelPresentation';
import { TagsPromptIDE } from './TagsPromptIDE';
import type { PromptWorkspaceService, PromptWorkspaceState } from './promptWorkspace';

interface AppProps { runtime: DiffusionRuntime; promptWorkspace: PromptWorkspaceService }
interface FormState { modelId: string; width: number; height: number; steps: number; guidance: number; sampler: 'checkpoint-default' | 'euler-ancestral'; seed: string }
const initialForm: FormState = { modelId: '', width: 512, height: 512, steps: 20, guidance: 7, sampler: 'checkpoint-default', seed: '' };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'An unexpected generation error occurred.';
const stageLabels: Record<GenerationProgress['stage'], string> = {
  queued: 'Queued', 'loading-model': 'Loading model', 'encoding-prompt': 'Preparing prompt',
  'base-generating': 'Creating composition', 'base-decoding': 'Preparing base image', upscaling: 'Upscaling',
  'detail-preparing': 'Preparing Detail Pass', 'detail-generating': 'Adding fine detail',
  'final-decoding': 'Preparing final image', saving: 'Saving', completed: 'Completed',
};

export function App({ runtime, promptWorkspace }: AppProps) {
  const [view, setView] = useState<'workspace' | 'models' | 'diagnostics'>('workspace');
  const [form, setForm] = useState(initialForm);
  const [detailPreset, setDetailPreset] = useState<DetailPassPreset>('off');
  const [detailAdvanced, setDetailAdvanced] = useState(false);
  const [detailState, setDetailState] = useState<DetailPassState>(() => initialDetailPassState(initialForm.width, initialForm.height));
  const [prompts, setPrompts] = useState<PromptWorkspaceState>(() => promptWorkspace.load());
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [availableUpscalers, setAvailableUpscalers] = useState<DetailPassUpscaler[]>(['lanczos']);
  const [modelState, setModelState] = useState<LoadedModelState>({ state: 'idle' });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [shownAsset, setShownAsset] = useState<'base' | 'final'>('final');
  const [error, setError] = useState('');
  const [modelRevision, setModelRevision] = useState(0);
  const appliedProfileKey = useRef('');
  const modelsChanged = useCallback(() => setModelRevision((value) => value + 1), []);
  const selectedModel = models.find((model) => model.id === form.modelId);
  const promptProfile = useMemo(() => getPromptModelProfile(selectedModel?.promptProfileId), [selectedModel?.promptProfileId]);
  const profileDetailPresets = useMemo(() => {
    if (!promptProfile?.detailPassPresets) return undefined;
    return Object.fromEntries(Object.entries(promptProfile.detailPassPresets).map(([key, values]) => [
      key, values?.upscaler && !availableUpscalers.includes(values.upscaler) ? { ...values, upscaler: 'lanczos' as const } : values,
    ]));
  }, [availableUpscalers, promptProfile]);

  useEffect(() => {
    if (!form.modelId) return;
    const key = `${form.modelId}:${promptProfile?.id ?? 'none'}:${availableUpscalers.join(',')}`;
    if (appliedProfileKey.current === key) return;
    appliedProfileKey.current = key;
    const defaults = promptProfile?.generationDefaults;
    if (!defaults) return;
    setForm((current) => ({ ...current, ...defaults }));
    const preset = resolveDetailPassPreset('standard', defaults.width, defaults.height, profileDetailPresets?.standard);
    if (preset.enabled) setDetailState({ ...preset, seed: '' });
  }, [availableUpscalers, form.modelId, profileDetailPresets, promptProfile]);

  useEffect(() => {
    let mounted = true;
    Promise.all([runtime.listModels(), runtime.getLoadedModel(), runtime.inspectHardware()]).then(([available, state, hardware]) => {
      if (!mounted) return; setModels(available); setModelState(state); setAvailableUpscalers(hardware.capabilities?.detailPassUpscalers ?? ['lanczos']);
      const preferred = state.selectedModelId ?? state.loadedModelId ?? available[0]?.id ?? '';
      setForm((current) => ({ ...current, modelId: available.some((item) => item.id === current.modelId) ? current.modelId : preferred }));
    }).catch((reason) => { if (mounted) setError(`Could not list installed models: ${errorMessage(reason)}`); });
    return () => { mounted = false; };
  }, [runtime, modelRevision]);
  useEffect(() => runtime.onLifecycle((event) => {
    if (event.state === 'crashed' || event.state === 'protocol-error') setError(`Diffusion engine: ${event.message}`);
  }), [runtime]);

  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }));
  const setBaseDimension = (key: 'width' | 'height', value: number) => {
    const next = { ...form, [key]: value }; setForm(next);
    if (detailState.lockAspectRatio) setDetailState((current) => ({ ...current, targetWidth: alignDimension(next.width * current.scale), targetHeight: alignDimension(next.height * current.scale) }));
  };
  const setPromptState = (state: PromptWorkspaceState) => { setPrompts(state); promptWorkspace.save(state); };
  async function selectModel(modelId: string) { setField('modelId', modelId); setModelState(await runtime.selectModel(modelId)); }
  async function loadSelected() {
    setError(''); setModelState({ ...modelState, selectedModelId: form.modelId, state: 'loading' });
    try { const state = await runtime.loadModel(form.modelId); setModelState(state); if (state.error) setError(state.error.message); setModelRevision((value) => value + 1); }
    catch (reason) { setError(errorMessage(reason)); }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null); setProgress(null);
    if (modelState.loadedModelId !== form.modelId || modelState.state !== 'loaded') { setError('Load the selected model before generation.'); return; }
    const currentAnalysis = promptWorkspace.analyze(prompts.positive, prompts.guidanceLevel, promptProfile, false);
    const blocking = currentAnalysis.diagnostics.filter((diagnostic) => diagnostic.blocksGeneration);
    if (blocking.length > 0) { setError(`Correct the blocking prompt error${blocking.length === 1 ? '' : 's'} before generation: ${blocking[0]!.message}`); return; }
    const candidate: GenerateRequest = {
      prompt: prompts.positive, negativePrompt: prompts.negative, modelId: form.modelId, width: form.width, height: form.height,
      steps: form.steps, guidance: form.guidance, sampler: form.sampler, detailPass: detailPassRequest(detailPreset, detailState),
      ...(promptProfile?.clipLayerSelection ? { clipLayerSelection: promptProfile.clipLayerSelection } : {}),
      ...(form.seed === '' ? {} : { seed: Number(form.seed) }),
    };
    const validation = validateGenerateRequest(candidate);
    if (!validation.success) { setError(validation.issues.map((issue) => issue.message).join(' ')); return; }
    const resolved = resolveGenerateRequest(validation.data);
    setForm((current) => ({ ...current, seed: String(resolved.seed) }));
    try {
      const active = await runtime.generate(resolved, setProgress); setActiveJobId(active.jobId);
      const completed = await active.result; setResult(completed); setShownAsset(completed.finalAsset ? 'final' : 'base');
    } catch (reason) { setError(errorMessage(reason)); } finally { setActiveJobId(null); }
  }
  async function cancel() { if (!activeJobId) return; try { await runtime.cancel(activeJobId); } catch (reason) { setError(errorMessage(reason)); } }
  function trySmallerDetailPass() {
    const scale = Math.max(1.05, Math.min(1.25, detailState.scale - 0.25));
    setDetailPreset('standard');
    setDetailState((current) => ({
      ...current, scale, targetWidth: alignDimension(form.width * scale), targetHeight: alignDimension(form.height * scale),
    }));
    setDetailAdvanced(true);
  }
  const percentage = Math.round((progress?.overallProgress ?? progress?.progress ?? 0) * 100);
  const modelPresentation = generationModelPresentation(form.modelId, modelState);
  const visibleAsset = result ? (shownAsset === 'final' ? result.finalAsset ?? result.baseAsset : result.baseAsset) : null;
  const partial = result?.status === 'base-only' || result?.status === 'cancelled';

  return <main className="app-shell">
    <header className="app-header"><div><p className="eyebrow">Local image generation</p><h1>Zynalo Diffusion</h1></div><span className="milestone-badge">Detail Pass</span></header>
    <nav className="app-nav" aria-label="Application sections"><button className={view === 'workspace' ? 'active' : ''} onClick={() => setView('workspace')}>Generate</button><button className={view === 'models' ? 'active' : ''} onClick={() => setView('models')}>Model Library</button><button className={view === 'diagnostics' ? 'active' : ''} onClick={() => setView('diagnostics')}>Diagnostics</button></nav>
    {view === 'models' && <ModelLibraryPanel runtime={runtime} onChanged={modelsChanged} />}
    {view === 'diagnostics' && <DiagnosticsPanel runtime={runtime} />}
    {view === 'workspace' && <div className="workspace">
      <form className="generation-panel" onSubmit={generate}><section className="panel-heading"><div><p className="eyebrow">Generation workspace</p><h2>Generate an image</h2></div></section>
        <TagsPromptIDE workspace={promptWorkspace} state={prompts} profile={promptProfile} hasSelectedModel={Boolean(selectedModel)} disabled={activeJobId !== null} onChange={setPromptState} />
        <label>Model<select value={form.modelId} onChange={(event) => void selectModel(event.target.value)} disabled={activeJobId !== null || models.length === 0}>{models.length === 0 && <option value="">No registered models</option>}{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <div className={`model-load-state ${modelPresentation.tone}`}><span>{modelPresentation.label}</span><button type="button" onClick={() => void loadSelected()} disabled={!modelPresentation.canLoad || activeJobId !== null}>{modelState.state === 'loading' ? 'Loading…' : 'Load model'}</button></div>
        <div className="field-grid"><NumberField label="Width" value={form.width} setValue={(value) => setBaseDimension('width', value)} disabled={activeJobId !== null} min={64} max={2048} step={8} /><NumberField label="Height" value={form.height} setValue={(value) => setBaseDimension('height', value)} disabled={activeJobId !== null} min={64} max={2048} step={8} /><NumberField label="Steps" value={form.steps} setValue={(value) => setField('steps', value)} disabled={activeJobId !== null} min={1} max={150} step={1} /><NumberField label="Guidance" value={form.guidance} setValue={(value) => setField('guidance', value)} disabled={activeJobId !== null} min={0} max={30} step={0.5} /></div>
        <label>Sampler<select value={form.sampler} onChange={(event) => setField('sampler', event.target.value as FormState['sampler'])} disabled={activeJobId !== null}><option value="checkpoint-default">Checkpoint default</option><option value="euler-ancestral">Euler a</option></select></label>
        <label>Seed <span className="optional">Optional until generation</span><input type="number" value={form.seed} onChange={(event) => setField('seed', event.target.value)} min={0} max={4_294_967_295} step={1} placeholder="Resolve a random seed" disabled={activeJobId !== null} /></label>
        <DetailPassControls baseWidth={form.width} baseHeight={form.height} preset={detailPreset} state={detailState} advanced={detailAdvanced} disabled={activeJobId !== null} availableUpscalers={availableUpscalers} {...(profileDetailPresets ? { presetOverrides: profileDetailPresets } : {})} onAdvanced={setDetailAdvanced} onState={setDetailState} onPreset={(preset, state) => { setDetailPreset(preset); setDetailState(state); }} />
        {error && <div className="error" role="alert">{error}<button type="button" onClick={() => setError('')}>Clear</button></div>}
        <div className="actions"><button className="primary-button" type="submit" disabled={activeJobId !== null || !modelPresentation.canGenerate}>Generate</button>{activeJobId && <button className="secondary-button" type="button" onClick={() => void cancel()}>Cancel</button>}</div>
      </form>
      <section className="result-panel" aria-live="polite"><div className="result-heading"><div><p className="eyebrow">Output</p><h2>{activeJobId ? 'Generating…' : partial ? 'Base result' : result?.finalAsset ? 'Final result' : result ? 'Generation complete' : 'Ready'}</h2></div>{progress && <span>{percentage}%</span>}</div>
        {activeJobId && <div className="progress-card"><progress className="progress-track" max={100} value={percentage}>{percentage}%</progress><p>{progress ? stageLabels[progress.stage] : 'Starting'}{progress?.currentStep ? ` · step ${progress.currentStep} of ${progress.totalSteps}` : ''}</p></div>}
        {result && visibleAsset ? <div className="result-card">
          {partial && <div className="partial-result"><strong>Detail Pass did not complete.</strong><span>{result.failure?.message ?? 'The base image is still available.'}</span><div className="partial-actions"><button type="button" onClick={() => setShownAsset('base')}>Use base image</button><button type="button" onClick={trySmallerDetailPass}>Try smaller</button><button type="button" onClick={() => setDetailAdvanced(true)}>Edit settings</button></div></div>}
          {result.finalAsset && <div className="asset-toggle"><button type="button" className={shownAsset === 'base' ? 'active' : ''} onClick={() => setShownAsset('base')}>View base</button><button type="button" className={shownAsset === 'final' ? 'active' : ''} onClick={() => setShownAsset('final')}>View final</button></div>}
          <p className="shown-version">{shownAsset === 'final' && result.finalAsset ? 'Final result' : 'Base result'} · {visibleAsset.width} × {visibleAsset.height}</p>
          <img src={visibleAsset.uri} alt={`${shownAsset === 'final' ? 'Final' : 'Base'} generated result for seed ${result.seed}`} />
          <dl><div><dt>Base seed</dt><dd>{result.seeds.baseSeed}</dd></div><div><dt>Detail seed</dt><dd>{result.seeds.detailSeed ?? '—'}</dd></div><div><dt>Engine time</dt><dd>{result.durationMs} ms</dd></div><div><dt>Status</dt><dd>{result.status}</dd></div><div><dt>Asset</dt><dd>{visibleAsset.id}</dd></div></dl>
          <details className="result-metadata"><summary>Exact generation metadata</summary><pre>{JSON.stringify({ parameters: result.parameters, seeds: result.seeds, stages: result.stages, basePixelSha256: result.basePixelSha256, finalPixelSha256: result.finalPixelSha256, failure: result.failure }, null, 2)}</pre></details>
        </div> : !activeJobId && <div className="empty-state"><div className="empty-mark">✦</div><p>Your generated image will appear here.</p><span>Import, select, and load an SDXL checkpoint to begin.</span></div>}
      </section>
    </div>}
  </main>;
}

interface NumberFieldProps { label: string; value: number; setValue(value: number): void; disabled: boolean; min: number; max: number; step: number }
function NumberField({ label, value, setValue, disabled, min, max, step }: NumberFieldProps) { return <label>{label}<input type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} disabled={disabled} min={min} max={max} step={step} /></label>; }
