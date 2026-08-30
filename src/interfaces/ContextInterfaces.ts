import { DraftFunction } from "use-immer";
import { User } from "firebase/auth";
import { MutableRefObject, ReactNode } from "react";
import { Project } from "@/models/project/Project";
import { EditMode } from "./types/ProjectRelatedTypes";
import { Application } from "pixi.js";
import { ZynaloUser } from "./FirebaseInterfaces";
import { LayerManager } from "@/models/project/LayerManager";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { EditDocument } from "./editor/EditDocument";
import {
  DocumentImageType,
  DocumentSaveTarget,
  EditorWorkspace,
  ZynaloFileHandle,
  WorkspaceDocumentState,
} from "./editor/EditorWorkspace";

export interface ProjectContextValue {
  workspace: EditorWorkspace;
  setWorkspace: (
    arg: EditorWorkspace | DraftFunction<EditorWorkspace>,
  ) => void;
  project: Project;
  setProject: (arg: Project | DraftFunction<Project>) => void;
  layerManager: LayerManager;
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void;
  editDocument: EditDocument;
  setEditDocument: (
    arg: EditDocument | DraftFunction<EditDocument>,
  ) => void;
  undoRedoManager: UndoRedoManager;
  setUndoRedoManager: (
    arg: UndoRedoManager | DraftFunction<UndoRedoManager>,
  ) => void;
  trigger: boolean;
  setTrigger: (value: boolean) => void;
  landing: boolean;
  setLanding: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  editMode: EditMode;
  setEditMode: (value: EditMode) => void;
  loadingProgress: number;
  setLoadingProgress: (value: number) => void;
  isLoadingBar: boolean;
  setIsLoadingBar: (value: boolean) => void;
  loadingTask: "compressing" | "regular" | "inpainting";
  setLoadingTask: (value: "compressing" | "regular" | "inpainting") => void;
  loadingProgressText: string;
  setLoadingProgressText: (value: string) => void;
  activeDocumentId: string | null;
  activeDocument: WorkspaceDocumentState | null;
  createBlankDocument: (options?: {
    width?: number;
    height?: number;
    name?: string;
    colorHex?: string;
    opacity?: number;
  }) => string;
  openImageFile: (file: File, handle?: ZynaloFileHandle | null) => Promise<string | null>;
  openProjectFile: (file: File, handle?: ZynaloFileHandle | null) => Promise<boolean>;
  activateDocument: (documentId: string) => void;
  reorderDocuments: (sourceIndex: number, destinationIndex: number) => void;
  closeDocument: (documentId: string) => void;
  cycleDocuments: (direction: 1 | -1) => void;
  markDocumentSaved: (
    documentId: string,
    options?: {
      fileName?: string | null;
      preferredImageType?: DocumentImageType;
      saveTarget?: DocumentSaveTarget | null;
    },
  ) => void;
  updateActiveCanvasView: (view: {
    currentZoom: number;
    targetZoom: number;
    position: { x: number; y: number };
    initialized?: boolean;
  }) => void;
}

export interface ThemeContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  zynaloUser: ZynaloUser;
  setZynaloUser: (value: ZynaloUser) => void;
}

export interface CanvasContextValue {
  // Make them all mutable refs so we can change them
  app: MutableRefObject<Application | null>;
  container: ContainerX | null;
  setContainer: (value: ContainerX | null) => void;
  canvas: MutableRefObject<HTMLCanvasElement | null>;
  currentZoom: number;
  setCurrentZoom: (value: number) => void;
  targetZoom: number;
  setTargetZoom: (value: number) => void;
  targetPosition: MutableRefObject<{ x: number; y: number }>;
  targetMousePos: MutableRefObject<{ x: number; y: number }>;
  targetWorldMousePos: MutableRefObject<{ x: number; y: number }>;
  zoomFromUser: MutableRefObject<boolean>;
  /**
   * Writing a value here asks the MovementLogic animation loop to synchronously
   * snap the container transform and its internal zoom refs on the very next frame,
   * bypassing React state batching. Set to null after the snap is consumed.
   */
  pendingZoomSnap: MutableRefObject<{
    zoom: number;
    x: number;
    y: number;
  } | null>;
  pixelGridEnabled: boolean;
  setPixelGridEnabled: (value: boolean) => void;
  pixelViewEnabled: boolean;
  setPixelViewEnabled: (value: boolean) => void;
}
