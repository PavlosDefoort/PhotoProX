import type {
  DiffusionBridge,
  EngineLifecycleNotification,
  GenerateRequest,
  GenerationProgress,
  GenerationResult,
  HardwareProfile,
  ModelInfo,
  DiagnosticsReport,
  ImportModelRequest,
  LoadedModelState,
  ModelFileChoice,
  ModelImportInspection,
  ModelLibraryItem,
  ModelOperationProgress,
  RemoveModelRequest,
} from '@zynalo/diffusion-contracts';

export type RuntimeProgressListener = (progress: GenerationProgress) => void;

export interface ActiveGeneration {
  jobId: string;
  result: Promise<GenerationResult>;
}

export interface DiffusionRuntime {
  inspectHardware(): Promise<HardwareProfile>;
  listModels(): Promise<ModelInfo[]>;
  generate(request: GenerateRequest, onProgress?: RuntimeProgressListener): Promise<ActiveGeneration>;
  cancel(jobId: string): Promise<void>;
  onLifecycle(listener: (event: EngineLifecycleNotification) => void): () => void;
  chooseModelFile(): Promise<ModelFileChoice>;
  inspectModelImport(token: string): Promise<ModelImportInspection>;
  importModel(request: ImportModelRequest): Promise<ModelLibraryItem>;
  cancelModelImport(token: string): Promise<void>;
  listModelLibrary(): Promise<ModelLibraryItem[]>;
  revalidateModel(modelId: string): Promise<ModelLibraryItem>;
  removeModel(request: RemoveModelRequest): Promise<void>;
  selectModel(modelId: string): Promise<LoadedModelState>;
  loadModel(modelId: string): Promise<LoadedModelState>;
  getLoadedModel(): Promise<LoadedModelState>;
  getDiagnostics(): Promise<DiagnosticsReport>;
  copyDiagnostics(): Promise<void>;
  saveDiagnostics(): Promise<{ cancelled: boolean }>;
  copyModelSha(modelId: string): Promise<void>;
  onModelOperationProgress(listener: (event: ModelOperationProgress) => void): () => void;
  dispose(): void;
}

export class ElectronDiffusionRuntime implements DiffusionRuntime {
  readonly #bridge: DiffusionBridge;
  readonly #latestProgress = new Map<string, GenerationProgress>();
  readonly #listeners = new Map<string, RuntimeProgressListener>();
  readonly #unsubscribe: () => void;
  readonly #unsubscribeLifecycle: () => void;
  readonly #lifecycleListeners = new Set<(event: EngineLifecycleNotification) => void>();
  readonly #modelOperationListeners = new Set<(event: ModelOperationProgress) => void>();
  readonly #unsubscribeModelOperations: () => void;

  constructor(bridge: DiffusionBridge) {
    this.#bridge = bridge;
    this.#unsubscribe = bridge.onProgress((progress) => {
      this.#latestProgress.set(progress.jobId, progress);
      this.#listeners.get(progress.jobId)?.(progress);
    });
    this.#unsubscribeLifecycle = bridge.onLifecycle((event) => {
      for (const listener of this.#lifecycleListeners) listener(event);
    });
    this.#unsubscribeModelOperations = bridge.onModelOperationProgress((event) => {
      for (const listener of this.#modelOperationListeners) listener(event);
    });
  }

  inspectHardware(): Promise<HardwareProfile> {
    return this.#bridge.inspectHardware();
  }

  listModels(): Promise<ModelInfo[]> {
    return this.#bridge.listModels();
  }

  async generate(
    request: GenerateRequest,
    onProgress?: RuntimeProgressListener,
  ): Promise<ActiveGeneration> {
    const { jobId } = await this.#bridge.generate(request);
    if (onProgress) {
      this.#listeners.set(jobId, onProgress);
      const latest = this.#latestProgress.get(jobId);
      if (latest) onProgress(latest);
    }
    const result = this.#bridge.result(jobId).finally(() => {
      this.#listeners.delete(jobId);
      this.#latestProgress.delete(jobId);
    });
    return { jobId, result };
  }

  cancel(jobId: string): Promise<void> {
    return this.#bridge.cancel(jobId);
  }

  onLifecycle(listener: (event: EngineLifecycleNotification) => void): () => void {
    this.#lifecycleListeners.add(listener);
    return () => this.#lifecycleListeners.delete(listener);
  }

  chooseModelFile() { return this.#bridge.chooseModelFile(); }
  inspectModelImport(token: string) { return this.#bridge.inspectModelImport(token); }
  importModel(request: ImportModelRequest) { return this.#bridge.importModel(request); }
  cancelModelImport(token: string) { return this.#bridge.cancelModelImport(token); }
  listModelLibrary() { return this.#bridge.listModelLibrary(); }
  revalidateModel(modelId: string) { return this.#bridge.revalidateModel(modelId); }
  removeModel(request: RemoveModelRequest) { return this.#bridge.removeModel(request); }
  selectModel(modelId: string) { return this.#bridge.selectModel(modelId); }
  loadModel(modelId: string) { return this.#bridge.loadModel(modelId); }
  getLoadedModel() { return this.#bridge.getLoadedModel(); }
  getDiagnostics() { return this.#bridge.getDiagnostics(); }
  copyDiagnostics() { return this.#bridge.copyDiagnostics(); }
  saveDiagnostics() { return this.#bridge.saveDiagnostics(); }
  copyModelSha(modelId: string) { return this.#bridge.copyModelSha(modelId); }
  onModelOperationProgress(listener: (event: ModelOperationProgress) => void): () => void {
    this.#modelOperationListeners.add(listener);
    return () => this.#modelOperationListeners.delete(listener);
  }

  dispose(): void {
    this.#unsubscribe();
    this.#unsubscribeLifecycle();
    this.#unsubscribeModelOperations();
    this.#lifecycleListeners.clear();
    this.#modelOperationListeners.clear();
    this.#listeners.clear();
    this.#latestProgress.clear();
  }
}
