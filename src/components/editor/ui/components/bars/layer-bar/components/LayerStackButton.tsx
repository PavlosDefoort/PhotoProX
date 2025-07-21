import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
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
import { findLayer } from "@/models/project/LayerManager";
import {
  handleMoveLayerBackward,
  handleMoveLayerForward,
  handleMoveLayerToBack,
  handleMoveLayerToFront,
} from "@/utils/LayerUtils";
import { ArrowDropDown, FlipToBack, FlipToFront } from "@mui/icons-material";
import { CaretDownIcon, StackIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

const LayerStackButton: React.FC = () => {
  const { layerManager, setLayerManager } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);
  const { darkMode } = useTheme();
  const [active, setActive] = useState(false);

  // Listen for the following inputs:
  // Ctrl + ]
  // Ctrl + [
  // Alt + Ctrl + ]
  // Alt + Ctrl + [

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "]") {
        e.preventDefault();
        if (target) handleMoveLayerForward(target, setLayerManager);
      }
      if (e.ctrlKey && e.key === "[") {
        e.preventDefault();
        if (target) handleMoveLayerBackward(target, setLayerManager);
      }
      if (e.altKey && e.ctrlKey && e.key === "]") {
        e.preventDefault();
        if (target) handleMoveLayerToFront(target, setLayerManager);
      }
      if (e.altKey && e.ctrlKey && e.key === "[") {
        e.preventDefault();
        if (target) handleMoveLayerToBack(target, setLayerManager);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [target, setLayerManager]);

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu
          onOpenChange={(e) => {
            setActive(e.valueOf());
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
                    <StackIcon
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
                    <StackIcon
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
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Modify Layer Stack</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className=""
              disabled={target?.zIndex === layerManager.layers.length - 1}
              onClick={() => {
                if (target) handleMoveLayerToFront(target, setLayerManager);
              }}
            >
              <div className="flex flex-row space-x-2">
                <FlipToFront className="w-6 h-6" />
                <p>Bring to front</p>
              </div>
              <DropdownMenuShortcut>Alt + Ctrl + ]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={target?.zIndex === layerManager.layers.length - 1}
              onClick={() => {
                if (target) handleMoveLayerForward(target, setLayerManager);
              }}
            >
              <div className="flex flex-row space-x-2">
                <FlipToFront className="w-6 h-6" />
                <p>Move forward</p>
              </div>
              <DropdownMenuShortcut>Ctrl + ]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={target?.zIndex === 0}
              onClick={() => {
                if (target) handleMoveLayerBackward(target, setLayerManager);
              }}
            >
              <div className="flex flex-row space-x-2">
                <FlipToFront className="w-6 h-6" />
                <p>Send backward</p>
              </div>
              <DropdownMenuShortcut>Ctrl + [</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={target?.zIndex === 0}
              onClick={() => {
                if (target) handleMoveLayerToBack(target, setLayerManager);
              }}
            >
              <div className="flex flex-row space-x-2">
                <FlipToBack className="w-6 h-6" />
                <p>Send to back</p>
              </div>
              <DropdownMenuShortcut>Alt + Ctrl + [</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipContent className="text-xs" side="bottom">
          <p>Modify Layer Stack</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LayerStackButton;
