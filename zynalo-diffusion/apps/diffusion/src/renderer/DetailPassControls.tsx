import type { DetailPassPreset, DetailPassUpscaler, EnabledHighResolutionPass, HighResolutionPass } from '@zynalo/diffusion-contracts';
import { alignDimension, resolveDetailPassPreset } from '@zynalo/diffusion-contracts';

export interface DetailPassState extends Omit<EnabledHighResolutionPass, 'enabled' | 'seed'> { seed: string }

export function initialDetailPassState(width: number, height: number): DetailPassState {
  const preset = resolveDetailPassPreset('standard', width, height);
  if (!preset.enabled) throw new Error('Standard Detail Pass preset must be enabled.');
  return { ...preset, seed: '' };
}

export function detailPassRequest(preset: DetailPassPreset, state: DetailPassState): HighResolutionPass {
  if (preset === 'off') return { enabled: false };
  const { seed, prompt, negativePrompt, ...settings } = state;
  return {
    enabled: true, ...settings,
    ...(settings.promptMode === 'custom' ? { prompt: prompt ?? '' } : {}),
    ...(settings.negativePromptMode === 'custom' ? { negativePrompt: negativePrompt ?? '' } : {}),
    ...(settings.seedMode === 'custom' ? { seed: Number(seed) } : {}),
  };
}

interface DetailPassControlsProps {
  baseWidth: number;
  baseHeight: number;
  preset: DetailPassPreset;
  state: DetailPassState;
  advanced: boolean;
  disabled: boolean;
  presetOverrides?: Partial<Record<'standard' | 'strong', { scale?: number; strength?: number; steps?: number; upscaler?: DetailPassUpscaler }>>;
  availableUpscalers: DetailPassUpscaler[];
  onPreset(preset: DetailPassPreset, state: DetailPassState): void;
  onState(state: DetailPassState): void;
  onAdvanced(value: boolean): void;
}

const descriptions: Record<DetailPassPreset, string> = {
  off: 'Generate at the selected base resolution.',
  standard: 'Create the composition first, then redraw it at a larger size while preserving the original structure.',
  strong: 'Add more new detail during the larger second pass, with a greater chance of changing faces, poses, or small objects.',
};

