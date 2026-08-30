import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  IPC_CHANNELS,
  validateImportModelRequest,
  validateImportTokenPayload,
  validateModelIdPayload,
  validateRemoveModelRequest,
  validateTagAutocompleteRequest,
  validateTagReferenceRequest,
} from '@zynalo/diffusion-contracts';
import type { DiffusionEngine, EngineLifecycleNotification, GenerationJob, LoadedModelState, TagCatalogInfo } from '@zynalo/diffusion-contracts';
import { CompositeDiffusionEngine, MockDiffusionEngine, PythonDiffusionEngine } from '@zynalo/diffusion-engine';
import { promptProfileIdForCheckpointSha } from '@zynalo/prompt-language';
import { buildDiagnostics, serializedDiagnostics } from './diagnostics';
import { resolvePythonEngineOptions } from './engine-config';
import { isTrustedRendererUrl, parseGeneratePayload, parseJobPayload } from './ipc-validation';
import { ModelLibrary, ModelLibraryError } from './model-library';
import { registerPrivilegedSchemes, registerProtocolHandlers } from './protocols';
import { OfflineTagCatalog } from './tag-catalog';
import { TagReferenceService } from './tag-reference';

registerPrivilegedSchemes();

interface EngineContext {
  engine: DiffusionEngine;
  mock: MockDiffusionEngine;
  python: PythonDiffusionEngine | null;
  pythonModelIds: Set<string>;
  library: ModelLibrary;
  loadedModelId?: string | undefined;
  loadState: LoadedModelState['state'];
  loadError?: { code: string; message: string } | undefined;
  pythonExecutable?: string | undefined;
}

const jobs = new Map<string, GenerationJob>();
let enginePromise: Promise<EngineContext>;
let mainWindow: BrowserWindow | null = null;
let latestLifecycle: EngineLifecycleNotification | null = null;
let shutdownStarted = false;
let shutdownComplete = false;
let tagCatalogPromise: Promise<OfflineTagCatalog | null>;
let tagReferenceService: TagReferenceService;

const curatedOnlyCatalogInfo: TagCatalogInfo = Object.freeze({ id: 'curated-only', generatedAt: '1970-01-01T00:00:00.000Z', recordCount: 0, source: 'Curated catalog only; optional upstream snapshot unavailable', offline: true });

function send(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function sendLifecycle(event: EngineLifecycleNotification): void {
  latestLifecycle = event;
  send(IPC_CHANNELS.lifecycle, event);
}

async function initializeEngine(): Promise<EngineContext> {
  const userData = app.getPath('userData');
  const library = new ModelLibrary(userData, (event) => send(IPC_CHANNELS.modelOperationProgress, event));
  await library.initialize();
  const mock = new MockDiffusionEngine();
  let options;
  try { options = resolvePythonEngineOptions(userData, process.resourcesPath, app.isPackaged); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Python engine configuration.';
    sendLifecycle({ state: 'protocol-error', message });
    return { engine: mock, mock, python: null, pythonModelIds: new Set(), library, loadState: 'idle' };
  }

  if (!options) {
    sendLifecycle({ state: 'ready', message: 'Mock engine ready. Configure Python to load registered SDXL models.', modelId: 'mock-starter-v1' });
    return { engine: mock, mock, python: null, pythonModelIds: new Set(), library, loadState: 'idle' };
  }

  if (options.checkpoint) {
    try {
      const selection = library.addSelection(options.checkpoint);
      const inspection = await library.inspect(selection.token);
      const existing = library.list().find((item) => item.sha256 === inspection.sha256);
      const item = existing ?? await library.import(selection.token, options.modelName ?? path.parse(options.checkpoint).name, 'external');
      await library.setSelected(item.id);
      options.modelId = item.id;
      options.modelName = item.displayName;
      options.checkpointSha256 = item.sha256;
    } catch (error) {
      console.error('Legacy checkpoint registration failed.', error);
      delete options.checkpoint;
      delete options.modelId;
      delete options.modelName;
    }
  }

  const python = new PythonDiffusionEngine(options);
  python.onLifecycle(sendLifecycle);
  const pythonModelIds = new Set(library.list().filter((item) => item.validationStatus === 'valid').map((item) => item.id));
  const context: EngineContext = {
    python, mock, pythonModelIds, library, loadState: options.modelId ? 'loading' : 'idle',
    pythonExecutable: options.pythonExecutable,
    engine: new CompositeDiffusionEngine([
      { engine: python, modelIds: pythonModelIds, primary: true },
      { engine: mock, modelIds: new Set(['mock-starter-v1']) },
    ]),
  };
  try {
    await python.start();
    if (options.modelId) {
      context.loadedModelId = options.modelId;
      context.loadState = 'loaded';
      library.setLoaded(options.modelId);
    }
    return context;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Python diffusion engine failed to start.';
    sendLifecycle({ state: 'crashed', message, ...(options.modelId ? { modelId: options.modelId } : {}) });
    await python.stop();
    return { engine: mock, mock, python: null, pythonModelIds: new Set(), library, loadState: 'failed', loadError: { code: 'PYTHON_START_FAILED', message }, pythonExecutable: options.pythonExecutable };
  }
}

function senderIsTrusted(event: Electron.IpcMainInvokeEvent): boolean {
  if (!mainWindow || event.sender !== mainWindow.webContents || !event.senderFrame) return false;
  return isTrustedRendererUrl(event.senderFrame.url);
}

function requireTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  if (!senderIsTrusted(event)) throw new Error('Rejected IPC request from an untrusted sender.');
}

