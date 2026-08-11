import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useImageTransformActions } from "@/hooks/useImageTransformActions";
import { useProject } from "@/hooks/useProject";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { LockClosedIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface DimensionsProps {
  target: ImageLayer;
  update: boolean;
}

const Dimensions: React.FC<DimensionsProps> = ({ target, update }) => {
  const [isRatio, setIsRatio] = useState<boolean>(true);
  const [width, setWidth] = useState<number>(target.sprite.width);
  const [height, setHeight] = useState<number>(target.sprite.height);
  const { editDocument } = useProject();
  const { dispatchSelectedImageActions } = useImageTransformActions();
  const documentTransform = editDocument.imageLayers[target.id]?.transform;

  useEffect(
    () => {
      setWidth(target.sprite.width);
      setHeight(target.sprite.height);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentTransform, target.sprite.height, target.sprite.width, update],
  );

  const handleDimensionEnter = (
    dimension: string,
    value: number,
    isRatio: boolean,
  ) => {
    if (isRatio) {
      const aspectRatio =
        target.imageData.imageWidth / target.imageData.imageHeight;
      // Calculate corresponding width or height to maintain aspect ratio

      if (dimension === "w") {
        let newHeight = Math.round(value / aspectRatio).toFixed(0);
        // Check if newHeight is NaN
        if (isNaN(Number(newHeight))) {
          newHeight = "0";
        }

        const result = dispatchSelectedImageActions(
          [
            {
              type: "image.setDimensions",
              width: Number(value),
              height: Number(newHeight),
            },
          ],
          "Resize image",
        );
        if (result.ok) {
          setWidth(target.sprite.width);
          setHeight(target.sprite.height);
        }
      } else {
        let newWidth = Math.round(value * aspectRatio);
        // Check if newWidth is NaN
        if (isNaN(Number(newWidth))) {
          newWidth = 0;
        }
        const result = dispatchSelectedImageActions(
          [
            {
              type: "image.setDimensions",
              width: Number(newWidth),
              height: Number(value),
            },
          ],
          "Resize image",
        );
        if (result.ok) {
          setWidth(target.sprite.width);
          setHeight(target.sprite.height);
        }

        // Position the image in the center of the canvas
      }
    } else {
      if (dimension === "w") {
        const result = dispatchSelectedImageActions(
          [
            {
              type: "image.setDimensions",
              width: Number(value),
              height: target.sprite.height,
            },
          ],
          "Resize image width",
        );
        if (result.ok) {
          setWidth(target.sprite.width);
        }
      } else {
        const result = dispatchSelectedImageActions(
          [
            {
              type: "image.setDimensions",
              width: target.sprite.width,
              height: Number(value),
            },
          ],
          "Resize image height",
        );
        if (result.ok) {
          setHeight(target.sprite.height);
        }
      }
    }
    // const middleX = Math.round(project.settings.canvasSettings.width / 2);
    // const middleY = Math.round(project.settings.canvasSettings.height / 2);
    // target.sprite.position.x = middleX;
    // target.sprite.position.y = middleY;
  };

  return (
    <div className="flex shrink-0 flex-row items-center gap-1.5 border-r border-gray-500/40 pr-3">
      {/* Width */}
      <div className="flex items-center gap-1 cursor-fancy" data-show-me-control="transform.scale-percent">
        <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          W
        </span>
        <NumberInput
          value={width}
          min={1}
          setValue={setWidth}
          onBlur={(e) =>
            handleDimensionEnter("w", parseFloat(e.currentTarget.value), isRatio)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter")
              handleDimensionEnter("w", parseFloat(e.currentTarget.value), isRatio);
          }}
        />
      </div>

      {/* Aspect ratio lock */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => setIsRatio((r) => !r)}
            >
              {isRatio ? (
                <LockClosedIcon className="h-3.5 w-3.5" />
              ) : (
                <LockOpen1Icon className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Height */}
      <div className="flex items-center gap-1 cursor-fancy">
        <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          H
        </span>
        <NumberInput
          value={height}
          min={1}
          setValue={setHeight}
          onBlur={(e) =>
            handleDimensionEnter("h", parseFloat(e.currentTarget.value), isRatio)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter")
              handleDimensionEnter("h", parseFloat(e.currentTarget.value), isRatio);
          }}
        />
      </div>
    </div>
  );
};

export default Dimensions;
