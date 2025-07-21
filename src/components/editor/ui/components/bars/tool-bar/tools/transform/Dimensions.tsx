import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const { project, setLayerManager } = useProject();

  useEffect(
    () => {
      setWidth(target.sprite.width);
      setHeight(target.sprite.height);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update]
  );

  const handleDimensionEnter = (
    dimension: string,
    value: number,
    isRatio: boolean
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

        target.sprite.width = Number(value);
        target.sprite.height = Number(newHeight);

        setWidth(value);
        setHeight(Number(newHeight));
      } else {
        let newWidth = Math.round(value * aspectRatio);
        // Check if newWidth is NaN
        if (isNaN(Number(newWidth))) {
          newWidth = 0;
        }
        target.sprite.height = Number(value);
        target.sprite.width = Number(newWidth);
        setWidth(Number(newWidth));
        setHeight(value);

        // Position the image in the center of the canvas
      }
    } else {
      if (dimension === "w") {
        target.sprite.width = Number(value);
        setWidth(value);
      } else {
        target.sprite.height = Number(value);
        setHeight(value);
      }
    }
    // const middleX = Math.round(project.settings.canvasSettings.width / 2);
    // const middleY = Math.round(project.settings.canvasSettings.height / 2);
    // target.sprite.position.x = middleX;
    // target.sprite.position.y = middleY;
  };

  return (
    <div className="flex flex-row items-center justify-center">
      <div className="w-40 h-7 flex flex-row items-center justify-center cursor-fancy ">
        <Label className="text-xs mr-2" htmlFor="widthTool">
          Width
        </Label>
        <NumberInput
          value={width}
          min={1}
          setValue={setWidth}
          onBlur={(e) => {
            handleDimensionEnter(
              "w",
              parseFloat(e.currentTarget.value),
              isRatio
            );
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleDimensionEnter(
                "w",
                parseFloat(e.currentTarget.value),
                isRatio
              );
            }
          }}
        />

        {isRatio && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger>
                {" "}
                <button
                  className="ml-2 w-5 h-5 flex items-center justify-center"
                  onClick={() => setIsRatio(false)}
                >
                  <LockClosedIcon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Maintain aspect ratio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {!isRatio && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger>
                {" "}
                <button
                  className="ml-2 w-5 h-5 flex items-center justify-center"
                  onClick={() => setIsRatio(true)}
                >
                  <LockOpen1Icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className=" text-xs">
                <p>Neglect aspect ratio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="w-40 h-7 flex flex-row items-center justify-center cursor-fancy">
        <Label className="text-xs mr-2" htmlFor="heightTool">
          Height
        </Label>
        <NumberInput
          value={height}
          min={1}
          setValue={setHeight}
          onBlur={(e) => {
            handleDimensionEnter(
              "h",
              parseFloat(e.currentTarget.value),
              isRatio
            );
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleDimensionEnter(
                "h",
                parseFloat(e.currentTarget.value),
                isRatio
              );
            }
          }}
        />
      </div>
    </div>
  );
};

export default Dimensions;