function parsed<T>(result: { success: true; data: T } | { success: false; issues: Array<{ message: string }> }): T {
  if (!result.success) throw new TypeError(result.issues.map((issue) => issue.message).join(' '));
  return result.data;
}

function loadedState(context: EngineContext): LoadedModelState {
  return {
    state: context.loadState,
    ...(context.library.selectedModelId ? { selectedModelId: context.library.selectedModelId } : {}),
    ...(context.loadedModelId ? { loadedModelId: context.loadedModelId } : {}),
    ...(context.loadError ? { error: context.loadError } : {}),
  };
}

async function loadRegisteredModel(context: EngineContext, modelId: string): Promise<LoadedModelState> {
  context.loadError = undefined;
  if (modelId === 'mock-starter-v1') {
    await context.library.setSelected(undefined);
    if (context.python && context.library.loadedModelId) await context.python.unloadModel();
    context.library.setLoaded(undefined);
    context.loadedModelId = modelId;
    context.loadState = 'loaded';
    return loadedState(context);
  }
  await context.library.setSelected(modelId);
  if (!context.python) {
    context.loadState = 'failed';
    context.loadError = { code: 'PYTHON_RUNTIME_MISSING', message: 'Python runtime not found. Configure the verified Zynalo engine interpreter.' };
    return loadedState(context);
  }
  const validated = await context.library.revalidate(modelId);
  if (validated.validationStatus !== 'valid') {
    context.loadState = 'failed';
    context.loadError = { code: 'MODEL_INVALID', message: validated.validationStatus === 'changed' ? 'Model file changed after registration. Re-import it before loading.' : `Model cannot be loaded because its status is ${validated.validationStatus}.` };
    return loadedState(context);
  }
  const record = context.library.getRecord(modelId);
  context.loadState = 'loading';
  try {
    await context.python.loadModel({ id: record.id, name: record.displayName, checkpoint: record.source.path, sha256: record.sha256 });
    context.loadedModelId = modelId;
    context.loadState = 'loaded';
    context.library.setLoaded(modelId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.loadedModelId = undefined;
    context.loadState = 'failed';
    context.loadError = { code: error instanceof ModelLibraryError ? error.code : 'MODEL_LOAD_FAILED', message };
    context.library.setLoaded(undefined, message);
  }
  return loadedState(context);
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.completeTags, async (event, payload: unknown) => {
    requireTrustedSender(event);
    const request = parsed(validateTagAutocompleteRequest(payload));
    return (await tagCatalogPromise)?.complete(request) ?? { query: request.query, items: [], truncated: false };
  });
  ipcMain.handle(IPC_CHANNELS.tagCatalogInfo, async (event) => { requireTrustedSender(event); return (await tagCatalogPromise)?.info ?? curatedOnlyCatalogInfo; });
  ipcMain.handle(IPC_CHANNELS.tagReference, async (event, payload: unknown) => {
    requireTrustedSender(event);
    const request = validateTagReferenceRequest(payload);
    if (!request) throw new TypeError('Invalid tag reference request.');
    const catalogRecord = (await tagCatalogPromise)?.lookup(request.tag);
    const reference = await tagReferenceService.get(catalogRecord?.canonicalTag ?? request.tag, request.allowNsfw ?? false);
    return {
      ...reference,
      ...(catalogRecord ? {
        tag: catalogRecord.canonicalTag,
        category: catalogRecord.category,
        postCount: catalogRecord.postCount,
        ...(catalogRecord.matchedAlias ? { matchedAlias: catalogRecord.matchedAlias } : {}),
      } : {}),
    };
  });
  ipcMain.handle(IPC_CHANNELS.inspectHardware, async (event) => { requireTrustedSender(event); return (await enginePromise).engine.inspectHardware(); });
  ipcMain.handle(IPC_CHANNELS.listModels, async (event) => {
    requireTrustedSender(event); const context = await enginePromise;
    const registered = context.library.list().filter((item) => item.validationStatus === 'valid').map((item) => {
      const promptProfileId = promptProfileIdForCheckpointSha(item.sha256);
      return { id: item.id, name: item.displayName, family: 'Diffusers SDXL', installed: true, ...(promptProfileId ? { promptProfileId } : {}) };
    });
    return [...registered, ...(await context.mock.listModels())];
  });
  ipcMain.handle(IPC_CHANNELS.generate, async (event, payload: unknown) => {
    requireTrustedSender(event); const request = parseGeneratePayload(payload); const context = await enginePromise;
    if (context.loadedModelId !== request.modelId || context.loadState !== 'loaded') throw new Error('Load the selected model before generation.');
    const job = await context.engine.generate(request); jobs.set(job.jobId, job);
    job.onProgress((progress) => send(IPC_CHANNELS.progress, progress));
    return { jobId: job.jobId };
  });
  ipcMain.handle(IPC_CHANNELS.result, async (event, payload: unknown) => {
    requireTrustedSender(event); const { jobId } = parseJobPayload(payload); const job = jobs.get(jobId);
    if (!job) throw new Error('Unknown generation job.');
    try { return await job.result; } finally { jobs.delete(jobId); }
  });
  ipcMain.handle(IPC_CHANNELS.cancel, async (event, payload: unknown) => {
    requireTrustedSender(event); const { jobId } = parseJobPayload(payload); if (!jobs.has(jobId)) throw new Error('Unknown generation job.');
    await (await enginePromise).engine.cancel(jobId);
  });
  ipcMain.handle(IPC_CHANNELS.chooseModelFile, async (event) => {
    requireTrustedSender(event); const context = await enginePromise;
    const choice = await dialog.showOpenDialog(mainWindow!, { title: 'Choose an SDXL safetensors checkpoint', properties: ['openFile'], filters: [{ name: 'Safetensors checkpoints', extensions: ['safetensors'] }] });
    if (choice.canceled || choice.filePaths.length === 0) return { cancelled: true };
    return { cancelled: false, selection: context.library.addSelection(choice.filePaths[0]!) };
  });
  ipcMain.handle(IPC_CHANNELS.inspectModelImport, async (event, payload: unknown) => { requireTrustedSender(event); return (await enginePromise).library.inspect(parsed(validateImportTokenPayload(payload)).token); });
  ipcMain.handle(IPC_CHANNELS.importModel, async (event, payload: unknown) => {
    requireTrustedSender(event); const context = await enginePromise; const request = parsed(validateImportModelRequest(payload));
    const item = await context.library.import(request.token, request.displayName, request.mode); if (context.python) context.pythonModelIds.add(item.id); return item;
  });
  ipcMain.handle(IPC_CHANNELS.cancelModelImport, async (event, payload: unknown) => { requireTrustedSender(event); (await enginePromise).library.cancel(parsed(validateImportTokenPayload(payload)).token); });
  ipcMain.handle(IPC_CHANNELS.listModelLibrary, async (event) => { requireTrustedSender(event); return (await enginePromise).library.list(); });
  ipcMain.handle(IPC_CHANNELS.revalidateModel, async (event, payload: unknown) => { requireTrustedSender(event); return (await enginePromise).library.revalidate(parsed(validateModelIdPayload(payload)).modelId); });
  ipcMain.handle(IPC_CHANNELS.removeModel, async (event, payload: unknown) => {
    requireTrustedSender(event); const context = await enginePromise; const request = parsed(validateRemoveModelRequest(payload));
    if (context.loadedModelId === request.modelId && context.python) await context.python.unloadModel();
    await context.library.remove(request.modelId, request.deleteManagedFile); context.pythonModelIds.delete(request.modelId);
    if (context.loadedModelId === request.modelId) { context.loadedModelId = undefined; context.loadState = 'idle'; }
  });
  ipcMain.handle(IPC_CHANNELS.selectModel, async (event, payload: unknown) => {
    requireTrustedSender(event); const context = await enginePromise; const { modelId } = parsed(validateModelIdPayload(payload));
    if (modelId === 'mock-starter-v1') await context.library.setSelected(undefined); else await context.library.setSelected(modelId);
    return loadedState(context);
  });
  ipcMain.handle(IPC_CHANNELS.loadModel, async (event, payload: unknown) => { requireTrustedSender(event); const context = await enginePromise; return loadRegisteredModel(context, parsed(validateModelIdPayload(payload)).modelId); });
  ipcMain.handle(IPC_CHANNELS.loadedModel, async (event) => { requireTrustedSender(event); return loadedState(await enginePromise); });
  ipcMain.handle(IPC_CHANNELS.diagnostics, async (event) => { requireTrustedSender(event); const context = await enginePromise; return buildDiagnostics({ version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData'), outputRoot: path.join(app.getPath('userData'), 'generated-assets'), pythonExecutable: context.pythonExecutable, python: context.python, library: context.library, engineState: () => context.python?.state ?? 'mock-only' }); });
  ipcMain.handle(IPC_CHANNELS.copyDiagnostics, async (event) => { requireTrustedSender(event); const context = await enginePromise; const report = await buildDiagnostics({ version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData'), outputRoot: path.join(app.getPath('userData'), 'generated-assets'), pythonExecutable: context.pythonExecutable, python: context.python, library: context.library, engineState: () => context.python?.state ?? 'mock-only' }); clipboard.writeText(serializedDiagnostics(report)); });
  ipcMain.handle(IPC_CHANNELS.saveDiagnostics, async (event) => {
    requireTrustedSender(event); const context = await enginePromise; const choice = await dialog.showSaveDialog(mainWindow!, { title: 'Save Zynalo diagnostic report', defaultPath: 'zynalo-diagnostics.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (choice.canceled || !choice.filePath) return { cancelled: true };
    const report = await buildDiagnostics({ version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData'), outputRoot: path.join(app.getPath('userData'), 'generated-assets'), pythonExecutable: context.pythonExecutable, python: context.python, library: context.library, engineState: () => context.python?.state ?? 'mock-only' });
    await writeFile(choice.filePath, serializedDiagnostics(report), { encoding: 'utf8', flag: 'w' }); return { cancelled: false };
  });
  ipcMain.handle(IPC_CHANNELS.copyModelSha, async (event, payload: unknown) => { requireTrustedSender(event); const context = await enginePromise; clipboard.writeText(context.library.getRecord(parsed(validateModelIdPayload(payload)).modelId).sha256); });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({ width: 1_180, height: 820, minWidth: 860, minHeight: 640, backgroundColor: '#0d1017', title: 'Zynalo Diffusion', webPreferences: { preload: path.join(__dirname, '../preload/index.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => { const target = new URL(targetUrl); if (target.protocol !== 'zynalo:' || target.hostname !== 'app') event.preventDefault(); });
  mainWindow.webContents.on('did-finish-load', () => { if (latestLifecycle) send(IPC_CHANNELS.lifecycle, latestLifecycle); });
  void mainWindow.loadURL('zynalo://app/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  const tagCatalogRoot = app.isPackaged ? path.join(process.resourcesPath, 'tag-catalog') : path.resolve(__dirname, '../tag-catalog');
  tagCatalogPromise = OfflineTagCatalog.open(tagCatalogRoot).catch(() => null);
  const generatedAssetRoot = path.join(app.getPath('userData'), 'generated-assets'); mkdirSync(generatedAssetRoot, { recursive: true });
  const tagPreviewRoot = path.join(app.getPath('userData'), 'tag-reference-cache', 'previews'); mkdirSync(tagPreviewRoot, { recursive: true });
  tagReferenceService = new TagReferenceService(tagPreviewRoot); void tagReferenceService.initialize();
  registerProtocolHandlers(path.resolve(__dirname, '../renderer'), generatedAssetRoot, tagPreviewRoot); registerIpcHandlers(); enginePromise = initializeEngine(); createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error: unknown) => { console.error('Failed to start Zynalo Diffusion.', error); app.quit(); });

app.on('before-quit', (event) => {
  if (shutdownComplete) return; event.preventDefault(); if (shutdownStarted) return; shutdownStarted = true;
  void enginePromise?.then(async ({ python, library }) => { library.cancelAll(); await python?.stop(); }).finally(() => { shutdownComplete = true; app.quit(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
