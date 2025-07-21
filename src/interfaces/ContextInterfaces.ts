import { DraftFunction } from "use-immer";
import { User } from "firebase/auth";
import { MutableRefObject, ReactNode } from "react";
import { Project } from "@/models/project/Project";
import { EditMode } from "./types/ProjectRelatedTypes";
import { Application } from "pixi.js";
import { PhotoProXUser } from "./FirebaseInterfaces";
import { LayerManager } from "@/models/project/LayerManager";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";
import { ContainerX } from "@/models/pixi-extends/SpriteX";

export interface ProjectContextValue {
  project: Project;
  setProject: (arg: Project | DraftFunction<Project>) => void;
  layerManager: LayerManager;
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void;
  undoRedoManager: UndoRedoManager;
  setUndoRedoManager: (
    arg: UndoRedoManager | DraftFunction<UndoRedoManager>
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
  loadingTask: "compressing" | "regular";
  setLoadingTask: (value: "compressing" | "regular") => void;
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
  photoProXUser: PhotoProXUser;
  setPhotoProXUser: (value: PhotoProXUser) => void;
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
}
