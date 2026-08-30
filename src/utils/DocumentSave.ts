import {
  DocumentImageType,
  DocumentSaveTarget,
  ZynaloFileHandle,
  WorkspaceDocumentState,
} from "@/interfaces/editor/EditorWorkspace";
import {
  getDocumentDownloadName,
  serializeWorkspaceDocument,
} from "@/models/editor/EditorWorkspace";
import { exportProjectImage } from "@/utils/PixiUtils";
import { Application, Container } from "pixi.js";

type PickerWindow = Window & {
  showOpenFilePicker?: (options?: Record<string, unknown>) => Promise<ZynaloFileHandle[]>;
  showSaveFilePicker?: (options?: Record<string, unknown>) => Promise<ZynaloFileHandle>;
};

export const OPEN_DOCUMENT_PICKER_TYPE = {
  description: "Images and Zynalo projects",
  accept: {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/webp": [".webp"],
    "application/vnd.zyn+json": [".zyn", ".json"],
  },
};

export const PROJECT_PICKER_TYPE = {
  description: "Zynalo project",
  accept: { "application/vnd.zyn+json": [".zyn"] },
};

export const isSupportedImageFile = (file: Pick<File, "name" | "type">) =>
  file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp" ||
  /\.(png|jpe?g|webp)$/i.test(file.name);

export const supportsFileSystemAccess = (value: Window = window) =>
  typeof (value as PickerWindow).showOpenFilePicker === "function" &&
  typeof (value as PickerWindow).showSaveFilePicker === "function";

export const isFilePickerCancellation = (error: unknown) =>
  typeof error === "object" && error !== null &&
  "name" in error && error.name === "AbortError";

export const openDocumentWithPicker = async () => {
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (!picker) return null;
  const [handle] = await picker({
    multiple: false,
    // Keep images and projects in one native filter. Multiple entries here
    // cause the file picker to show a separate filter menu.
    types: [OPEN_DOCUMENT_PICKER_TYPE],
  });
  if (!handle) return null;
  return { handle, file: await handle.getFile() };
};

export const ensureWritePermission = async (handle: ZynaloFileHandle) => {
  const options = { mode: "readwrite" as const };
  if (handle.queryPermission && (await handle.queryPermission(options)) === "granted") return true;
  if (!handle.requestPermission) return true;
  return (await handle.requestPermission(options)) === "granted";
};

/** The Blob is fully encoded before this opens or truncates the destination. */
export const writeBlobToHandle = async (handle: ZynaloFileHandle, blob: Blob) => {
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    try { await writable.abort?.(); } catch { /* Preserve the original error. */ }
    throw error;
  }
};

export const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("The flattened image could not be encoded.");
  return response.blob();
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const createProjectBlob = (
  workspaceDocument: WorkspaceDocumentState,
  fileName = workspaceDocument.fileName,
) =>
  new Blob([serializeWorkspaceDocument({ ...workspaceDocument, fileName })], {
    type: "application/vnd.zyn+json",
  });

export const createFlattenedBlob = async (
  app: Application,
  container: Container,
  imageType: DocumentImageType,
) => dataUrlToBlob(await exportProjectImage(app, container, imageType));

export const writePreparedSave = async (target: DocumentSaveTarget, blob: Blob) => {
  if (target.kind === "download-fallback") {
    downloadBlob(blob, target.fileName);
    return;
  }
  if (!(await ensureWritePermission(target.handle))) {
    throw new DOMException("Write permission was denied.", "NotAllowedError");
  }
  await writeBlobToHandle(target.handle, blob);
};

export const saveToTarget = async (
  target: DocumentSaveTarget,
  prepareBlob: () => Promise<Blob> | Blob,
  onSaved: () => void,
) => {
  if (target.kind !== "download-fallback" &&
      !(await ensureWritePermission(target.handle))) {
    return { status: "permission-denied" as const };
  }
  // Encoding/serialization finishes before createWritable can truncate a file.
  const blob = await prepareBlob();
  if (target.kind === "download-fallback") downloadBlob(blob, target.fileName);
  else await writeBlobToHandle(target.handle, blob);
  onSaved();
  return { status: "saved" as const };
};

export const getCtrlSSaveAction = (
  workspaceDocument: Pick<WorkspaceDocumentState, "saveTarget" | "sourceFileName">,
) => workspaceDocument.saveTarget
  ? { kind: "save" as const, target: workspaceDocument.saveTarget }
  : {
      kind: "choose" as const,
      mode: workspaceDocument.sourceFileName ? "opened-image" as const : "new-document" as const,
    };

export const createOpenedProjectSaveTarget = (
  fileName: string,
  handle?: ZynaloFileHandle | null,
): DocumentSaveTarget => handle
  ? { kind: "zyn-project", handle, fileName }
  : { kind: "download-fallback", format: "zyn", fileName };

export const pickProjectSaveTarget = async (suggestedName: string) => {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) return null;
  const handle = await picker({
    suggestedName,
    types: [PROJECT_PICKER_TYPE],
    excludeAcceptAllOption: true,
  });
  return { kind: "zyn-project" as const, handle, fileName: handle.name };
};

export const pickFlattenedSaveTarget = async (
  suggestedName: string,
  format: DocumentImageType,
) => {
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (!picker) return null;
  const extension = format === "jpeg" ? ".jpg" : `.${format}`;
  const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
  const handle = await picker({
    suggestedName,
    types: [{ description: `${format.toUpperCase()} image`, accept: { [mime]: [extension] } }],
    excludeAcceptAllOption: true,
  });
  return { kind: "flattened-image" as const, handle, format, fileName: handle.name };
};

export const saveDocumentFromCanvas = async (
  app: Application,
  container: Container,
  workspaceDocument: WorkspaceDocumentState,
  options?: {
    fileBaseName?: string;
    imageType?: DocumentImageType;
  },
) => {
  const imageType = options?.imageType ?? workspaceDocument.preferredImageType;
  const blob = await createFlattenedBlob(app, container, imageType);
  const fileName = getDocumentDownloadName(
    workspaceDocument,
    options?.fileBaseName,
    imageType,
  );
  downloadBlob(blob, fileName);

  return {
    fileName,
    preferredImageType: imageType,
  };
};
