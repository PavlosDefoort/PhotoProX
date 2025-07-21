import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { LayerXInterface } from "@/interfaces/project/LayerInterfaces";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { set } from "lodash";

interface VisibilityButtonProps {
  layer: LayerXInterface;
}
const VisibilityButton: React.FC<VisibilityButtonProps> = ({ layer }) => {
  const { trigger, setTrigger, layerManager, setLayerManager } = useProject();

  return (
    <div>
      {layer.visible ? (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
                  onClick={() => {
                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          l.visible = false;
                        }
                        return l;
                      });
                    });
                  }}
                >
                  <EyeOpenIcon className="cursor-pointer w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="bottom" sideOffset={10}>
                <p>Hide layer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : (
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
                  onClick={() => {
                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          l.visible = true;
                        }
                        return l;
                      });
                    });
                  }}
                >
                  <EyeClosedIcon className="cursor-pointer z-10 w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                className="text-xs z-10"
                side="bottom"
                sideOffset={10}
              >
                <p>Show layer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default VisibilityButton;
