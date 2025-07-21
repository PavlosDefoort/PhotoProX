import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import MiniApplication from "./MiniApplication";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/useProject";
import {
  ArrowTopLeftIcon,
  ArrowUpIcon,
  ArrowTopRightIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowBottomLeftIcon,
  ArrowBottomRightIcon,
  ArrowDownIcon,
  CircleIcon,
  Link1Icon,
  LinkBreak1Icon,
} from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/hooks/useCanvas";
import { createContainerBM } from "@/utils/PixiUtils";
import { getBackgroundLayer, removeLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import ResizeComponent from "./ResizeComponent";

interface ResizeProjectProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ResizeProject: React.FC<ResizeProjectProps> = ({ open, setOpen }) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const { project, setProject, layerManager, setLayerManager } = useProject();
  const [anchor, setAnchor] = useState({ x: 0.5, y: 0.5 });
  const { container, setContainer, app } = useCanvas();

  // TODO: Loading animation
  // TODO: Throttle the input changes

  useEffect(() => {
    setWidth(project.settings.canvasSettings.width);
    setHeight(project.settings.canvasSettings.height);
  }, [
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
  ]);

  const handleReset = () => {
    setWidth(project.settings.canvasSettings.width);
    setHeight(project.settings.canvasSettings.height);
  };

  const handleSave = () => {
    // Save the new dimensions
    if (!container || !app.current) return;

    // Resize the canvas

    // 1. Delete the current container, remove all the children first so we can keep the layers
    container.removeChildren();

    // 2. Delete the current container
    container.destroy();

    // 3. Create a new container
    const newContainer = createContainerBM(width, height);

    // 3.5. Position the container in the center of the canvas
    newContainer.position.set(
      app.current.renderer.width / 2,
      app.current.renderer.height / 2
    );

    // 3.75 Create a new background layer
    const newBackground = layerManager.createBackgroundLayer(
      false,
      "#ffffff",
      width,
      height,
      1
    );

    const currentBackground = getBackgroundLayer(layerManager.layers);
    if (currentBackground) {
      setLayerManager((draft) => {
        draft.layers = removeLayer(draft.layers, currentBackground.id);
        draft.layers.unshift(newBackground);
        // Update the position of the sprites based on the anchor
        draft.layers.forEach((layer) => {
          if (layer instanceof ImageLayer) {
            layer.sprite.anchor.set(anchor.x, anchor.y);
            layer.sprite.position.set(anchor.x * width, anchor.y * height);
          }
        });
      });
    }

    // 4. Add the new container to the stage
    app.current.stage.addChild(newContainer);

    // 5. Set the new container
    setContainer(newContainer);

    setProject((draft) => {
      draft.settings.canvasSettings.width = width;
      draft.settings.canvasSettings.height = height;
    });

    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className={`sm:max-w-[750px] text-black dark:text-white`}>
        <DialogHeader>
          <DialogTitle>Resize</DialogTitle>
          <DialogDescription className="dark:text-slate-100">
            Change the canvas dimensions.
          </DialogDescription>
        </DialogHeader>
        <ResizeComponent
          width={width}
          height={height}
          setWidth={setWidth}
          setHeight={setHeight}
          anchor={anchor}
          setAnchor={setAnchor}
        />

        <div className="flex flex-row space-x-4 w-full justify-end">
          <Button onClick={handleCancel} variant={"secondary"}>
            Cancel
          </Button>

          <Button onClick={handleReset} variant={"secondary"}>
            Reset
          </Button>
          <Button onClick={handleSave} variant={"default"}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResizeProject;
