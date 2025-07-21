import { SaturationAdjustmentLayerInterface } from "@/interfaces/project/LayerInterfaces";
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
import { ColorLens } from "@mui/icons-material";
import { useState } from "react";
import { useProject } from "@/hooks/useProject";
import { ColorMatrixFilter, Filter } from "pixi.js";
import { AdjustmentFilter } from "pixi-filters";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { clamp } from "lodash";
interface SaturationAdjustmentLayerPopoverProps {
  layer: SaturationAdjustmentLayerInterface;
}
const SaturationAdjustmentLayerPopover: React.FC<
  SaturationAdjustmentLayerPopoverProps
> = ({ layer }) => {
  const [saturation, setSaturation] = useState(layer.saturation);
  const [hue, setHue] = useState(layer.hue);
  const { setLayerManager } = useProject();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="w-40 h-40 aspect-square relative bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover  border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black">
          <ColorLens className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
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
            <h4 className="font-medium leading-none">Saturation/Hue</h4>
            <p className="text-sm text-muted-foreground">
              Set the saturation and hue of the layer
            </p>
            <SelectSeparator />
          </div>

          <div>
            <Label>Saturation</Label>
            <div className="flex flex-row space-x-2">
              <Slider
                className="w-9/12"
                max={3}
                min={0}
                step={0.01}
                value={[saturation]}
                onValueCommit={(value) => {
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as SaturationAdjustmentLayerInterface).saturation =
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

                  matrix.saturation = value[0];
                  setSaturation(value[0]);
                }}
              />
              <Input
                className="w-3/12"
                id="saturation"
                type="number"
                step={0.01}
                min={0}
                max={3}
                value={saturation}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    const roundedValue = roundToDecimalPlaces(
                      clamp(value, 0, 3),
                      2
                    );
                    setSaturation(roundedValue);
                  }
                }}
                onBlur={() => {
                  (
                    (layer.container.filters as Filter[])[0] as AdjustmentFilter
                  ).saturation = saturation;
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as SaturationAdjustmentLayerInterface).saturation =
                          saturation;
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
                    ).saturation = saturation;
                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          (l as SaturationAdjustmentLayerInterface).saturation =
                            saturation;
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
            <Label>Hue Angle</Label>
            <div className="flex flex-row space-x-2">
              <Slider
                className="w-9/12"
                max={180}
                min={-180}
                step={1}
                value={[hue]}
                onValueCommit={(value) => {
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as SaturationAdjustmentLayerInterface).hue =
                          value[0];
                      }
                      return l;
                    });
                  });
                }}
                onValueChange={(value) => {
                  const matrix = (
                    layer.container.filters as Filter[]
                  )[1] as ColorMatrixFilter;

                  matrix.hue(value[0], false);
                  setHue(value[0]);
                }}
              />
              <Input
                className="w-3/12"
                id="hue"
                type="number"
                step={1}
                min={-180}
                max={180}
                value={hue}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    const roundedValue = roundToDecimalPlaces(
                      clamp(value, -180, 180),
                      0
                    );
                    setHue(roundedValue);
                  }
                }}
                onBlur={() => {
                  (
                    (
                      layer.container.filters as Filter[]
                    )[1] as ColorMatrixFilter
                  ).hue(hue, false);
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        (l as SaturationAdjustmentLayerInterface).hue = hue;
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
                      )[1] as ColorMatrixFilter
                    ).hue(hue, false);
                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          (l as SaturationAdjustmentLayerInterface).hue = hue;
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

export default SaturationAdjustmentLayerPopover;
