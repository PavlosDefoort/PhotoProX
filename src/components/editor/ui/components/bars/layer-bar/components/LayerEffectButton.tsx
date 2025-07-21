import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { StrokeEffect } from "@/models/project/LayerEffect";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { Approval, ArrowDropDown, BorderColor } from "@mui/icons-material";
import { ShadowIcon, StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { EmbossFilter, GlowFilter } from "pixi-filters";
import { useState } from "react";

const LayerEffectButton: React.FC = () => {
  const { layerManager, setLayerManager } = useProject();
  const [active, setActive] = useState(false);
  const { darkMode } = useTheme();
  const target = findLayer(layerManager.layers, layerManager.target);
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
                    <svg
                      version="1.1"
                      id="Layer_1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                      x="0px"
                      y="0px"
                      className={`"w-6 h-6 cursor-pointer ${
                        active ? "text-black" : "text-white"
                      }`}
                      viewBox="0 0 121.83 122.88"
                      xmlSpace="preserve"
                    >
                      <g>
                        <path
                          fill="currentColor"
                          d="M27.61,34.37l-4.07,4.6l0.4,1.74h10.48c-2.14,12.38-3.74,23.54-6.81,40.74c-3.67,21.94-5.78,27.33-7.03,29.3 c-1.1,1.95-2.68,2.96-4.82,2.96c-2.35,0-6.6-1.86-8.88-3.97c-0.82-0.56-1.79-0.42-2.82,0.26C2,111.74,0,114.42,0,116.82 c-0.12,3.24,4.21,6.06,8.34,6.06c3.64,0,9-2.28,14.64-7.64c7.71-7.31,13.48-17.34,18.3-39.02c3.1-13.84,4.56-22.84,6.74-35.5 l13.02-1.18l2.82-5.17H49.2C52.99,10.53,55.95,7,59.59,7c2.42,0,5.24,1.86,8.48,5.52c0.96,1.32,2.4,1.18,3.5,0.28 c1.85-1.1,4.13-3.92,4.28-6.48C75.96,3.5,72.6,0,66.82,0C61.58,0,53.55,3.5,46.8,10.38c-5.92,6.27-9.02,14.1-11.16,23.99H27.61 L27.61,34.37z M69.27,50.33c4.04-5.38,6.46-7.17,7.71-7.17c1.29,0,2.32,1.27,4.53,8.41l3.78,12.19 c-7.31,11.18-12.66,17.41-15.91,17.41c-1.08,0-2.17-0.34-2.94-1.1c-0.76-0.76-1.6-1.39-2.42-1.39c-2.68,0-6,3.25-6.06,7.28 c-0.06,4.11,2.82,7.05,6.6,7.05c6.49,0,11.98-6.37,22.58-23.26l3.1,10.45c2.66,8.98,5.78,12.81,9.68,12.81 c4.82,0,11.3-4.11,18.37-15.22l-2.96-3.38c-4.25,5.12-7.07,7.52-8.74,7.52c-1.86,0-3.49-2.84-5.64-9.82l-4.53-14.73 c2.68-3.95,5.32-7.27,7.64-9.92c2.76-3.15,4.89-4.49,6.34-4.49c1.22,0,2.28,0.52,2.94,1.25c0.87,0.96,1.39,1.41,2.42,1.41 c2.33,0,5.93-2.96,6.06-6.88c0.12-3.64-2.14-6.74-6.06-6.74c-5.92,0-11.14,5.1-21.19,20.04l-2.07-6.41 c-2.9-9-4.82-13.63-8.86-13.63c-4.7,0-11.16,5.78-17.48,14.94L69.27,50.33L69.27,50.33z"
                        />
                      </g>
                    </svg>
                    <ArrowDropDown
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
                    <svg
                      version="1.1"
                      id="Layer_1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                      x="0px"
                      y="0px"
                      className={`"w-6 h-6 cursor-pointer ${
                        active ? "text-white" : "text-black"
                      }`}
                      viewBox="0 0 121.83 122.88"
                      xmlSpace="preserve"
                    >
                      <g>
                        <path
                          fill="currentColor"
                          d="M27.61,34.37l-4.07,4.6l0.4,1.74h10.48c-2.14,12.38-3.74,23.54-6.81,40.74c-3.67,21.94-5.78,27.33-7.03,29.3 c-1.1,1.95-2.68,2.96-4.82,2.96c-2.35,0-6.6-1.86-8.88-3.97c-0.82-0.56-1.79-0.42-2.82,0.26C2,111.74,0,114.42,0,116.82 c-0.12,3.24,4.21,6.06,8.34,6.06c3.64,0,9-2.28,14.64-7.64c7.71-7.31,13.48-17.34,18.3-39.02c3.1-13.84,4.56-22.84,6.74-35.5 l13.02-1.18l2.82-5.17H49.2C52.99,10.53,55.95,7,59.59,7c2.42,0,5.24,1.86,8.48,5.52c0.96,1.32,2.4,1.18,3.5,0.28 c1.85-1.1,4.13-3.92,4.28-6.48C75.96,3.5,72.6,0,66.82,0C61.58,0,53.55,3.5,46.8,10.38c-5.92,6.27-9.02,14.1-11.16,23.99H27.61 L27.61,34.37z M69.27,50.33c4.04-5.38,6.46-7.17,7.71-7.17c1.29,0,2.32,1.27,4.53,8.41l3.78,12.19 c-7.31,11.18-12.66,17.41-15.91,17.41c-1.08,0-2.17-0.34-2.94-1.1c-0.76-0.76-1.6-1.39-2.42-1.39c-2.68,0-6,3.25-6.06,7.28 c-0.06,4.11,2.82,7.05,6.6,7.05c6.49,0,11.98-6.37,22.58-23.26l3.1,10.45c2.66,8.98,5.78,12.81,9.68,12.81 c4.82,0,11.3-4.11,18.37-15.22l-2.96-3.38c-4.25,5.12-7.07,7.52-8.74,7.52c-1.86,0-3.49-2.84-5.64-9.82l-4.53-14.73 c2.68-3.95,5.32-7.27,7.64-9.92c2.76-3.15,4.89-4.49,6.34-4.49c1.22,0,2.28,0.52,2.94,1.25c0.87,0.96,1.39,1.41,2.42,1.41 c2.33,0,5.93-2.96,6.06-6.88c0.12-3.64-2.14-6.74-6.06-6.74c-5.92,0-11.14,5.1-21.19,20.04l-2.07-6.41 c-2.9-9-4.82-13.63-8.86-13.63c-4.7,0-11.16,5.78-17.48,14.94L69.27,50.33L69.27,50.33z"
                        />
                      </g>
                    </svg>
                    <ArrowDropDown
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
            <DropdownMenuLabel>Layer Effect</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (target instanceof ImageLayer) {
                  const newEffect = new StrokeEffect();
                  const matrix = newEffect.filter;
                  matrix.thickness = 10;
                  matrix.color = 0x000000;
                  target.sprite.filters = [matrix];
                  setLayerManager((draft) => {
                    draft.layers = draft.layers.map((l) => {
                      if (l.id === target.id) {
                        (l as ImageLayer).effects.push(newEffect);
                      }
                      return l;
                    });
                  });
                }
              }}
            >
              <BorderColor className="w-5 h-5 mr-2" />
              Stroke
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (target instanceof ImageLayer) {
                  const matrix = new EmbossFilter();
                  matrix.strength = 5;
                  target.sprite.filters = [matrix];
                }
              }}
            >
              <Approval className="w-5 h-5 mr-2" />
              Emboss
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (target instanceof ImageLayer) {
                  const matrix = new EmbossFilter();
                  matrix.strength = 5;
                  target.sprite.filters = [matrix];
                }
              }}
            >
              <ShadowIcon className="w-5 h-5 mr-2" />
              Drop Shadow
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                if (target instanceof ImageLayer) {
                  const matrix = new GlowFilter();
                  matrix.outerStrength = 0;
                  matrix.innerStrength = 39;
                  target.sprite.filters = [matrix];
                }
              }}
            >
              <StarFilledIcon className="w-5 h-5 mr-2" />
              Inner Glow
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (target instanceof ImageLayer) {
                  const matrix = new GlowFilter();
                  matrix.outerStrength = 39;
                  matrix.innerStrength = 0;
                  target.sprite.filters = [matrix];
                }
              }}
            >
              <StarIcon className="w-5 h-5 mr-2" />
              Outer Glow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipContent className="text-xs" side="bottom">
          <p>Add Layer Effect</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
export default LayerEffectButton;
