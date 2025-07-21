import Loading from "@/components/editor/ui/modals/Loading";
import { ProjectContext } from "@/context/ProjectContext";
import { EditMode } from "@/interfaces/types/ProjectRelatedTypes";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";
import { LayerManager } from "@/models/project/LayerManager";
import { Project } from "@/models/project/Project";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useImmer } from "use-immer";
import "../styles/animations.css";

const PhotoEditor = dynamic(() => import("@/components/editor/PhotoEditor"));

export default function Editor({}) {
  // // Create a new project

  const [project, setProject] = useImmer<Project>(new Project());
  const [layerManager, setLayerManager] = useImmer<LayerManager>(
    new LayerManager()
  );
  const [undoRedoManager, setUndoRedoManager] = useImmer<UndoRedoManager>(
    new UndoRedoManager()
  );
  const [trigger, setTrigger] = useState(false);
  const [landing, setLanding] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("view");
  const [loading, setLoading] = useState(false);
  const [isLoadingBar, setIsLoadingBar] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTask, setLoadingTask] = useState<"compressing" | "regular">(
    "regular"
  );

  // useEffect(() => {
  //   setAutoFreeze(false);
  // }, []);

  return (
    <main className={`h-screen max-h-screen   select-none`}>
      <div
        className={`bg-[#cdcdcd] dark:bg-[#252525] h-full w-full ${
          loading ? "tint-in" : "tint-out"
        }`}
      >
        <ProjectContext.Provider
          value={{
            project,
            setProject,
            undoRedoManager,
            setUndoRedoManager,
            layerManager,
            setLayerManager,
            trigger,
            setTrigger,
            landing,
            setLanding,
            loading,
            setLoading,
            editMode,
            setEditMode,
            loadingProgress,
            setLoadingProgress,
            isLoadingBar,
            setIsLoadingBar,
            loadingTask,
            setLoadingTask,
          }}
        >
          <PhotoEditor />
        </ProjectContext.Provider>
      </div>
      {loading && (
        <Loading
          isLoadingBar={isLoadingBar}
          progressValue={loadingProgress}
          loading={loading}
          task={loadingTask}
        />
      )}
    </main>
  );
}
