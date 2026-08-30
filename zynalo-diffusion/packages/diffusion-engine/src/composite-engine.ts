import type {
  DiffusionEngine,
  GenerateRequest,
  GenerationJob,
  HardwareProfile,
  ModelInfo,
} from '@zynalo/diffusion-contracts';

export interface EngineRoute {
  engine: DiffusionEngine;
  modelIds: ReadonlySet<string>;
  primary?: boolean;
}

export class CompositeDiffusionEngine implements DiffusionEngine {
  readonly #routes: EngineRoute[];
  readonly #jobs = new Map<string, DiffusionEngine>();

  constructor(routes: EngineRoute[]) {
    if (routes.length === 0) throw new Error('At least one diffusion engine route is required.');
    this.#routes = routes;
  }

  inspectHardware(): Promise<HardwareProfile> {
    const route = this.#routes.find((candidate) => candidate.primary) ?? this.#routes[0]!;
    return route.engine.inspectHardware();
  }

  async listModels(): Promise<ModelInfo[]> {
    const modelGroups = await Promise.all(this.#routes.map((route) => route.engine.listModels()));
    return modelGroups.flat();
  }

  async generate(request: GenerateRequest): Promise<GenerationJob> {
    const route = this.#routes.find((candidate) => candidate.modelIds.has(request.modelId));
    if (!route) throw new TypeError(`No diffusion engine is registered for model ${request.modelId}.`);
    const job = await route.engine.generate(request);
    this.#jobs.set(job.jobId, route.engine);
    return {
      jobId: job.jobId,
      result: job.result.finally(() => this.#jobs.delete(job.jobId)),
      onProgress: job.onProgress,
    };
  }

  async cancel(jobId: string): Promise<void> {
    const engine = this.#jobs.get(jobId);
    if (!engine) throw new Error('Unknown generation job.');
    await engine.cancel(jobId);
  }
}
