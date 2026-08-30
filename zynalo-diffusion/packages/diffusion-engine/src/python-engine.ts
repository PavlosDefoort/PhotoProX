import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import type {
  DiffusionEngine,
  EngineHostMessage,
  EngineLifecycleNotification,
  GenerateRequest,
  GenerationJob,
  GenerationProgress,
  GenerationResult,
  HardwareProfile,
  HostCommandName,
  HostGenerationErrorMessage,
  HostGenerationResultMessage,
  HostProgressMessage,
  HostStatus,
  HostRuntimeDiagnostics,
  ModelInfo,
  ProgressListener,
} from '@zynalo/diffusion-contracts';
import {
  ENGINE_HOST_PROTOCOL,
  validateEngineHostMessage,
  validateGenerateRequest,
  validateHostHardware,
  validateHostModels,
  validateHostRuntimeDiagnostics,
  validationMessage,
  resolveGenerateRequest,
} from '@zynalo/diffusion-contracts';
import { GenerationCancelledError } from './index';

const MAX_LINE_BYTES = 1024 * 1024;
const MAX_STDERR_CHARS = 64 * 1024;

export interface PythonEngineOptions {
  pythonExecutable: string;
  moduleRoot: string;
  checkpoint?: string;
  anime6bModel?: string;
  outputRoot: string;
  modelId?: string;
  modelName?: string;
  checkpointSha256?: string;
  configSource?: string;
  deviceIndex?: number;
  dtype?: 'float16' | 'bfloat16' | 'float32';
  offline?: boolean;
  startupTimeoutMs?: number;
  commandTimeoutMs?: number;
  launchOverride?: {
    executable: string;
    args: string[];
    env?: Record<string, string>;
  };
}

export interface EngineModelReference {
  id: string;
  name: string;
  checkpoint: string;
  sha256: string;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

interface PendingCommand {
  deferred: Deferred<unknown>;
  timer: ReturnType<typeof setTimeout>;
}

interface MutableHostJob {
  deferred: Deferred<GenerationResult>;
  listeners: Set<ProgressListener>;
  latestProgress?: GenerationProgress;
}

export class PythonEngineHostError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'PythonEngineHostError';
  }
}

export class PythonEngineCrashedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PythonEngineCrashedError';
  }
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size && Object.keys(value).every((key) => expected.has(key));
}

export class PythonDiffusionEngine implements DiffusionEngine {
  readonly #options: PythonEngineOptions;
  readonly #pending = new Map<string, PendingCommand>();
  readonly #jobs = new Map<string, MutableHostJob>();
  readonly #earlyJobMessages = new Map<string, Array<HostProgressMessage | HostGenerationResultMessage | HostGenerationErrorMessage>>();
  readonly #lifecycleListeners = new Set<(event: EngineLifecycleNotification) => void>();
  #child: ChildProcessWithoutNullStreams | null = null;
  #stdoutBuffer = '';
  #stderr = '';
  #commandSequence = 0;
  #state: 'stopped' | 'starting' | 'ready' | 'stopping' | 'crashed' = 'stopped';
  #readyDeferred: Deferred<void> | null = null;
  #exitDeferred: Deferred<void> | null = null;
  #loadedModelId: string | undefined;
  #modelLoadInFlight = false;

  constructor(options: PythonEngineOptions) {
    this.#options = options;
  }

  get state(): string {
    return this.#state;
  }

  onLifecycle(listener: (event: EngineLifecycleNotification) => void): () => void {
    this.#lifecycleListeners.add(listener);
    return () => this.#lifecycleListeners.delete(listener);
  }

