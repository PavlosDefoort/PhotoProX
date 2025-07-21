import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { LayerXInterface } from "@/interfaces/project/LayerInterfaces";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { clamp, roundToDecimalPlaces } from "@/utils/CalcUtils";
import { OpacityIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import NumberInput from "../../../../input/NumberInput";
import { SelectSeparator } from "@/components/ui/select";

interface OpacityPopoverProps {
  layer: LayerXInterface;
}

const OpacityPopover: React.FC<OpacityPopoverProps> = ({ layer }) => {
  const [opacity, setOpacity] = useState(1);
  const { setLayerManager } = useProject();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <OpacityIcon className="cursor-pointer w-5 h-5" />
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="bottom" sideOffset={10}>
                <p>Change opacity</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <div className="flex flex-col space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Opacity</h4>
            <p className="text-sm text-muted-foreground">
              Set the opacity of the layer
            </p>
            <SelectSeparator />
          </div>

          <div className="w-full">
            <Label htmlFor="opacity">Opacity</Label>
            <div className="flex flex-row space-x-2 w-full">
              <Slider
                className="w-8/12"
                onValueCommit={() => {
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        l.opacity = opacity;
                      }
                      return l;
                    });
                  });
                }}
                value={[opacity]}
                onValueChange={(e) => {
                  if (layer instanceof ImageLayer) {
                    layer.sprite.alpha = e[0];
                  }

                  setOpacity(e[0]);
                }}
                min={0}
                max={1}
                step={0.01}
              />
              <Input
                className="w-4/12"
                id="opacity"
                type="number"
                step={0.01}
                min={0}
                max={1}
                value={opacity}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    const roundedValue = roundToDecimalPlaces(
                      clamp(value, 0, 1),
                      2
                    );
                    setOpacity(roundedValue);
                  }
                }}
                onBlur={() => {
                  if (layer instanceof ImageLayer) {
                    layer.sprite.alpha = opacity;
                  }
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === layer.id) {
                        l.opacity = opacity;
                      }
                      return l;
                    });
                  });
                }}
                onKeyDown={(e) => {
                  // On enter
                  if (e.key === "Enter") {
                    if (layer instanceof ImageLayer) {
                      layer.sprite.alpha = opacity;
                    }

                    setLayerManager((draft) => {
                      draft.layers = draft.layers.map((l) => {
                        if (l.id === layer.id) {
                          l.opacity = opacity;
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

export default OpacityPopover;
