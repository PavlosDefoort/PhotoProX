import type {
  DiffusionEngine, GenerateRequest, GeneratedAsset, GenerationJob, GenerationProgress, GenerationResult,
  HardwareProfile, ModelInfo, ProgressListener, ResolvedGenerateRequest,
} from '@zynalo/diffusion-contracts';
import { resolveGenerateRequest, validateGenerateRequest } from '@zynalo/diffusion-contracts';

export class GenerationCancelledError extends Error {
  constructor(jobId: string) { super(`Generation ${jobId} was cancelled.`); this.name = 'GenerationCancelledError' }
}

export interface MockEngineOptions { tickMs?: number; idFactory?: () => string; failDetailPass?: boolean }
interface MutableJob { cancelled: boolean; listeners: Set<ProgressListener>; latestProgress?: GenerationProgress }
let nextJobNumber = 0;
function defaultJobId(): string { nextJobNumber += 1; return `mock-${Date.now().toString(36)}-${nextJobNumber.toString(36)}` }
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193) }
  return hash >>> 0;
}
function fallbackSeed(request: GenerateRequest): number {
  return request.seed ?? fnv1a([request.prompt, request.negativePrompt ?? '', request.modelId, request.width, request.height].join('|'));
}
function signature(request: ResolvedGenerateRequest, kind: 'base' | 'final'): string {
  const detail = kind === 'final' && request.detailPass.enabled ? JSON.stringify(request.detailPass) : '';
  const value = fnv1a([request.prompt, request.negativePrompt ?? '', request.modelId, request.seed, request.width, request.height, request.steps, request.guidance, request.sampler, request.clipLayerSelection, kind, detail].join('|')).toString(16).padStart(8, '0');
  return value.repeat(8);
}
function mockAsset(hash: string, width: number, height: number, seed: number): GeneratedAsset {
  return { id: `mock-${hash.slice(0, 8)}`, uri: `zynalo-asset://mock/${hash.slice(0, 8)}?width=${width}&height=${height}&seed=${seed}`, mimeType: 'image/svg+xml', width, height };
}

