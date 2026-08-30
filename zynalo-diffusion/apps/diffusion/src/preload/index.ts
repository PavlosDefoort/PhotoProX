import { contextBridge, ipcRenderer } from 'electron';
import type {
  DiffusionBridge,
  GenerateRequest,
  GenerationProgress,
  EngineLifecycleNotification,
  ImportModelRequest,
  ModelOperationProgress,
  RemoveModelRequest,
  ProgressListener,
  TagAutocompleteRequest,
  TagReferenceRequest,
} from '@zynalo/diffusion-contracts';
import { IPC_CHANNELS } from '@zynalo/diffusion-contracts';

const bridge: DiffusionBridge = Object.freeze({
  inspectHardware: () => ipcRenderer.invoke(IPC_CHANNELS.inspectHardware),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.listModels),
  generate: (request: GenerateRequest) => ipcRenderer.invoke(IPC_CHANNELS.generate, request),
  result: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.result, { jobId }),
  cancel: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.cancel, { jobId }),
  onProgress: (listener: ProgressListener) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: GenerationProgress) => listener(progress);
    ipcRenderer.on(IPC_CHANNELS.progress, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.progress, handler);
  },
  onLifecycle: (listener: (event: EngineLifecycleNotification) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, lifecycle: EngineLifecycleNotification) => listener(lifecycle);
    ipcRenderer.on(IPC_CHANNELS.lifecycle, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.lifecycle, handler);
  },
  chooseModelFile: () => ipcRenderer.invoke(IPC_CHANNELS.chooseModelFile),
  inspectModelImport: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.inspectModelImport, { token }),
  importModel: (request: ImportModelRequest) => ipcRenderer.invoke(IPC_CHANNELS.importModel, request),
  cancelModelImport: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.cancelModelImport, { token }),
  listModelLibrary: () => ipcRenderer.invoke(IPC_CHANNELS.listModelLibrary),
  revalidateModel: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.revalidateModel, { modelId }),
  removeModel: (request: RemoveModelRequest) => ipcRenderer.invoke(IPC_CHANNELS.removeModel, request),
  selectModel: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.selectModel, { modelId }),
  loadModel: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.loadModel, { modelId }),
  getLoadedModel: () => ipcRenderer.invoke(IPC_CHANNELS.loadedModel),
  getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.diagnostics),
  copyDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.copyDiagnostics),
  saveDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.saveDiagnostics),
  copyModelSha: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.copyModelSha, { modelId }),
  onModelOperationProgress: (listener: (event: ModelOperationProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ModelOperationProgress) => listener(progress);
    ipcRenderer.on(IPC_CHANNELS.modelOperationProgress, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.modelOperationProgress, handler);
  },
  completeTags: (request: TagAutocompleteRequest) => ipcRenderer.invoke(IPC_CHANNELS.completeTags, request),
  getTagCatalogInfo: () => ipcRenderer.invoke(IPC_CHANNELS.tagCatalogInfo),
  getTagReference: (request: TagReferenceRequest) => ipcRenderer.invoke(IPC_CHANNELS.tagReference, request),
});

contextBridge.exposeInMainWorld('zynaloDiffusion', bridge);
