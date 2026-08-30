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

declare global {
  interface Window {
    zynaloDesktop?: ZynaloDesktopApi;
  }
}

export {};
