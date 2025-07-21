import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/useProject";
import { SpriteX } from "@/models/pixi-extends/SpriteX";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { clamp, roundToDecimalPlaces } from "@/utils/CalcUtils";
import { FormatAlignCenter, SwapHoriz, SwapVert } from "@mui/icons-material";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import React, { useCallback, useEffect } from "react";
import "../../../../../../../../styles/animations.css";
import Dimensions from "./Dimensions";
import Position from "./Position";
import Rotation from "./Rotation";
import Skew from "./Skew";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TransformTool: React.FC = ({}) => {
  const {
    project,
    setProject,
    editMode,
    setEditMode,
    layerManager,
    setLayerManager,
  } = useProject();

  const target = findLayer(layerManager.layers, layerManager.target);
  const [update, setUpdate] = React.useState(false);

  // Save the previous values of the target sprite in case the user cancels the transformation
  const rotateValueRef = React.useRef(0);
  const scaleXSignRef = React.useRef(1);
  const scaleYSignRef = React.useRef(1);
  const positionXRef = React.useRef(0);
  const positionYRef = React.useRef(0);
  const heightRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const skewXRef = React.useRef(0);
  const skewYRef = React.useRef(0);

  useEffect(() => {
    if (target instanceof ImageLayer) {
      const { height, width, position, angle, scale, skew } = target.sprite;
      heightRef.current = height;
      widthRef.current = width;
      positionXRef.current = position.x;
      positionYRef.current = position.y;
      rotateValueRef.current = angle;
      scaleXSignRef.current = scale.x;
      scaleYSignRef.current = scale.y;
      skewXRef.current = skew.x;
      skewYRef.current = skew.y;
    }
  }, [editMode, target]);

  const handleCancel = useCallback(() => {
    if (target instanceof ImageLayer) {
      target.sprite.height = heightRef.current;
      target.sprite.width = widthRef.current;
      target.sprite.position.x = positionXRef.current;
      target.sprite.position.y = positionYRef.current;
      target.sprite.angle = rotateValueRef.current;
      target.sprite.scale.x = scaleXSignRef.current;
      target.sprite.scale.y = scaleYSignRef.current;
      target.sprite.skew.x = skewXRef.current;
      target.sprite.skew.y = skewYRef.current;
    }
    setEditMode("view");
  }, [setEditMode, target]);

  // Create event listener for ctrl + t to toggle the showTransform state
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (Cmd on macOS) + T is pressed
      // Prevent browser's default behavior
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "t" &&
        event.altKey
      ) {
        event.preventDefault(); // Prevent browser's default behavior
        setEditMode("transform");
      }
      if (editMode === "transform" && event.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editMode, handleCancel, setEditMode]);

  const getOriginalValues = (targetSprite: SpriteX) => {
    const originalValues = {
      height: targetSprite.height,
      width: targetSprite.width,
      position: {
        x: project.settings.canvasSettings.width / 2,
        y: project.settings.canvasSettings.height / 2,
      },
      skew: { x: 0, y: 0 },
      angle: 0,
      scale: { x: 1, y: 1 },
    };
    return originalValues;
  };

  const resetTransform = () => {
    if (target instanceof ImageLayer) {
      const originalValues = getOriginalValues(target.sprite);
      const { height, width, position, skew, angle, scale } = originalValues;

      setLayerManager((draft) => {
        // Update the layers
        draft.layers = draft.layers.map((layer) => {
          if (layer.id === target.id && layer instanceof ImageLayer) {
            layer.sprite.height = height;
            layer.sprite.width = width;
            layer.sprite.position.x = position.x;
            layer.sprite.position.y = position.y;
            layer.sprite.skew.x = skew.x;
            layer.sprite.skew.y = skew.y;
            layer.sprite.angle = angle;
            layer.sprite.scale.x = scale.x;
            layer.sprite.scale.y = scale.y;
          }
          return layer;
        });
      });
      setUpdate(!update);
    }
  };

  const handleDone = () => {
    setEditMode("view");
  };

  return (
    <div className="w-full" id="transforming">
      {target instanceof ImageLayer && editMode === "transform" && (
        <div className="relative h-full w-full">
          <div
            className={`h-10 flex-wrap w-full z-10 bg-navbarBackground dark:bg-navbarBackground border-b-2 border-[#cdcdcd] dark:border-[#252525] flex justify-center items-center   text-black dark:text-white`}
          >
            <Skew target={target} update={update} />
            <Dimensions target={target} update={update} />
            <Position target={target} update={update} />
            <Rotation target={target} update={update} />
          </div>
          <TransformModal
            target={target}
            handleCancel={handleCancel}
            handleDone={handleDone}
            handleReset={resetTransform}
            setUpdate={setUpdate}
            update={update}
          />
        </div>
      )}
    </div>
  );
};
export default TransformTool;

