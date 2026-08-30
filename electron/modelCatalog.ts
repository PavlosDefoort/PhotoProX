import { app, ipcMain, net, WebContents } from "electron";
import { createHash } from "node:crypto";
import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

type ModelStatus = "not-installed" | "installed" | "invalid" | "downloading";

type ModelDefinition = {
  id: string;
  name: string;
  family: "rembg";
  fileName: string;
  description: string;
  version: string;
  sizeBytes: number;
  downloadUrl: string;
  checksum: { algorithm: "md5"; value: string };
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
};

export type ModelCatalogEntry = Omit<
  ModelDefinition,
  "fileName" | "downloadUrl" | "checksum"
> & {
  status: ModelStatus;
  installedBytes: number;
};

const MODEL_CATALOG: readonly ModelDefinition[] = [
  {
    id: "rembg-u2net",
    name: "U²-Net (General)",
    family: "rembg",
    fileName: "u2net.onnx",
    description:
      "General-purpose foreground extraction for photos, products, people, and objects.",
    version: "rembg-v0.0.0",
    sizeBytes: 175_997_641,
    downloadUrl:
      "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
    checksum: {
      algorithm: "md5",
      value: "60024c5c889badc19c04ad937298a77b",
    },
    sourceUrl: "https://github.com/xuebinqin/U-2-Net",
    licenseName: "Apache-2.0 source; model weights have separate provenance",
    licenseUrl: "https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE",
  },
] as const;

const activeDownloads = new Map<string, AbortController>();

const getDefinition = (id: string) => {
  const definition = MODEL_CATALOG.find((model) => model.id === id);
  if (!definition) throw new Error("Unknown model.");
  return definition;
};

const getModelDirectory = (definition: ModelDefinition) =>
  path.join(app.getPath("userData"), "models", definition.family, definition.id);

const getModelPath = (definition: ModelDefinition) =>
  path.join(getModelDirectory(definition), definition.fileName);

const getEntry = async (definition: ModelDefinition): Promise<ModelCatalogEntry> => {
  let installedBytes = 0;
  try {
    installedBytes = (await stat(getModelPath(definition))).size;
  } catch {
    // A missing model is a normal catalog state.
  }

  const status: ModelStatus = activeDownloads.has(definition.id)
    ? "downloading"
    : installedBytes === 0
      ? "not-installed"
      : installedBytes === definition.sizeBytes
        ? "installed"
        : "invalid";

  const {
    fileName: _fileName,
    downloadUrl: _downloadUrl,
    checksum: _checksum,
    ...publicDefinition
  } = definition;
  return { ...publicDefinition, status, installedBytes };
};

const sendProgress = (
  sender: WebContents,
  modelId: string,
  receivedBytes: number,
  totalBytes: number,
) => {
  if (sender.isDestroyed()) return;
  sender.send("models:download-progress", {
    modelId,
    receivedBytes,
    totalBytes,
  });
};

const downloadModel = async (id: string, sender: WebContents) => {
  const definition = getDefinition(id);
  if (activeDownloads.has(id)) throw new Error("This model is already downloading.");

  const controller = new AbortController();
  activeDownloads.set(id, controller);
  const directory = getModelDirectory(definition);
  const destination = getModelPath(definition);
  const temporaryPath = `${destination}.download`;
  let file: Awaited<ReturnType<typeof open>> | null = null;

  try {
    await mkdir(directory, { recursive: true });
    await rm(temporaryPath, { force: true });
    const response = await net.fetch(definition.downloadUrl, {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok || !response.body) {
      throw new Error(`Model download failed (${response.status}).`);
    }

    file = await open(temporaryPath, "w");
    const reader = response.body.getReader();
    const hash = createHash(definition.checksum.algorithm);
    let receivedBytes = 0;
    sendProgress(sender, id, receivedBytes, definition.sizeBytes);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await file.write(value);
      hash.update(value);
      receivedBytes += value.byteLength;
      sendProgress(sender, id, receivedBytes, definition.sizeBytes);
    }

    await file.close();
    file = null;
    if (receivedBytes !== definition.sizeBytes) {
      throw new Error("Downloaded model size does not match the catalog.");
    }
    if (hash.digest("hex") !== definition.checksum.value) {
      throw new Error("Downloaded model failed its integrity check.");
    }

    await rm(destination, { force: true });
    await rename(temporaryPath, destination);
    return getEntry(definition);
  } finally {
    activeDownloads.delete(id);
    await file?.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
};

export const registerModelCatalogHandlers = (
  isTrustedRenderer: (urlValue: string) => boolean,
) => {
  const assertTrusted = (urlValue: string) => {
    if (!isTrustedRenderer(urlValue)) {
      throw new Error("Rejected model request from an untrusted renderer.");
    }
  };

  ipcMain.handle("models:list", async (event) => {
    assertTrusted(event.senderFrame?.url ?? "");
    return Promise.all(MODEL_CATALOG.map(getEntry));
  });

  ipcMain.handle("models:download", async (event, modelId: unknown) => {
    assertTrusted(event.senderFrame?.url ?? "");
    if (typeof modelId !== "string") throw new Error("Invalid model ID.");
    return downloadModel(modelId, event.sender);
  });

  ipcMain.handle("models:delete", async (event, modelId: unknown) => {
    assertTrusted(event.senderFrame?.url ?? "");
    if (typeof modelId !== "string") throw new Error("Invalid model ID.");
    if (activeDownloads.has(modelId)) {
      throw new Error("Wait for the model download to finish before removing it.");
    }
    const definition = getDefinition(modelId);
    await rm(getModelPath(definition), { force: true });
    return getEntry(definition);
  });
};
