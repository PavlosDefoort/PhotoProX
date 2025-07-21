import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectSeparator } from "@/components/ui/select";
import { AdjustmentLayerInterface } from "@/interfaces/project/LayerInterfaces";
import { SunIcon } from "lucide-react";
import { ColorMatrixFilter, Filter } from "pixi.js";
import AdjustmentAdjuster from "./AdjustmentAdjuster";
import {
  BloomAdjustmentLayer,
  BrightnessAdjustmentLayer,
  DropShadowAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "@/models/project/Layers/AdjustmentLayer";
import { Button } from "@/components/ui/button";
import { capitalizeFirstLetter } from "@/utils/StringUtils";
import { useEffect, useRef, useState } from "react";
import { ColorLens, FilterVintage } from "@mui/icons-material";
import { ShadowIcon, ThickArrowDownIcon } from "@radix-ui/react-icons";
import AdjustmentCheckBox from "./AdjustmentCheckbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useProject } from "@/hooks/useProject";
import { sortLayers } from "@/models/project/LayerManager";

interface AdjustmentPopoverProps {
  layer: AdjustmentLayerInterface;
}

interface AdjustmentMapValue {
  min: number;
  max: number;
  step: number;
  numDecimals: number;
  filterIndex: number;
  description: string;
  setValue?: (...props: any[]) => void;
  isBoolean?: boolean;
}

interface AdjustmentMap {
  [key: string]: AdjustmentMapValue;
}

const setHue = (value: number, matrix: ColorMatrixFilter) => {
  matrix.hue(value, false);
};

// Mapping the key names to certain properties for a dynamic adjustment popover
const AdjustmentMapping: AdjustmentMap = {
  brightness: {
    max: 2,
    min: 0,
    step: 0.01,
    filterIndex: 0,
    numDecimals: 2,
    description: "Brightness is the relative lightness or darkness of an image",
  },
  contrast: {
    max: 2,
    min: 0,
    step: 0.01,
    numDecimals: 2,
    filterIndex: 0,
    description:
      "Contrast is the difference in luminance or color that makes an object distinguishable",
  },
  saturation: {
    max: 2,
    min: 0,
    step: 0.01,
    numDecimals: 2,
    filterIndex: 0,
    description:
      "Saturation is the intensity of a color, expressed as the amount of gray mixed with the color",
  },
  hue: {
    max: 360,
    min: 0,
    step: 1,
    numDecimals: 0,
    filterIndex: 1,
    setValue: setHue,
    description:
      "Hue Angle is the degree on the color wheel from 0 to 360, representing the colors of the rainbow",
  },
  blur: {
    max: 20,
    min: 0,
    step: 0.1,
    numDecimals: 1,
    filterIndex: 0,
    description: "Blur is the amount of blurriness in the image",
  },
  threshold: {
    max: 1,
    min: 0,
    step: 0.01,
    numDecimals: 2,
    filterIndex: 0,
    description:
      "Threshold is the level of brightness that determines what is considered a light pixel",
  },
  bloomScale: {
    max: 10,
    min: 0,
    step: 0.1,
    numDecimals: 1,
    filterIndex: 0,
    description: "Scale is the size of the bloom effect",
  },
  quality: {
    max: 10,
    min: 0,
    step: 1,
    numDecimals: 0,
    filterIndex: 0,
    description: "Quality is the level of detail in the bloom effect",
  },
  offsetX: {
    max: 100,
    min: -100,
    step: 1,
    numDecimals: 0,
    filterIndex: 0,
    description: "Offset X is the horizontal distance of the shadow",
  },
  offsetY: {
    max: 100,
    min: -100,
    step: 1,
    numDecimals: 0,
    filterIndex: 0,
    description: "Offset Y is the vertical distance of the shadow",
  },
  alpha: {
    max: 1,
    min: 0,
    step: 0.01,
    numDecimals: 2,
    filterIndex: 0,
    description: "Alpha is the opacity of the shadow",
  },
  shadowOnly: {
    isBoolean: true,
    max: 1,
    min: 0,
    step: 1,
    numDecimals: 0,
    filterIndex: 0,
    description:
      "Shadow Only is a boolean that determines if the shadow is visible",
  },
};

const AdjustmentPopover: React.FC<AdjustmentPopoverProps> = ({ layer }) => {
  const { setLayerManager, layerManager } = useProject();
  const open = useRef(false);

  return (
    <Popover
      defaultOpen={layer.open}
      onOpenChange={(e) => {
        if (!e && layer.open) {
          setLayerManager((draft) => {
            const index = draft.layers.findIndex((l) => l.id === layer.id);
            (draft.layers[index] as AdjustmentLayerInterface).open = e;
          });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button className="w-40 h-40 aspect-square relative bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover  border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black">
          {layer instanceof BrightnessAdjustmentLayer && (
            <SunIcon className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
          {layer instanceof SaturationAdjustmentLayer && (
            <ColorLens className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
          {layer instanceof BloomAdjustmentLayer && (
            <FilterVintage className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
          {layer instanceof DropShadowAdjustmentLayer && (
            <ShadowIcon className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
          {layer.clipToBelow && (
            <ThickArrowDownIcon className="w-4 h-4 absolute left-1/2 top-2/3 transform -translate-x-1/2" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 select-none"
        side="left"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (layer.open && !open.current) {
            open.current = true;
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{layer.title}</h4>
            <p className="text-sm text-muted-foreground">{layer.description}</p>
            <SelectSeparator />
          </div>

          {Object.keys(layer)
            .filter((key) => AdjustmentMapping.hasOwnProperty(key)) // Step 2: Filter keys
            .map((key, index) => {
              // Step 3: Map over filtered keys
              if (AdjustmentMapping[key].isBoolean) {
                return (
                  <AdjustmentCheckBox
                    key={index}
                    initialValue={(layer as any)[key]}
                    title={capitalizeFirstLetter(key)}
                    description={AdjustmentMapping[key].description}
                    keyToAdjust={key}
                    matrix={
                      (layer.container.filters as Filter[])[
                        AdjustmentMapping[key].filterIndex
                      ]
                    }
                  />
                );
              } else {
                return (
                  <AdjustmentAdjuster
                    key={index}
                    initialValue={(layer as any)[key]}
                    min={AdjustmentMapping[key].min}
                    max={AdjustmentMapping[key].max}
                    step={AdjustmentMapping[key].step}
                    title={capitalizeFirstLetter(key)}
                    description={AdjustmentMapping[key].description}
                    keyToAdjust={key}
                    setMatrix={AdjustmentMapping[key].setValue}
                    layer={layer}
                    matrix={
                      (layer.container.filters as Filter[])[
                        AdjustmentMapping[key].filterIndex
                      ]
                    }
                    numDecimals={AdjustmentMapping[key].numDecimals}
                  />
                );
              }
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdjustmentPopover;
