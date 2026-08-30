import { EditDocument } from "./EditDocument";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";
import { LayerManager } from "@/models/project/LayerManager";
import { Project } from "@/models/project/Project";

export type DocumentImageType = "png" | "jpeg" | "webp";

export interface ZynaloFileHandle {
  name: string;
  kind: "file";
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: Blob | string | ArrayBuffer | ArrayBufferView): Promise<void>;
    close(): Promise<void>;
    abort?(): Promise<void>;
  }>;
  queryPermission?(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}

export type DocumentSaveTarget =
  | {
      kind: "source-image" | "flattened-image";
      handle: ZynaloFileHandle;
      format: DocumentImageType;
      fileName: string;
    }
  | {
      kind: "zyn-project";
      handle: ZynaloFileHandle;
      fileName: string;
    }
  | {
      kind: "download-fallback";
      format: "zyn" | DocumentImageType;
      fileName: string;
    };

export interface DocumentCanvasViewState {
  currentZoom: number;
  targetZoom: number;
  position: {
    x: number;
    y: number;
  };
  initialized: boolean;
}

export interface WorkspaceDocumentState {
  id: string;
  project: Project;
  layerManager: LayerManager;
  editDocument: EditDocument;
  undoRedoManager: UndoRedoManager;
  fileName: string | null;
  sourceFileName: string | null;
  sourceFingerprint: string | null;
  /** Runtime-only. File handles are deliberately excluded from serialization. */
  sourceFileHandle: ZynaloFileHandle | null;
  /** Runtime-only Ctrl+S destination. Deliberately excluded from serialization. */
  saveTarget: DocumentSaveTarget | null;
  preferredImageType: DocumentImageType;
  savedSnapshot: string;
  isDirty: boolean;
  canvasView: DocumentCanvasViewState;
}

export interface EditorWorkspace {
  openDocuments: WorkspaceDocumentState[];
  activeDocumentId: string | null;
  untitledCount: number;
}

export type CloseDocumentDecision = "save" | "discard" | "cancel";
