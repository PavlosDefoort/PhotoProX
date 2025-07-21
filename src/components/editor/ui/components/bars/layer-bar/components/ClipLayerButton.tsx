import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { AdjustmentLayerInterface } from "@/interfaces/project/LayerInterfaces";
import { findLayer, sortLayers } from "@/models/project/LayerManager";
import { AdjustmentLayer } from "@/models/project/Layers/Layers";
import { ContentPaste, ContentPasteOff } from "@mui/icons-material";

const ClipLayerButton: React.FC = () => {
  const { layerManager, setLayerManager } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);

  const renderIcon = () => {
    if (target instanceof AdjustmentLayer) {
      if (target.clipToBelow) {
        return (
          <ContentPasteOff
            className="w-6 h-6 cursor-pointer"
            onClick={() => {
              if (target instanceof AdjustmentLayer) {
                handleClipLayer(target, !target.clipToBelow);
              }
            }}
          />
        );
      } else {
        return (
          <ContentPaste
            className="w-6 h-6 cursor-pointer"
            onClick={() => {
              if (target instanceof AdjustmentLayer) {
                handleClipLayer(target, !target.clipToBelow);
              }
            }}
          />
        );
      }
    } else {
      return <ContentPaste className="w-6 h-6 cursor-not-allowed opacity-50" />;
    }
  };

  const handleClipLayer = (layer: AdjustmentLayer, clip: boolean) => {
    setLayerManager((draft) => {
      draft.layers = draft.layers.map((l) => {
        if (l.id === layer.id) {
          (l as AdjustmentLayerInterface).clipToBelow = clip;
          draft.target = l.id;
        }
        return l;
      });
      draft.layers = sortLayers(draft.layers);
      // Ensure the target is up to date
    });
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{renderIcon()}</TooltipTrigger>
        <TooltipContent className="text-xs" side="bottom">
          <p>
            {target instanceof AdjustmentLayer
              ? target.clipToBelow
                ? "Unclip Layer"
                : "Clip Layer"
              : "Clip unavailable"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ClipLayerButton;
