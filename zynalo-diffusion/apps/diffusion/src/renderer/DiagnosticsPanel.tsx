import { useCallback, useEffect, useState } from 'react';
import type { DiagnosticsReport, DiagnosticValue } from '@zynalo/diffusion-contracts';
import type { DiffusionRuntime } from './runtime/DiffusionRuntime';

const message = (error: unknown) => error instanceof Error ? error.message : String(error);
export function DiagnosticsPanel({ runtime }: { runtime: DiffusionRuntime }) {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { setBusy(true); setError(''); try { setReport(await runtime.getDiagnostics()); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } }, [runtime]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <section className="diagnostics-view"><div className="view-heading"><div><p className="eyebrow">Support information</p><h2>Diagnostics</h2></div><div className="card-actions"><button onClick={() => void refresh()} disabled={busy}>Refresh</button><button onClick={() => void runtime.copyDiagnostics()}>Copy report</button><button onClick={() => void runtime.saveDiagnostics()}>Save JSON</button></div></div>
    <p className="view-copy">Reports omit prompts, images, environment variables, credentials, and full personal paths.</p>{error && <div className="error" role="alert">{error}</div>}
    {report && <div className="diagnostic-groups">
      <DiagnosticGroup title="Application" values={{ Version: report.application.version, Mode: report.application.mode, 'User data': report.application.userDataLocation, Outputs: report.application.outputLocation, Engine: report.application.engineState, Protocol: report.application.protocolVersion }} />
      <DiagnosticGroup title="Python runtime" values={{ Executable: report.python.executable, Python: report.python.version, ...report.python.packages }} />
      <DiagnosticGroup title="GPU / CUDA" values={{ CUDA: report.gpu.cudaAvailable, GPU: report.gpu.name, Runtime: report.gpu.cudaRuntime, Capability: report.gpu.computeCapability, 'VRAM (MB)': report.gpu.totalVramMb, 'Allocated (MB)': report.gpu.allocatedMb, 'Reserved (MB)': report.gpu.reservedMb, Driver: report.gpu.driver }} />
      <DiagnosticGroup title="Selected model" values={{ Selected: report.model.selected, Loaded: report.model.loaded, 'File status': report.model.fileStatus, 'File size': report.model.fileSize, SHA256: report.model.sha256, Compatibility: report.model.compatibility, 'Last validation': report.model.lastValidation, 'Last load error': report.model.lastLoadError }} />
    </div>}
  </section>;
}

function DiagnosticGroup({ title, values }: { title: string; values: Record<string, DiagnosticValue | string> }) {
  return <section className="diagnostic-card"><h3>{title}</h3>{Object.entries(values).map(([label, entry]) => {
    const item = typeof entry === 'string' ? null : entry;
    return <div className="diagnostic-row" key={label}><div><strong>{label}</strong><span>{String(item ? item.value ?? 'Unavailable' : entry)}</span></div>{item && <div className={`diagnostic-state ${item.severity}`}><b>{item.severity}</b><span>{item.message}</span>{item.action && <em>{item.action}</em>}</div>}</div>;
  })}</section>;
}