  async start(): Promise<void> {
    if (this.#state === 'ready') return;
    if (this.#state !== 'stopped') throw new Error(`Cannot start Python engine while ${this.#state}.`);
    this.#state = 'starting';
    this.#readyDeferred = deferred<void>();
    this.#exitDeferred = deferred<void>();
    this.#emitLifecycle(this.#lifecycleEvent('initializing', 'Starting Python diffusion engine.', this.#options.modelId));

    const launch = this.#launchCommand();
    const child = spawn(launch.executable, launch.args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...launch.env },
      shell: false,
    });
    this.#child = child;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => this.#consumeStdout(chunk));
    child.stderr.on('data', (chunk: string) => {
      this.#stderr = `${this.#stderr}${chunk}`.slice(-MAX_STDERR_CHARS);
    });
    child.on('error', (error) => this.#handleCrash(`Failed to spawn Python engine: ${error.message}`));
    child.on('exit', (code, signal) => this.#handleExit(code, signal));

    const timer = setTimeout(() => {
      this.#readyDeferred?.reject(new PythonEngineHostError('Python engine startup timed out.', 'STARTUP_TIMEOUT'));
      this.#terminate();
    }, this.#options.startupTimeoutMs ?? 180_000);
    try {
      await this.#readyDeferred.promise;
    } finally {
      clearTimeout(timer);
    }
  }

  async inspectHardware(): Promise<HardwareProfile> {
    const value = await this.#sendCommand('inspect-hardware', {});
    const validation = validateHostHardware(value);
    if (!validation.success) throw new PythonEngineHostError(validationMessage(validation.issues), 'INVALID_RESPONSE');
    return validation.data;
  }

  async listModels(): Promise<ModelInfo[]> {
    const value = await this.#sendCommand('list-models', {});
    const validation = validateHostModels(value);
    if (!validation.success) throw new PythonEngineHostError(validationMessage(validation.issues), 'INVALID_RESPONSE');
    return validation.data;
  }

  async status(): Promise<HostStatus> {
    const value = await this.#sendCommand('status', {});
    if (
      !isRecord(value) ||
      Object.keys(value).some((key) => !['state', 'modelLoadCount', 'generationCount', 'activeJobId', 'loadedModelId'].includes(key)) ||
      !['state', 'modelLoadCount', 'generationCount'].every((key) => key in value) ||
      !['loading', 'ready', 'generating', 'stopping'].includes(String(value.state))
    ) {
      throw new PythonEngineHostError('Invalid status response.', 'INVALID_RESPONSE');
    }
    if (!Number.isInteger(value.modelLoadCount) || Number(value.modelLoadCount) < 0 || !Number.isInteger(value.generationCount) || Number(value.generationCount) < 0) {
      throw new PythonEngineHostError('Invalid status counters.', 'INVALID_RESPONSE');
    }
    if (value.activeJobId !== undefined && typeof value.activeJobId !== 'string') {
      throw new PythonEngineHostError('Invalid active job ID.', 'INVALID_RESPONSE');
    }
    if (value.loadedModelId !== undefined && (typeof value.loadedModelId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.loadedModelId))) {
      throw new PythonEngineHostError('Invalid loaded model ID.', 'INVALID_RESPONSE');
    }
    return value as unknown as HostStatus;
  }

  async runtimeDiagnostics(): Promise<HostRuntimeDiagnostics> {
    const value = await this.#sendCommand('runtime-diagnostics', {}, 60_000);
    const validation = validateHostRuntimeDiagnostics(value);
    if (!validation.success) throw new PythonEngineHostError(validationMessage(validation.issues), 'INVALID_RESPONSE');
    return validation.data;
  }

  async loadModel(model: EngineModelReference): Promise<{ modelId: string; loadCount: number }> {
    if (this.#modelLoadInFlight) throw new PythonEngineHostError('A model load is already in progress.', 'ENGINE_BUSY', true);
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(model.id) || !/^[a-f0-9]{64}$/.test(model.sha256) || !path.isAbsolute(model.checkpoint)) {
      throw new TypeError('Invalid internal model reference.');
    }
    this.#modelLoadInFlight = true;
    try {
      const value = await this.#sendCommand('load-model', { model }, 300_000);
      if (!isRecord(value) || !exactKeys(value, ['modelId', 'loadCount']) || value.modelId !== model.id || !Number.isInteger(value.loadCount)) {
        throw new PythonEngineHostError('Invalid load-model response.', 'INVALID_RESPONSE');
      }
      this.#loadedModelId = model.id;
      return value as { modelId: string; loadCount: number };
    } finally {
      this.#modelLoadInFlight = false;
    }
  }

  async unloadModel(): Promise<void> {
    const value = await this.#sendCommand('unload-model', {}, 60_000);
    if (value !== null) throw new PythonEngineHostError('Invalid unload-model response.', 'INVALID_RESPONSE');
    this.#loadedModelId = undefined;
  }

  async generate(request: GenerateRequest): Promise<GenerationJob> {
    const validation = validateGenerateRequest(request);
    if (!validation.success) throw new TypeError(validationMessage(validation.issues));
    if (validation.data.modelId !== this.#loadedModelId) throw new TypeError('Generation requires the selected model to be loaded.');
    const resolvedRequest = resolveGenerateRequest(validation.data);
    const response = await this.#sendCommand('generate', { request: resolvedRequest });
    if (!isRecord(response) || !exactKeys(response, ['jobId']) || typeof response.jobId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(response.jobId)) {
      throw new PythonEngineHostError('Invalid generate response.', 'INVALID_RESPONSE');
    }
    const jobId = response.jobId;
    const state: MutableHostJob = { deferred: deferred<GenerationResult>(), listeners: new Set() };
    state.deferred.promise.catch(() => undefined);
    this.#jobs.set(jobId, state);
    const early = this.#earlyJobMessages.get(jobId) ?? [];
    this.#earlyJobMessages.delete(jobId);
    for (const message of early) this.#handleJobMessage(message);
    return {
      jobId,
      result: state.deferred.promise.finally(() => this.#jobs.delete(jobId)),
      onProgress: (listener) => {
        state.listeners.add(listener);
        if (state.latestProgress) listener(state.latestProgress);
        return () => state.listeners.delete(listener);
      },
    };
  }

  async cancel(jobId: string): Promise<void> {
    const response = await this.#sendCommand('cancel', { jobId });
    if (response !== null) throw new PythonEngineHostError('Invalid cancel response.', 'INVALID_RESPONSE');
  }

  async stop(): Promise<void> {
    if (!this.#child || ['stopped', 'crashed'].includes(this.#state)) return;
    this.#state = 'stopping';
    try {
      const response = await this.#sendCommand('shutdown', {}, 10_000, true);
      if (response !== null) throw new PythonEngineHostError('Invalid shutdown response.', 'INVALID_RESPONSE');
      await Promise.race([
        this.#exitDeferred?.promise ?? Promise.resolve(),
        new Promise<void>((resolve) => setTimeout(resolve, 15_000)),
      ]);
    } catch {
      // The hard termination below is the final fallback for an unresponsive host.
    }
    if (this.#child && this.#child.exitCode === null) this.#terminate();
  }

  #launchCommand(): { executable: string; args: string[]; env: Record<string, string> } {
    if (this.#options.launchOverride) {
      return {
        executable: this.#options.launchOverride.executable,
        args: this.#options.launchOverride.args,
        env: this.#options.launchOverride.env ?? {},
      };
    }
    const args = [
      '-u', '-m', 'zynalo_sdxl_spike.host',
      '--output-root', this.#options.outputRoot,
      '--device', String(this.#options.deviceIndex ?? 0),
      '--dtype', this.#options.dtype ?? 'float16',
    ];
    if (this.#options.checkpoint && this.#options.modelId && this.#options.modelName) {
      args.push('--checkpoint', this.#options.checkpoint, '--model-id', this.#options.modelId, '--model-name', this.#options.modelName);
      if (this.#options.checkpointSha256) args.push('--expected-sha256', this.#options.checkpointSha256);
    }
    if (this.#options.configSource) args.push('--config', this.#options.configSource);
    if (this.#options.anime6bModel) args.push('--anime6b-model', this.#options.anime6bModel);
    if (this.#options.offline) args.push('--offline');
    const currentPythonPath = process.env.PYTHONPATH;
    return {
      executable: this.#options.pythonExecutable,
      args,
      env: {
        PYTHONUNBUFFERED: '1',
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONNOUSERSITE: '1',
        PYTHONPATH: currentPythonPath ? `${this.#options.moduleRoot}${path.delimiter}${currentPythonPath}` : this.#options.moduleRoot,
        CUBLAS_WORKSPACE_CONFIG: ':4096:8',
      },
    };
  }

  #consumeStdout(chunk: string): void {
    this.#stdoutBuffer += chunk;
    if (Buffer.byteLength(this.#stdoutBuffer, 'utf8') > MAX_LINE_BYTES && !this.#stdoutBuffer.includes('\n')) {
      this.#protocolFailure('Python host emitted an oversized unterminated line.');
      return;
    }
    let newlineIndex = this.#stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.#stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.#stdoutBuffer = this.#stdoutBuffer.slice(newlineIndex + 1);
      if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
        this.#protocolFailure('Python host emitted a line larger than 1 MiB.');
        return;
      }
      if (line.length > 0) this.#consumeLine(line);
      newlineIndex = this.#stdoutBuffer.indexOf('\n');
    }
  }

  #consumeLine(line: string): void {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      this.#protocolFailure('Python host emitted malformed JSON.');
      return;
    }
    const validation = validateEngineHostMessage(value);
    if (!validation.success) {
      this.#protocolFailure(validationMessage(validation.issues));
      return;
    }
    this.#handleMessage(validation.data);
  }

  #handleMessage(message: EngineHostMessage): void {
    switch (message.type) {
      case 'lifecycle':
        if (message.event === 'model-load-started') {
          this.#emitLifecycle(this.#lifecycleEvent('loading-model', 'Loading configured SDXL model.', message.modelId));
        } else if (message.event === 'ready') {
          this.#state = 'ready';
          this.#loadedModelId = message.modelId;
          this.#emitLifecycle(this.#lifecycleEvent('ready', 'Python SDXL engine is ready.', message.modelId));
          this.#readyDeferred?.resolve();
        } else if (message.event === 'stopped') {
          this.#emitLifecycle(this.#lifecycleEvent('stopped', 'Python SDXL engine stopped.', message.modelId));
        }
        break;
      case 'response': {
        const pending = this.#pending.get(message.id);
        if (!pending) return this.#protocolFailure(`Host responded to unknown command ${message.id}.`);
        this.#pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.ok) pending.deferred.resolve(message.result);
        else pending.deferred.reject(new PythonEngineHostError(message.error!.message, message.error!.code, message.error!.retryable));
        break;
      }
      case 'progress':
      case 'generation-result':
      case 'generation-error':
        if (this.#jobs.has(message.jobId)) this.#handleJobMessage(message);
        else {
          const buffered = this.#earlyJobMessages.get(message.jobId) ?? [];
          if (buffered.length >= 200) return this.#protocolFailure('Too many messages for an unknown generation job.');
          buffered.push(message);
          this.#earlyJobMessages.set(message.jobId, buffered);
        }
        break;
      case 'protocol-error':
        this.#emitLifecycle(this.#lifecycleEvent('protocol-error', message.error.message, this.#loadedModelId ?? this.#options.modelId));
        if (this.#state === 'starting') this.#readyDeferred?.reject(new PythonEngineHostError(message.error.message, message.error.code));
        break;
    }
  }

  #handleJobMessage(message: HostProgressMessage | HostGenerationResultMessage | HostGenerationErrorMessage): void {
    const job = this.#jobs.get(message.jobId);
    if (!job) return;
    if (message.type === 'progress') {
      const progress: GenerationProgress = {
        jobId: message.jobId,
        stage: message.stage,
        progress: message.progress,
        stageProgress: message.stageProgress,
        overallProgress: message.overallProgress,
      };
      if (message.currentStep !== undefined) progress.currentStep = message.currentStep;
      if (message.totalSteps !== undefined) progress.totalSteps = message.totalSteps;
      if (message.pass !== undefined) progress.pass = message.pass;
      job.latestProgress = progress;
      for (const listener of job.listeners) listener(progress);
    } else if (message.type === 'generation-result') {
      const asset = (output: typeof message.result.output) => ({
        id: output.id,
        uri: `zynalo-asset://generated/${output.id}`,
        mimeType: output.mimeType,
        width: output.width,
        height: output.height,
      });
      job.deferred.resolve({
        jobId: message.result.jobId,
        seed: message.result.seed,
        durationMs: message.result.durationMs,
        status: message.result.status,
        output: asset(message.result.output),
        baseAsset: asset(message.result.baseAsset),
        ...(message.result.finalAsset ? { finalAsset: asset(message.result.finalAsset) } : {}),
        stages: message.result.stages,
        seeds: message.result.seeds,
        parameters: message.result.parameters,
        basePixelSha256: message.result.basePixelSha256,
        ...(message.result.finalPixelSha256 ? { finalPixelSha256: message.result.finalPixelSha256 } : {}),
        ...(message.result.failure ? { failure: message.result.failure } : {}),
      });
    } else {
      const error = message.error.code === 'CANCELLED'
        ? new GenerationCancelledError(message.jobId)
        : new PythonEngineHostError(message.error.message, message.error.code, message.error.retryable);
      job.deferred.reject(error);
    }
  }

  #sendCommand(
    command: HostCommandName,
    payload: Record<string, unknown>,
    timeoutMs = this.#options.commandTimeoutMs ?? 30_000,
    allowStopping = false,
  ): Promise<unknown> {
    if (!this.#child || !this.#child.stdin.writable || (!allowStopping && this.#state !== 'ready')) {
      return Promise.reject(new PythonEngineHostError('Python engine is not ready.', 'ENGINE_NOT_READY', true));
    }
    this.#commandSequence += 1;
    const id = `cmd-${this.#commandSequence}`;
    const pending = deferred<unknown>();
    const timer = setTimeout(() => {
      this.#pending.delete(id);
      pending.reject(new PythonEngineHostError(`Command ${command} timed out.`, 'COMMAND_TIMEOUT', true));
    }, timeoutMs);
    this.#pending.set(id, { deferred: pending, timer });
    const line = JSON.stringify({ protocol: ENGINE_HOST_PROTOCOL, type: 'command', id, command, payload });
    this.#child.stdin.write(`${line}\n`, 'utf8', (error) => {
      if (error) {
        const active = this.#pending.get(id);
        if (active) {
          this.#pending.delete(id);
          clearTimeout(active.timer);
          active.deferred.reject(error);
        }
      }
    });
    return pending.promise;
  }

  #protocolFailure(message: string): void {
    this.#emitLifecycle(this.#lifecycleEvent('protocol-error', message, this.#loadedModelId ?? this.#options.modelId));
    this.#handleCrash(`Python engine protocol violation: ${message}`);
    this.#terminate();
  }

  #handleCrash(message: string): void {
    if (this.#state === 'crashed' || this.#state === 'stopped') return;
    const detail = this.#stderr.trim();
    const error = new PythonEngineCrashedError(detail ? `${message}\n${detail}` : message);
    const expectedStop = this.#state === 'stopping';
    this.#state = expectedStop ? 'stopped' : 'crashed';
    this.#readyDeferred?.reject(error);
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.deferred.reject(error);
    }
    this.#pending.clear();
    for (const job of this.#jobs.values()) job.deferred.reject(error);
    this.#jobs.clear();
    this.#earlyJobMessages.clear();
    if (!expectedStop) this.#emitLifecycle(this.#lifecycleEvent('crashed', message, this.#loadedModelId ?? this.#options.modelId));
  }

  #handleExit(code: number | null, signal: NodeJS.Signals | null): void {
    const expected = this.#state === 'stopping';
    if (!expected) this.#handleCrash(`Python engine exited unexpectedly (code ${String(code)}, signal ${String(signal)}).`);
    else this.#state = 'stopped';
    this.#child = null;
    this.#exitDeferred?.resolve();
  }

  #terminate(): void {
    if (!this.#child || this.#child.exitCode !== null) return;
    if (process.platform === 'win32' && this.#child.pid) {
      const killer = spawn('taskkill.exe', ['/PID', String(this.#child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
        shell: false,
      });
      killer.unref();
    } else {
      this.#child.kill('SIGTERM');
    }
  }

  #emitLifecycle(event: EngineLifecycleNotification): void {
    for (const listener of this.#lifecycleListeners) listener(event);
  }

  #lifecycleEvent(
    state: EngineLifecycleNotification['state'],
    message: string,
    modelId: string | undefined,
  ): EngineLifecycleNotification {
    return modelId === undefined ? { state, message } : { state, message, modelId };
  }
}
