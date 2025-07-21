import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { findLayer } from "@/models/project/LayerManager";
import { LayerX } from "@/models/project/Layers/Layers";
import { handleDeleteLayer } from "@/utils/LayerUtils";
import { TrashIcon } from "@radix-ui/react-icons";

const DeleteLayerButton: React.FC = () => {
  const {
    layerManager,
    setLayerManager,
    undoRedoManager,
    setUndoRedoManager,
    project,
  } = useProject();

  const target = findLayer(layerManager.layers, layerManager.target);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <TrashIcon
            className={`w-6 h-6 active:text-blue-500 transition-colors ${
              target ? "cursor-pointer" : "cursor-not-allowed"
            }`}
            onClick={() => {
              if (target instanceof LayerX) {
                handleDeleteLayer(
                  target,
                  project.settings.canvasSettings.width,
                  project.settings.canvasSettings.height,
                  setLayerManager,
                  setUndoRedoManager
                );
              }
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="text-xs" side="bottom">
          {target ? "Delete Layer" : "No Layer Selected"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DeleteLayerButton;