export class MockDiffusionEngine implements DiffusionEngine {
  readonly #jobs = new Map<string, MutableJob>();
  readonly #tickMs: number;
  readonly #idFactory: () => string;
  readonly #failDetailPass: boolean;
  constructor(options: MockEngineOptions = {}) {
    this.#tickMs = options.tickMs ?? 45; this.#idFactory = options.idFactory ?? defaultJobId; this.#failDetailPass = options.failDetailPass ?? false;
  }
  async inspectHardware(): Promise<HardwareProfile> {
    return { backend: 'mock', deviceName: 'Deterministic mock device', capabilities: { detailPass: true, detailPassUpscalers: ['lanczos'] } };
  }
  async listModels(): Promise<ModelInfo[]> {
    return [{ id: 'mock-starter-v1', name: 'Zynalo Mock Starter', family: 'Mock Diffusion', installed: true }];
  }
  async generate(request: GenerateRequest): Promise<GenerationJob> {
    const validation = validateGenerateRequest(request);
    if (!validation.success) throw new TypeError(validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '));
    const resolved = resolveGenerateRequest(validation.data, () => fallbackSeed(validation.data));
    const jobId = this.#idFactory();
    if (this.#jobs.has(jobId)) throw new Error(`Duplicate mock job ID: ${jobId}`);
    const mutableJob: MutableJob = { cancelled: false, listeners: new Set() }; this.#jobs.set(jobId, mutableJob);
    const result = this.#run(jobId, resolved, mutableJob).finally(() => this.#jobs.delete(jobId)); result.catch(() => undefined);
    return { jobId, result, onProgress: (listener) => { mutableJob.listeners.add(listener); if (mutableJob.latestProgress) listener(mutableJob.latestProgress); return () => mutableJob.listeners.delete(listener) } };
  }
  async cancel(jobId: string): Promise<void> { const job = this.#jobs.get(jobId); if (job) job.cancelled = true }

  async #run(jobId: string, request: ResolvedGenerateRequest, job: MutableJob): Promise<GenerationResult> {
    let latestOverall = 0;
    const emit = (stage: GenerationProgress['stage'], stageProgress: number, overallProgress: number, extra: Partial<GenerationProgress> = {}) => {
      this.#throwIfCancelled(jobId, job); latestOverall = Math.max(latestOverall, overallProgress);
      const update: GenerationProgress = { jobId, stage, stageProgress, overallProgress: latestOverall, progress: latestOverall, ...extra };
      job.latestProgress = update; for (const listener of job.listeners) listener(update);
    };
    const tick = async () => { await new Promise<void>((resolve) => setTimeout(resolve, this.#tickMs)); this.#throwIfCancelled(jobId, job) };
    await tick(); emit('queued', 0, 0); await tick(); emit('loading-model', 1, 0.02); emit('encoding-prompt', 1, 0.04);
    const detailSteps = request.detailPass.enabled ? request.detailPass.steps : 0;
    const totalSteps = request.steps + detailSteps;
    for (let currentStep = 1; currentStep <= request.steps; currentStep += 1) {
      emit('base-generating', currentStep / request.steps, 0.04 + (currentStep / totalSteps) * 0.8, { currentStep, totalSteps: request.steps, pass: 'base' }); await tick();
    }
    emit('base-decoding', 1, request.detailPass.enabled ? 0.58 : 0.9, { pass: 'base' }); await tick();
    const baseHash = signature(request, 'base');
    const baseAsset = mockAsset(baseHash, request.width, request.height, request.seed);
    const baseResult = (status: 'base-only' | 'cancelled', failure: GenerationResult['failure']): GenerationResult => ({
      jobId, seed: request.seed, durationMs: (request.steps + 4) * this.#tickMs, status, output: baseAsset, baseAsset,
      stages: [{ stage: 'base', durationMs: request.steps * this.#tickMs }, { stage: 'decode', durationMs: this.#tickMs }],
      seeds: request.detailPass.enabled ? { baseSeed: request.seed, detailSeed: request.detailPass.seed, derivation: request.detailPass.seedMode === 'derived' ? 'zynalo-detail-seed-v1' : 'explicit' } : { baseSeed: request.seed, derivation: 'explicit' },
      parameters: request, basePixelSha256: baseHash, ...(failure ? { failure } : {}),
    });
    if (!request.detailPass.enabled) {
      emit('saving', 1, 0.98); await tick(); emit('completed', 1, 1);
      return { ...baseResult('base-only', undefined), status: 'completed' };
    }
    let detailStage: GenerationProgress['stage'] = 'upscaling';
    try {
      emit('upscaling', 0, 0.6); await tick(); emit('upscaling', 1, 0.64);
      detailStage = 'detail-preparing';
      emit('detail-preparing', 1, 0.67, { pass: 'detail' }); await tick();
      detailStage = 'detail-generating';
      if (this.#failDetailPass) throw new Error('Simulated detail-stage GPU out of memory.');
      for (let currentStep = 1; currentStep <= request.detailPass.steps; currentStep += 1) {
        emit('detail-generating', currentStep / request.detailPass.steps, 0.67 + (currentStep / request.detailPass.steps) * 0.26, { currentStep, totalSteps: request.detailPass.steps, pass: 'detail' }); await tick();
      }
      detailStage = 'final-decoding'; emit('final-decoding', 1, 0.95, { pass: 'detail' }); await tick();
      detailStage = 'saving'; emit('saving', 1, 0.98); await tick(); emit('completed', 1, 1);
      const finalHash = signature(request, 'final'); const finalAsset = mockAsset(finalHash, request.detailPass.targetWidth, request.detailPass.targetHeight, request.detailPass.seed);
      return {
        jobId, seed: request.seed, durationMs: (request.steps + request.detailPass.steps + 8) * this.#tickMs, status: 'completed', output: finalAsset, baseAsset, finalAsset,
        stages: [{ stage: 'base', durationMs: request.steps * this.#tickMs }, { stage: 'upscale', durationMs: this.#tickMs }, { stage: 'detail', durationMs: request.detailPass.steps * this.#tickMs }, { stage: 'decode', durationMs: 2 * this.#tickMs }, { stage: 'save', durationMs: this.#tickMs }],
        seeds: { baseSeed: request.seed, detailSeed: request.detailPass.seed, derivation: request.detailPass.seedMode === 'derived' ? 'zynalo-detail-seed-v1' : 'explicit' }, parameters: request, basePixelSha256: baseHash, finalPixelSha256: finalHash,
      };
    } catch (error) {
      if (error instanceof GenerationCancelledError) return baseResult('cancelled', { stage: detailStage, code: 'CANCELLED', message: 'Detail Pass cancelled. The base image is still available.', retryable: true });
      return baseResult('base-only', { stage: detailStage, code: 'GPU_OUT_OF_MEMORY', message: error instanceof Error ? error.message : 'Detail Pass failed.', retryable: true });
    }
  }
  #throwIfCancelled(jobId: string, job: MutableJob): void { if (job.cancelled) throw new GenerationCancelledError(jobId) }
}

export * from './composite-engine';
export * from './python-engine';
