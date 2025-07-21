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

const NewAdjustmentLayerButton = () => {
  const { project, layerManager, setLayerManager } = useProject();
  const { darkMode } = useTheme();
  const [active, setActive] = useState(false);
  const handleClick = (value: boolean) => {
    setActive(value);
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
