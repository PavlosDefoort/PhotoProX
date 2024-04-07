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
import { useProjectContext } from "@/pages/editor";
import { clamp } from "@/utils/calcUtils";
import { ImageLayer } from "@/utils/editorInterfaces";
import { EyeClosedIcon, EyeOpenIcon, OpacityIcon } from "@radix-ui/react-icons";
import { useState } from "react";

interface ImageLayerBarItemProps {
  layer: ImageLayer;
}

export const ImageLayerBarItem: React.FC<ImageLayerBarItemProps> = ({
  layer,
}) => {
  const { project, setProject, trigger, setTrigger } = useProjectContext();
  const [stringOpacity, setStringOpacity] = useState("100%");

  return (
    <div className="flex flex-row items-center justify-between space-x-4">
      <div className="flex flex-row justify-center items-center eye-icon">
        {layer.visible ? (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"ghost"}
                    className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
                    onClick={() => {
                      setProject((draft) => {
                        const foundLayer = draft.layerManager.findLayer(
                          layer.id
                        );
                        if (foundLayer) {
                          draft.layerManager.layers =
                            draft.layerManager.layers.map((l) => {
                              if (l.id === foundLayer.id) {
                                // Create a new object with the updated 'visible' property
                                return {
                                  ...l,
                                  visible: false,
                                };
                              }
                              return l;
                            });
                        }
                      });
                      setTrigger(!trigger);
                    }}
                  >
                    <EyeOpenIcon className="cursor-pointer w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="text-xs"
                  side="bottom"
                  sideOffset={10}
                >
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
                      setProject((draft) => {
                        const foundLayer = draft.layerManager.findLayer(
                          layer.id
                        );
                        if (foundLayer) {
                          draft.layerManager.layers =
                            draft.layerManager.layers.map((l) => {
                              if (l.id === foundLayer.id) {
                                // Create a new object with the updated 'visible' property
                                return {
                                  ...l,
                                  visible: true,
                                };
                              }
                              return l;
                            });
                        }
                      });
                      setTrigger(!trigger);
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
        <Popover>
          <PopoverTrigger
            asChild
            onClick={() => {
              if (layer.type === "image") {
                const imageLayer = layer as ImageLayer;
                setStringOpacity((imageLayer.opacity * 100).toFixed(0) + "%");
              }
            }}
          >
            <Button
              variant="ghost"
              className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <OpacityIcon className="cursor-pointer w-5 h-5" />
                  </TooltipTrigger>
                  <TooltipContent
                    className="text-xs"
                    side="bottom"
                    sideOffset={10}
                  >
                    <p>Change opacity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Opacity</h4>
                <p className="text-sm text-muted-foreground">
                  Set the opacity of the layer
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="width">Opacity</Label>
                  <Input
                    id="opacity"
                    className="col-span-2 h-8"
                    value={stringOpacity}
                    onChange={(e) => {
                      // Check if the value is a number
                      if (
                        isNaN(Number(e.currentTarget.value)) &&
                        e.currentTarget.value !== "-"
                      ) {
                        return;
                      }
                      setStringOpacity(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.value;
                        // Remove the '%' sign
                        const opacity = e.currentTarget.value.replace("%", "");
                        const numberOpacity = clamp(
                          Number(opacity) / 100,
                          0,
                          1
                        );
                        setProject((draft) => {
                          const foundLayer = draft.layerManager.findLayer(
                            layer.id
                          );
                          if (foundLayer && foundLayer.type === "image") {
                            const imageLayer = foundLayer;
                            imageLayer.opacity = numberOpacity;
                          }
                        });
                        setTrigger(!trigger);
                        setStringOpacity(
                          (numberOpacity * 100).toFixed(0) + "%"
                        );
                      }
                    }}
                  />
                  <Slider
                    value={[layer.opacity]}
                    onValueChange={(e) => {
                      setStringOpacity((e[0] * 100).toFixed(0) + "%");
                      setProject((draft) => {
                        const foundLayer = draft.layerManager.findLayer(
                          layer.id
                        );
                        if (foundLayer) {
                          foundLayer.opacity = e[0];
                        }
                      });
                      setTrigger(!trigger);
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                  ></Slider>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div
        className="w-40 h-40 aspect-square relative"
        style={{
          background:
            "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px",
        }}
      >
        {layer.type === "image" && "imageData" in layer && (
          <img
            src={
              (layer as ImageLayer).sprite.texture.baseTexture.cacheId as string
            }
            alt="Image"
            className="object-contain w-full h-full"
          />
        )}
      </div>
      <span className="text-xs">Layer {layer.zIndex}</span>
    </div>
  );
};
export default ImageLayerBarItem;
