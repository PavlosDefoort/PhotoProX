import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectSeparator } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/hooks/useProject";
import { BrightnessAdjustmentLayerInterface } from "@/interfaces/project/LayerInterfaces";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { SunIcon } from "@radix-ui/react-icons";
import { clamp } from "lodash";
import { AdjustmentFilter } from "pixi-filters";
import { Filter } from "pixi.js";
import { useState } from "react";

interface BrightnessAdjustmentLayerItemProps {
  layer: BrightnessAdjustmentLayerInterface;
}

const BrightnessAdjustmentLayerPopover: React.FC<
  BrightnessAdjustmentLayerItemProps
> = ({ layer }) => {
  const [brightness, setBrightness] = useState(layer.brightness);
  const [contrast, setContrast] = useState(layer.contrast);
  const { setLayerManager } = useProject();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="w-40 h-40 aspect-square relative bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover  border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black">
          <SunIcon className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 select-none"
        side="left"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Brightness/Contrast</h4>
            <p className="text-sm text-muted-foreground">
              Set the brightness and contrast of the layer
            </p>
            <SelectSeparator />
          </div>

          <div>
            <Label className="">Brightness</Label>
            <p className="text-xs text-muted-foreground">
              Brightness is the relative lightness or darkness of an image
            </p>
            <div className="flex flex-row space-x-2">
              <Slider
                className="w-9/12"
                max={3}
                min={0}
                step={0.01}
                value={[brightness]}
                onValueCommit={(value) => {
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as BrightnessAdjustmentLayerInterface).brightness =
                          value[0];
                      }
                      return l;
                    });
                  });
                }}
                onValueChange={(value) => {
                  const matrix = (
                    layer.container.filters as Filter[]
                  )[0] as AdjustmentFilter;

                  matrix.brightness = value[0];
                  setBrightness(value[0]);
                }}
              />
              <Input
                className="w-3/12"
                id="brightness"
                type="number"
                step={0.01}
                min={0}
                max={3}
                value={brightness}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    const roundedValue = roundToDecimalPlaces(
                      clamp(value, 0, 3),
                      2
                    );
                    setBrightness(roundedValue);
                  }
                }}
                onBlur={() => {
                  (
                    (layer.container.filters as Filter[])[0] as AdjustmentFilter
                  ).brightness = brightness;
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as BrightnessAdjustmentLayerInterface).brightness =
                          brightness;
                      }
                      return l;
                    });
                  });
                }}
                onKeyDown={(e) => {
                  // On enter
                  if (e.key === "Enter") {
                    (
                      (
                        layer.container.filters as Filter[]
                      )[0] as AdjustmentFilter
                    ).brightness = brightness;
                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          (l as BrightnessAdjustmentLayerInterface).brightness =
                            brightness;
                        }
                        return l;
                      });
                    });
                  }
                }}
              />
            </div>
          </div>
          <div>
            <Label>Contrast</Label>
            <div className="flex flex-row space-x-2">
              <Slider
                className="w-9/12"
                max={3}
                min={0}
                step={0.01}
                value={[contrast]}
                onValueCommit={(value) => {
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as BrightnessAdjustmentLayerInterface).contrast =
                          value[0];
                      }
                      return l;
                    });
                  });
                }}
                onValueChange={(value) => {
                  const matrix = (
                    layer.container.filters as Filter[]
                  )[0] as AdjustmentFilter;

                  matrix.contrast = value[0];
                  setContrast(value[0]);
                }}
              />
              <Input
                className="w-3/12"
                id="contrast"
                type="number"
                step={0.01}
                min={0}
                max={3}
                value={contrast}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    const roundedValue = roundToDecimalPlaces(
                      clamp(value, 0, 3),
                      2
                    );
                    setContrast(roundedValue);
                  }
                }}
                onBlur={() => {
                  (
                    (layer.container.filters as Filter[])[0] as AdjustmentFilter
                  ).contrast = contrast;
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as BrightnessAdjustmentLayerInterface).contrast =
                          contrast;
                      }
                      return l;
                    });
                  });
                }}
                onKeyDown={(e) => {
                  // On enter
                  if (e.key === "Enter") {
                    (
                      (
                        layer.container.filters as Filter[]
                      )[0] as AdjustmentFilter
                    ).contrast = contrast;
                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          (l as BrightnessAdjustmentLayerInterface).contrast =
                            contrast;
                        }
                        return l;
                      });
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BrightnessAdjustmentLayerPopover;
