import { useCallback, useEffect, useState } from 'react';
import type { ModelImportInspection, ModelLibraryItem, ModelOperationProgress } from '@zynalo/diffusion-contracts';
import type { DiffusionRuntime } from './runtime/DiffusionRuntime';

interface Props { runtime: DiffusionRuntime; onChanged(): void }
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const size = (bytes: number) => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GiB` : `${(bytes / 1024 ** 2).toFixed(1)} MiB`;

export function ModelLibraryPanel({ runtime, onChanged }: Props) {
  const [models, setModels] = useState<ModelLibraryItem[]>([]);
  const [inspection, setInspection] = useState<ModelImportInspection | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'external' | 'managed'>('external');
  const [progress, setProgress] = useState<ModelOperationProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => { setModels(await runtime.listModelLibrary()); onChanged(); }, [runtime, onChanged]);
  useEffect(() => { void refresh().catch((reason) => setError(message(reason))); return runtime.onModelOperationProgress(setProgress); }, [runtime, refresh]);

  async function choose() {
    setError(''); const choice = await runtime.chooseModelFile(); if (choice.cancelled || !choice.selection) return;
    setBusy(true); setProgress(null);
    try {
      const inspected = await runtime.inspectModelImport(choice.selection.token);
      setInspection(inspected); setDisplayName(choice.selection.fileName.replace(/\.safetensors$/i, ''));
    } catch (reason) { if (!message(reason).toLowerCase().includes('cancel')) setError(message(reason)); }
    finally { setBusy(false); }
  }

  async function commitImport() {
    if (!inspection) return; setBusy(true); setError('');
    try { await runtime.importModel({ token: inspection.token, displayName, mode }); setInspection(null); setProgress(null); await refresh(); }
    catch (reason) { if (!message(reason).toLowerCase().includes('cancel')) setError(message(reason)); }
    finally { setBusy(false); }
  }

  async function action(operation: () => Promise<unknown>) {
    setBusy(true); setError(''); try { await operation(); await refresh(); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }

  return <section className="library-view">
    <div className="view-heading"><div><p className="eyebrow">Local checkpoints</p><h2>Model Library</h2></div><button className="primary-button" onClick={() => void choose()} disabled={busy}>Import model</button></div>
    <p className="view-copy">Register an existing checkpoint without copying it, or place a verified copy in Zynalo-managed storage. Zynalo never downloads models.</p>
    {error && <div className="error" role="alert">{error}<button type="button" onClick={() => setError('')}>Clear</button></div>}
    {progress && busy && <div className="progress-card"><progress max={1} value={progress.progress} /><p>{progress.stage} · {Math.round(progress.progress * 100)}%</p></div>}
    {inspection && <div className="import-card">
      <h3>Import {inspection.fileName}</h3>
      <dl><div><dt>Validation</dt><dd>{inspection.validationStatus}</dd></div><div><dt>Compatibility</dt><dd>{inspection.compatibility.summary}</dd></div><div><dt>Size</dt><dd>{size(inspection.fileSize)}</dd></div><div><dt>SHA-256</dt><dd className="hash">{inspection.sha256}</dd></div></dl>
      <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
      <fieldset><legend>Storage</legend>
        <label className="radio"><input type="radio" checked={mode === 'external'} onChange={() => setMode('external')} /> Register in place</label><p>Moving, renaming, changing, or deleting the original file breaks this registration.</p>
        <label className="radio"><input type="radio" checked={mode === 'managed'} onChange={() => setMode('managed')} /> Copy into Zynalo</label><p>Requires another {size(inspection.fileSize)} plus working space.</p>
      </fieldset>
      <div className="actions"><button className="primary-button" disabled={busy || inspection.validationStatus !== 'valid'} onClick={() => void commitImport()}>Import</button><button className="secondary-button" onClick={() => { void runtime.cancelModelImport(inspection.token); setInspection(null); }}>Cancel</button></div>
    </div>}
    <div className="model-list">{models.length === 0 ? <div className="empty-state"><p>No registered models.</p><span>Import a local SDXL `.safetensors` checkpoint to begin.</span></div> : models.map((model) => <article className="model-card" key={model.id}>
      <div className="model-title"><div><h3>{model.displayName}</h3><p>{model.sourceKind === 'external' ? 'External file' : 'Zynalo-managed copy'} · {model.locationDisplay}</p></div><div className="badges">{model.selected && <span>Selected</span>}{model.loaded && <span>Loaded</span>}<span className={`status-${model.validationStatus}`}>{model.validationStatus}</span></div></div>
      <dl><div><dt>Compatibility</dt><dd>{model.compatibility.summary}</dd></div><div><dt>Size</dt><dd>{size(model.fileSize)}</dd></div><div><dt>SHA-256</dt><dd title={model.sha256}>{model.sha256.slice(0, 16)}… <button onClick={() => void runtime.copyModelSha(model.id)}>Copy full</button></dd></div><div><dt>Last validation</dt><dd>{new Date(model.lastValidatedAt).toLocaleString()}</dd></div></dl>
      {model.lastLoadError && <p className="inline-error">Last load error: {model.lastLoadError}</p>}
      <div className="card-actions"><button onClick={() => void action(() => runtime.selectModel(model.id))}>Select</button><button onClick={() => void action(() => runtime.loadModel(model.id))} disabled={model.validationStatus !== 'valid'}>Load</button><button onClick={() => void action(() => runtime.revalidateModel(model.id))}>Revalidate</button><button onClick={() => void action(() => runtime.removeModel({ modelId: model.id, deleteManagedFile: false }))}>Remove registration</button>{model.sourceKind === 'managed' && <button className="danger-button" onClick={() => { if (window.confirm('Permanently delete this managed checkpoint? This cannot be undone.')) void action(() => runtime.removeModel({ modelId: model.id, deleteManagedFile: true })); }}>Delete managed copy</button>}</div>
    </article>)}</div>
  </section>;
}
