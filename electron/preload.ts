import { contextBridge, ipcRenderer } from "electron";

export interface ZynaloDesktopApi {
  readonly environment: "desktop";
  getAppInfo(): Promise<{
    name: string;
    version: string;
    platform: NodeJS.Platform;
  }>;
  listModels(): Promise<ModelCatalogEntry[]>;
  downloadModel(modelId: string): Promise<ModelCatalogEntry>;
  deleteModel(modelId: string): Promise<ModelCatalogEntry>;
  onModelDownloadProgress(
    listener: (progress: ModelDownloadProgress) => void,
  ): () => void;
}

export interface ModelCatalogEntry {
  id: string;
  name: string;
  family: "rembg";
  description: string;
  version: string;
  sizeBytes: number;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
  status: "not-installed" | "installed" | "invalid" | "downloading";
  installedBytes: number;
}

export interface ModelDownloadProgress {
  modelId: string;
  receivedBytes: number;
  totalBytes: number;
}

const desktopApi: ZynaloDesktopApi = Object.freeze({
  environment: "desktop",
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  listModels: () => ipcRenderer.invoke("models:list"),
  downloadModel: (modelId: string) => ipcRenderer.invoke("models:download", modelId),
  deleteModel: (modelId: string) => ipcRenderer.invoke("models:delete", modelId),
  onModelDownloadProgress: (
    listener: (progress: ModelDownloadProgress) => void,
  ) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ModelDownloadProgress) =>
      listener(progress);
    ipcRenderer.on("models:download-progress", handler);
    return () => ipcRenderer.removeListener("models:download-progress", handler);
  },
});

contextBridge.exposeInMainWorld("zynaloDesktop", desktopApi);
