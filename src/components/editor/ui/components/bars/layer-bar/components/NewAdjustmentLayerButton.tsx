import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CaretDownIcon,
  ComponentBooleanIcon,
  ShadowIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { ArrowDropDown, ColorLens, FilterVintage } from "@mui/icons-material";
import Image from "next/image";
import { useProject } from "@/hooks/useProject";
import { addLayer } from "@/models/project/LayerManager";
import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { readAdjustmentEditState } from "@/models/editor/AdjustmentDocument";
import { getAdjustmentTargets } from "@/models/editor/AdjustmentTargets";
import { AdjustmentLayer, ImageLayer } from "@/models/project/Layers/Layers";

const NewAdjustmentLayerButton = () => {
  const {
    project,
    layerManager,
    setLayerManager,
    setEditDocument,
  } = useProject();
  const { darkMode } = useTheme();
  const [active, setActive] = useState(false);
  const handleClick = (value: boolean) => {
    setActive(value);
  };
  const registerDocumentState = (newLayer: AdjustmentLayer) => {
    const adjustmentState = readAdjustmentEditState(newLayer);
    if (!adjustmentState) return;
    const layers = [...layerManager.layers, newLayer];
    const targetIds = getAdjustmentTargets(newLayer, layers).map(
      (target) => target.id,
    );
    setEditDocument((draft) => {
      draft.adjustmentLayers[newLayer.id] = adjustmentState;
      for (const layer of layers) {
        if (!(layer instanceof ImageLayer)) continue;
        const existing = draft.imageLayers[layer.id];
        draft.imageLayers[layer.id] = {
          id: layer.id,
          type: "image",
          transform: existing?.transform ?? {
            rotationDegrees: layer.sprite.angle,
            width: layer.sprite.width,
            height: layer.sprite.height,
          },
          adjustmentLayerIds: targetIds.includes(layer.id)
            ? [...(existing?.adjustmentLayerIds ?? []), newLayer.id]
            : existing?.adjustmentLayerIds ?? [],
        };
      }
    });
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <DropdownMenu
          onOpenChange={(e) => {
            handleClick(e.valueOf());
          }}
        >
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <div>
                {darkMode && (
                  <button
                    className={`relative w-8 h-8 ${
                      active ? "bg-white" : "dark:hover:bg-hover"
                    } rounded-md flex items-center justify-center transition-colors duration-300`}
                  >
                    <ComponentBooleanIcon
                      className={`w-6 h-6 cursor-pointer ${
                        active ? "text-black" : "text-white"
                      }`}
                    />
                    <CaretDownIcon
                      className={`absolute bottom-0 right-0 w-3 h-3 ${
                        active ? "text-black" : "text-white"
                      }`}
                    />
                  </button>
                )}
                {!darkMode && (
                  <button
                    className={`relative w-8 h-8 ${
                      active ? "bg-black" : "dark:hover:bg-hover"
                    } rounded-md flex items-center justify-center transition-colors duration-300`}
                  >
                    <ComponentBooleanIcon
                      className={`w-6 h-6 cursor-pointer ${
                        active ? "text-white" : "text-black"
                      }`}
                    />
                    <CaretDownIcon
                      className={`absolute bottom-0 right-0 w-3 h-3 ${
                        active ? "text-white" : "text-black"
                      }`}
                    />
                  </button>
                )}
              </div>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <DropdownMenuContent>
            <DropdownMenuLabel>Adjustment Layer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const newLayer = layerManager.createAdjustmentLayer(
                  false,
                  "Brightness",
                  project.settings.canvasSettings.width,
                  project.settings.canvasSettings.height
                );
                setLayerManager((draft) => {
                  draft.layers = addLayer(draft.layers, newLayer);
                  draft.target = newLayer.id;
                });
                registerDocumentState(newLayer);
              }}
            >
              <SunIcon className="w-5 h-5 mr-2 " />
              Brightness/Contrast
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                const newLayer = layerManager.createAdjustmentLayer(
                  false,
                  "Saturation",
                  project.settings.canvasSettings.width,
                  project.settings.canvasSettings.height
                );
                setLayerManager((draft) => {
                  draft.layers = addLayer(draft.layers, newLayer);
                  draft.target = newLayer.id;
                });
                registerDocumentState(newLayer);
              }}
            >
              <ColorLens className="w-5 h-5 mr-2" />
              Hue/Saturation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const newLayer = layerManager.createAdjustmentLayer(
                  false,
                  "Bloom",
                  project.settings.canvasSettings.width,
                  project.settings.canvasSettings.height
                );
                setLayerManager((draft) => {
                  draft.layers = addLayer(draft.layers, newLayer);
                  draft.target = newLayer.id;
                });
              }}
            >
              <FilterVintage className="w-5 h-5 mr-2" />
              Bloom
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const newLayer = layerManager.createAdjustmentLayer(
                  false,
                  "Shadow",
                  project.settings.canvasSettings.width,
                  project.settings.canvasSettings.height
                );
                setLayerManager((draft) => {
                  draft.layers = addLayer(draft.layers, newLayer);
                  draft.target = newLayer.id;
                });
              }}
            >
              <ShadowIcon className="w-5 h-5 mr-2" />
              Shadow
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => {}}>Waves</DropdownMenuItem>

            <DropdownMenuItem onClick={() => {}}>
              <Image
                src="/svgs/functions.svg"
                className="w-5 h-5 mr-2"
                alt="Function Latex Icon"
                width={20}
                height={20}
              ></Image>
              Functions
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent className="text-xs" side="bottom">
          <p>Adjustment Layer</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NewAdjustmentLayerButton;
