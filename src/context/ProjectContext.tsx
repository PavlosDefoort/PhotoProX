import { createContext } from "react";
import { ProjectContextValue } from "@/interfaces/ContextInterfaces";
import { DraftFunction } from "use-immer";
import { Project } from "@/models/project/Project";
import { LayerManager } from "@/models/project/LayerManager";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";

// Define the default context value
export const ProjectContext = createContext<ProjectContextValue>({
  project: new Project(),
  setProject: (arg: Project | DraftFunction<Project>) => {
    // Add your implementation here
  },
  layerManager: new LayerManager(),
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => {},
  undoRedoManager: new UndoRedoManager(),
  setUndoRedoManager: (
    arg: UndoRedoManager | DraftFunction<UndoRedoManager>
  ) => {},
  trigger: false,
  setTrigger: (value: boolean) => {
    // Add your implementation here
  },
  landing: false,
  setLanding: (value: boolean) => {
    // Add your implementation here
  },
  loading: false,
  setLoading: (value: boolean) => {
    // Add your implementation here
  },
  editMode: "view",
  setEditMode: (value) => {
    // Add your implementation here
  },
  loadingProgress: 0,
  setLoadingProgress: (value) => {
    // Add your implementation here
  },
  isLoadingBar: false,
  setIsLoadingBar: (value) => {
    // Add your implementation here
  },
  loadingTask: "regular",
  setLoadingTask: (value) => {
    // Add your implementation here
  },
});