interface TransformModalProps {
  target: ImageLayer;
  handleCancel: () => void;
  handleDone: () => void;
  handleReset: () => void;
  setUpdate: (update: boolean) => void;
  update: boolean;
}

const TransformModal: React.FC<TransformModalProps> = ({
  target,
  handleCancel,
  handleDone,
  handleReset,
  setUpdate,
  update,
}) => {
  const { project } = useProject();
  return (
    <div
      className="h-12 z-10 w-72 fixed bottom-0 flex flex-row items-center justify-center mb-8  text-black dark:text-white animate-jump-in animate-once"
      style={{
        left: `${
          document.getElementById("logo-sidebar")?.clientWidth! +
          (document.getElementById("transforming")?.clientWidth! / 2 - 144)
        }px`,
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            {" "}
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                const newRotateValue = clamp(
                  target.sprite.scale.x * target.sprite.scale.y === 1
                    ? target.sprite.angle - 15
                    : target.sprite.angle + 15,
                  -360,
                  360
                );
                const roundedValue = roundToDecimalPlaces(
                  newRotateValue,
                  1
                ).toFixed(1);
                target.sprite.angle = Number(roundedValue);
                setUpdate(!update);
              }}
              disabled={
                target.sprite.scale.x * target.sprite.scale.y === 1
                  ? target.sprite.angle === -360
                  : target.sprite.angle === 360
              }
            >
              <RotateLeftIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent>Rotate left</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                const newRotateValue = clamp(
                  target.sprite.scale.x * target.sprite.scale.y === 1
                    ? target.sprite.angle + 15
                    : target.sprite.angle - 15,
                  -360,
                  360
                );
                const roundedValue = roundToDecimalPlaces(newRotateValue, 0);
                const preciseValue = Math.round(
                  Number(roundedValue.toFixed(0))
                );

                target.sprite.angle = preciseValue;
                setUpdate(!update);
              }}
              disabled={
                target.sprite.scale.x * target.sprite.scale.y === 1
                  ? target.sprite.angle === 360
                  : target.sprite.angle === -360
              }
            >
              <RotateRightIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent>Rotate right</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                const middleX = Math.round(
                  project.settings.canvasSettings.width / 2
                );
                const middleY = Math.round(
                  project.settings.canvasSettings.height / 2
                );
                target.sprite.position = { x: middleX, y: middleY };
                setUpdate(!update);
              }}
            >
              <FormatAlignCenter />
            </button>
          </TooltipTrigger>
          <TooltipContent>Position to center</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                target.sprite.scale.x *= -1;
                setUpdate(!update);
              }}
            >
              <SwapHoriz
                className={`${target.sprite.scale.x < 0 ? "bg-blue-400" : ""}`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>Flip horizontally</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                target.sprite.scale.y *= -1;
                setUpdate(!update);
              }}
            >
              <SwapVert
                className={`${target.sprite.scale.y < 0 ? "bg-blue-400" : ""}`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>Flip vertically</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-14 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black"
              onClick={() => handleCancel()}
            >
              Cancel
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancel transformation</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ResetAlert resetTransform={handleReset} />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              className="bg-blue-500 dark:bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-600 w-14 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-white"
              onClick={() => handleDone()}
            >
              Done
            </Button>
          </TooltipTrigger>
          <TooltipContent>Confirm transformation</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

interface ResetAlertProps {
  resetTransform: () => void;
}
const ResetAlert: React.FC<ResetAlertProps> = ({ resetTransform }) => {
  return (
    <AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            {" "}
            <AlertDialogTrigger
              asChild
              className="bg-red-500 hover:bg-red-600 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 w-10 h-8 text-sm"
            >
              <Button variant="outline" className="w-14 h-8 text-white">
                Reset
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Reset transformation</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent className="text-black dark:text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will redo all the transformations you have made to the
            image. This action can be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={resetTransform}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