export function DetailPassControls(props: DetailPassControlsProps) {
  const { baseWidth, baseHeight, preset, state, advanced, disabled, presetOverrides, availableUpscalers, onPreset, onState, onAdvanced } = props;
  const choosePreset = (next: DetailPassPreset) => {
    if (next === 'off') { onPreset(next, state); return }
    const resolved = resolveDetailPassPreset(next, baseWidth, baseHeight, presetOverrides?.[next]);
    if (resolved.enabled) onPreset(next, { ...resolved, seed: '' });
  };
  const update = <Key extends keyof DetailPassState>(key: Key, value: DetailPassState[Key]) => onState({ ...state, [key]: value });
  const updateScale = (scale: number) => onState({ ...state, scale, targetWidth: alignDimension(baseWidth * scale), targetHeight: alignDimension(baseHeight * scale) });
  const updateWidth = (targetWidth: number) => {
    if (!state.lockAspectRatio) { onState({ ...state, targetWidth, scale: targetWidth / baseWidth }); return }
    const scale = targetWidth / baseWidth;
    onState({ ...state, scale, targetWidth, targetHeight: alignDimension(baseHeight * scale) });
  };
  const updateHeight = (targetHeight: number) => {
    if (!state.lockAspectRatio) { onState({ ...state, targetHeight }); return }
    const scale = targetHeight / baseHeight;
    onState({ ...state, scale, targetHeight, targetWidth: alignDimension(baseWidth * scale) });
  };
  const enabled = preset !== 'off';
  const expensive = enabled && state.targetWidth * state.targetHeight >= 3_000_000;

  return <section className="detail-pass">
    <div className="detail-pass-heading"><div><h3>Detail Pass</h3><p>Two-pass SDXL high-res fix</p></div><button type="button" className="text-button" onClick={() => onAdvanced(!advanced)} disabled={disabled}>{advanced ? 'Guided' : 'Advanced'}</button></div>
    {!advanced && <div className="detail-presets" role="radiogroup" aria-label="Detail Pass preset">
      {(['off', 'standard', 'strong'] as const).map((item) => <label key={item} className={preset === item ? 'selected' : ''}>
        <span><input type="radio" name="detail-preset" checked={preset === item} onChange={() => choosePreset(item)} disabled={disabled} />{item[0]!.toUpperCase() + item.slice(1)}</span>
        <small>{descriptions[item]}</small>
      </label>)}
    </div>}
    {advanced && <div className="detail-advanced">
      <label className="toggle-row">High-res fix <input type="checkbox" checked={enabled} onChange={(event) => choosePreset(event.target.checked ? 'standard' : 'off')} disabled={disabled} /></label>
      {enabled && <>
        <div className="field-grid">
          <label>Upscaler<select value={state.upscaler} onChange={(event) => update('upscaler', event.target.value as DetailPassUpscaler)} disabled={disabled}><option value="lanczos">Lanczos</option><option value="realesrgan-anime6b" disabled={!availableUpscalers.includes('realesrgan-anime6b')}>R-ESRGAN 4x+ Anime6B{availableUpscalers.includes('realesrgan-anime6b') ? '' : ' (not configured)'}</option></select></label>
          <label>Scale<input type="number" value={state.scale} min={1.01} max={2} step={0.05} onChange={(event) => updateScale(Number(event.target.value))} disabled={disabled} /></label>
          <label>Final width<input type="number" value={state.targetWidth} min={64} max={3072} step={8} onChange={(event) => updateWidth(Number(event.target.value))} disabled={disabled} /></label>
          <label>Final height<input type="number" value={state.targetHeight} min={64} max={3072} step={8} onChange={(event) => updateHeight(Number(event.target.value))} disabled={disabled} /></label>
        </div>
        <label className="toggle-row">Lock aspect ratio <input type="checkbox" checked={state.lockAspectRatio} onChange={(event) => update('lockAspectRatio', event.target.checked)} disabled={disabled} /></label>
        <div className="field-grid">
          <label>Denoising strength<input type="number" value={state.strength} min={0.05} max={0.95} step={0.05} onChange={(event) => update('strength', Number(event.target.value))} disabled={disabled} /></label>
          <label>Second-pass steps<input type="number" value={state.steps} min={1} max={100} step={1} onChange={(event) => update('steps', Number(event.target.value))} disabled={disabled} /></label>
        </div>
        <p className="field-help">Lower values preserve the original image. Higher values let the model redraw more details and may change faces, clothing, poses, or composition.</p>
        <p className="field-help">Anime6B performs neural 4Ã— restoration in tiles, then resamples in memory to the exact selected final size.</p>
        <label>Second-pass prompt<select value={state.promptMode} onChange={(event) => update('promptMode', event.target.value as DetailPassState['promptMode'])} disabled={disabled}><option value="inherit">Inherit</option><option value="custom">Custom</option></select></label>
        {state.promptMode === 'custom' && <label>Custom detail prompt<textarea value={state.prompt ?? ''} onChange={(event) => update('prompt', event.target.value)} maxLength={4000} disabled={disabled} /></label>}
        <label>Second-pass negative<select value={state.negativePromptMode} onChange={(event) => update('negativePromptMode', event.target.value as DetailPassState['negativePromptMode'])} disabled={disabled}><option value="inherit">Inherit</option><option value="custom">Custom</option></select></label>
        {state.negativePromptMode === 'custom' && <label>Custom detail negative prompt<textarea value={state.negativePrompt ?? ''} onChange={(event) => update('negativePrompt', event.target.value)} maxLength={4000} disabled={disabled} /></label>}
        <label>Second-pass seed<select value={state.seedMode} onChange={(event) => update('seedMode', event.target.value as DetailPassState['seedMode'])} disabled={disabled}><option value="derived">Derived</option><option value="custom">Custom</option></select></label>
        {state.seedMode === 'custom' && <label>Detail seed<input type="number" value={state.seed} min={0} max={4_294_967_295} step={1} onChange={(event) => update('seed', event.target.value)} disabled={disabled} /></label>}
        <p className="field-help">Latent upscaling is not offered yet; it remains experimental until its SDXL noise schedule and quality are verified.</p>
      </>}
    </div>}
    <div className="resolved-size"><span>Base: {baseWidth} × {baseHeight}</span><span>Final: {enabled ? `${state.targetWidth} × ${state.targetHeight}` : `${baseWidth} × ${baseHeight}`}</span><span>Estimated time: {enabled ? 'roughly 2–3× longer' : 'base generation only'}</span></div>
    {expensive && <p className="cost-warning">This final size is unusually expensive. VRAM estimates are approximate; actual CUDA allocation is authoritative.</p>}
  </section>;
}
