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
import MiniApplication from "./MiniApplication";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProject } from "@/hooks/useProject";

interface ResizeComponentProps {
  width: number;
  height: number;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  anchor: { x: number; y: number };
  setAnchor: (anchor: { x: number; y: number }) => void;
}
const ResizeComponent: React.FC<ResizeComponentProps> = ({
  width,
  height,
  anchor,
  setWidth,
  setHeight,
  setAnchor,
}) => {
  const [isRatio, setIsRatio] = useState(true);

  const handleRatio = (newDimension: number, dimension: string) => {
    // ratio = width / height
    // width = height * ratio
    // height = width / ratio
    if (dimension === "width") {
      return {
        width: newDimension,
        height: newDimension / (width / height),
      };
    } else {
      return {
        width: newDimension * (width / height),
        height: newDimension,
      };
    }
  };
  const handleOnInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    dimension: string
  ) => {
    if (
      parseInt(e.target.value) < 1 ||
      parseInt(e.target.value) > 10000 ||
      isNaN(parseInt(e.target.value))
    ) {
      alert("Dimensions must be between 1 and 10000");
      return;
    }
    let newDimensions = { width: width, height: height };
    if (isRatio) {
      newDimensions = handleRatio(parseInt(e.target.value), dimension);
    } else {
      if (dimension === "width") {
        newDimensions = { width: parseInt(e.target.value), height: height };
      }
      if (dimension === "height") {
        newDimensions = { width: width, height: parseInt(e.target.value) };
      }
    }
    //  Round to the nearest integer
    const rounded = {
      width: Math.round(newDimensions.width),
      height: Math.round(newDimensions.height),
    };
    setWidth(rounded.width);
    setHeight(rounded.height);
  };

  return (
    <div className="flex flex-col justify-center items-center space-y-4">
      <div className="w-[600px] h-[300px]">
        <MiniApplication width={width} height={height} anchor={anchor} />
      </div>
      <div className="grid grid-cols-2 grid-flow-row w-80 gap-x-12 gap-y-2">
        <Label className="font-semibold border-b-2 pb-2 w-40">Dimensions</Label>
        <Label
          className="font-semibold border-b-2 pb-2 w-24"
          htmlFor="select-anchor"
        >
          Anchor
        </Label>
        <div className="flex flex-row space-x-3 items-center w-64">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="w-12 " onClick={() => setIsRatio(!isRatio)}>
                  {isRatio ? <Link1Icon /> : <LinkBreak1Icon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRatio ? "Maintain aspect ratio" : "Free aspect ratio"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex flex-col w-24 space-y-2">
            <div className="">
              <Label className="" htmlFor="resize-width">
                Width
              </Label>
              <Input
                type="number"
                value={width}
                step={10}
                min={1}
                max={10000}
                onChange={(e) => {
                  handleOnInputChange(e, "width");
                }}
                id="resize-width"
                className="bg-white dark:bg-input dark:text-white text-black border-2 border-[#e3e7ea]"
              />
            </div>
            <div>
              <Label className="" htmlFor="resize-height">
                Height
              </Label>
              <Input
                type="number"
                value={height}
                step={10}
                min={1}
                max={10000}
                onChange={(e) => {
                  handleOnInputChange(e, "height");
                }}
                id="resize-height"
                className="bg-white dark:bg-input dark:text-white text-black border-2 border-[#e3e7ea]"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start justify-center">
          <SelectAnchor anchor={anchor} setAnchor={setAnchor} />
        </div>
      </div>
    </div>
  );
};

export default ResizeComponent;

interface SelectAnchorProps {
  anchor: { x: number; y: number };
  setAnchor: (anchor: { x: number; y: number }) => void;
}
const SelectAnchor: React.FC<SelectAnchorProps> = ({ anchor, setAnchor }) => {
  const [currentAnchor, setCurrentAnchor] = useState("center-center");

  interface Anchor {
    icon: React.ReactNode;
    value: string;
  }
  const anchors: Anchor[] = [
    { icon: <ArrowTopLeftIcon />, value: "top-left" },
    { icon: <ArrowUpIcon />, value: "top-center" },
    { icon: <ArrowTopRightIcon />, value: "top-right" },
    { icon: <ArrowLeftIcon />, value: "center-left" },
    { icon: <CircleIcon />, value: "center-center" },
    { icon: <ArrowRightIcon />, value: "center-right" },
    { icon: <ArrowBottomLeftIcon />, value: "bottom-left" },
    { icon: <ArrowDownIcon />, value: "bottom-center" },
    { icon: <ArrowBottomRightIcon />, value: "bottom-right" },
  ];

  const handleAnchorSelection = (selection: string) => {
    switch (selection) {
      case "top-left":
        setAnchor({ x: 0, y: 0 });
        setCurrentAnchor("top-left");
        break;
      case "top-center":
        setAnchor({ x: 0.5, y: 0 });
        setCurrentAnchor("top-center");
        break;
      case "top-right":
        setAnchor({ x: 1, y: 0 });
        setCurrentAnchor("top-right");
        break;
      case "center-left":
        setAnchor({ x: 0, y: 0.5 });
        setCurrentAnchor("center-left");
        break;
      case "center-center":
        setAnchor({ x: 0.5, y: 0.5 });
        setCurrentAnchor("center-center");
        break;
      case "center-right":
        setAnchor({ x: 1, y: 0.5 });
        setCurrentAnchor("center-right");
        break;
      case "bottom-left":
        setAnchor({ x: 0, y: 1 });
        setCurrentAnchor("bottom-left");
        break;
      case "bottom-center":
        setAnchor({ x: 0.5, y: 1 });
        setCurrentAnchor("bottom-center");
        break;
      case "bottom-right":
        setAnchor({ x: 1, y: 1 });
        setCurrentAnchor("bottom-right");
        break;
    }
  };
  return (
    <div className="w-full h-full  border-slate-300 bg-navbarBackground dark:bg-navbarBackground flex flex-col justify-center items-center">
      <div className="grid grid-cols-3 gap-1 w-20 h-20">
        {anchors.map((anchor) => (
          <div
            tabIndex={0}
            role="button"
            key={anchor.value}
            aria-pressed={currentAnchor === anchor.value}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleAnchorSelection(anchor.value);
              }
            }}
            className={`flex flex-row justify-center items-center cursor-pointer hover:scale-110   ${
              currentAnchor === anchor.value
                ? "bg-slate-300 dark:bg-slate-700"
                : "bg-slate-200 dark:bg-slate-800"
            }`}
            onClick={() => {
              handleAnchorSelection(anchor.value);
            }}
          >
            {anchor.icon}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs mt-2">
        (x: {anchor.x}, y: {anchor.y})
      </p>
    </div>
  );
};
