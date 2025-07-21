import { useContext } from "react";
import { ProjectContext } from "../context/ProjectContext";

export function useProject() {
  const {
    project,
    setProject,
    layerManager,
    setLayerManager,
    undoRedoManager,
    setUndoRedoManager,
    loading,
    setLoading,
    trigger,
    setTrigger,
    landing,
    setLanding,
    editMode,
    setEditMode,
    isLoadingBar,
    setIsLoadingBar,
    loadingProgress,
    setLoadingProgress,
    loadingTask,
    setLoadingTask,
  } = useContext(ProjectContext);

  return {
    project,
    setProject,
    layerManager,
    setLayerManager,
    undoRedoManager,
    setUndoRedoManager,
    loading,
    setLoading,
    trigger,
    landing,
    setLanding,
    setTrigger,
    editMode,
    setEditMode,
    isLoadingBar,
    setIsLoadingBar,
    loadingProgress,
    setLoadingProgress,
    loadingTask,
    setLoadingTask,
  };
}
