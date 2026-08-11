import { Button } from "@/components/ui/button";
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckIcon, MagicWandIcon, MoveIcon } from "@radix-ui/react-icons";
import React, { useEffect } from "react";

import { useProject } from "@/hooks/useProject";
import { Crop, Psychology, Gesture } from "@mui/icons-material";
import { TransformIcon } from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { toast } from "sonner";
import BackgroundRemover from "./tools/artificial-intelligence/BackgroundRemover";
import Inpaint from "./tools/artificial-intelligence/Inpaint";
import Generate from "./tools/artificial-intelligence/Generate";
import { Brush, AutoAwesome } from "@mui/icons-material";

const ToolBar: React.FC = () => {
  const [openGenerate, setOpenGenerate] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [openAI, setOpenAI] = React.useState(false);
  const { editMode, setEditMode } = useProject();
  const { layerManager } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);

  let timer: any;
  let aiTimer: any;

  const handleMouseEnter = () => {
    clearTimeout(timer); // Clear any existing timeout
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Set a timeout to close the popover after a delay
    timer = setTimeout(() => {
      setOpen(false);
    }, 200); // Adjust the delay time as needed
  };

  const handleMouseEnterAI = () => {
    clearTimeout(aiTimer); // Clear any existing timeout
    setOpenAI(true);
  };

  const handleMouseLeaveAI = () => {
    // Set a timeout to close the popover after a delay
    aiTimer = setTimeout(() => {
      setOpenAI(false);
    }, 200); // Adjust the delay time as needed
  };

  useEffect(() => {
    if (editMode === "rembg" || editMode === "inpaint") {
      handleMouseLeaveAI();
    }
  }, [editMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingElement =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.isContentEditable;

      if (isTypingElement) {
        return;
      }

      if (event.key.toLowerCase() === "v") {
        event.preventDefault();
        setEditMode("move");
      }
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (!(target instanceof ImageLayer)) {
          toast.warning("Please select an image layer to crop");
        } else {
          setEditMode("crop");
        }
      }
      if (event.key.toLowerCase() === "l" && target instanceof ImageLayer) {
        event.preventDefault();
        setEditMode("lasso");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setEditMode, target]);

  return (
    <div>
      <aside
        id="logo-sidebar"
        className={`animate-fade select-none animate-once animate-ease-out w-10 h-full border-r-2 border-[#cdcdcd] dark:border-[#252525] bg-navbarBackground dark:bg-navbarBackground relative`}
        aria-label="Sidebar"
      >
        <div className="py-6 overflow-y-auto animate-fade animate-once animate-ease-linear mt-1 right-[3px] absolute">
          <ul className="space-y-6 font-medium">
            <li className="">
              <Popover open={open}>
                <PopoverTrigger
                  asChild
                  className="focus-visible:ring-offset-0 focus-visible:ring-0"
                >
                  <Button
                    className={`w-6 flex flex-row items-center justify-center  hover:bg-buttonHover dark:hover:bg-buttonHover
                      ${
                        editMode === "move" || editMode === "transform"
                          ? "bg-buttonHover dark:bg-[#3b3b3b]"
                          : "bg-navbarBackground dark:bg-navbarBackground"
                      }`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    variant={"outline"}
                  >
                    <span>
                      {editMode !== "transform" && (
                        <MoveIcon
                          aria-hidden="true"
                          className="w-6 h-6 text-gray-500 dark:text-gray-100"
                        ></MoveIcon>
                      )}
                      {editMode === "transform" && (
                        <TransformIcon
                          aria-hidden="true"
                          className="w-6 h-6 text-gray-500 dark:text-gray-100"
                        ></TransformIcon>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  className={`w-72 select-none`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">
                        Size & Position
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Perform various transformations
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover dark:hover:bg-buttonHover cursor-pointer"
                        onClick={() => {
                          setEditMode("move");
                        }}
                      >
                        <span className="flex flex-row items-center space-x-1 col-span-1">
                          {editMode === "move" && (
                            <CheckIcon className={`w-6 h-6 text-blue-600`} />
                          )}
                          <MoveIcon className="w-6 h-6" />
                          <Label htmlFor="width" className="cursor-pointer">
                            Move
                          </Label>
                        </span>

                        <DropdownMenuShortcut>V</DropdownMenuShortcut>
                      </div>
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover dark:hover:bg-buttonHover cursor-pointer"
                        id="transform"
                        onClick={() => {
                          if (!(target instanceof ImageLayer)) {
                            toast.warning(
                              "Please select an image layer to transform",
                            );
                          } else {
                            setEditMode("transform");
                          }
                        }}
                      >
                        <span className="flex flex-row items-center space-x-1 col-span-1">
                          {editMode === "transform" && (
                            <CheckIcon className={`w-6 h-6 text-blue-600`} />
                          )}

                          <TransformIcon className="w-6 h-6" />
                          <Label htmlFor="transform" className="cursor-pointer">
                            Transform
                          </Label>
                        </span>
                        <DropdownMenuShortcut>Ctrl+Alt+T</DropdownMenuShortcut>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </li>
            <li>
              <Button aria-label="Lasso Tool (L)" title="Lasso Tool (L)" className={`w-6 flex items-center justify-center hover:bg-buttonHover ${editMode === "lasso" ? "bg-buttonHover" : "bg-navbarBackground"}`} variant="outline" onClick={() => {
                if (!(target instanceof ImageLayer)) { toast.warning("Please select an image layer to make a selection"); return; }
                setEditMode("lasso");
              }}>
                <Gesture aria-hidden="true" className="w-6 h-6 text-gray-500 dark:text-gray-100" />
              </Button>
            </li>
            <li>
              <Button
                aria-label="Crop Tool (C)"
                className={`w-6 flex flex-row items-center justify-center hover:bg-buttonHover dark:hover:bg-buttonHover ${
                  editMode === "crop"
                    ? "bg-buttonHover dark:bg-[#3b3b3b]"
                    : "bg-navbarBackground dark:bg-navbarBackground"
                }`}
                title="Crop Tool (C)"
                variant="outline"
                onClick={() => {
                  if (!(target instanceof ImageLayer)) {
                    toast.warning("Please select an image layer to crop");
                    return;
                  }
                  setEditMode("crop");
                }}
              >
                <Crop
                  aria-hidden="true"
                  className="w-6 h-6 text-gray-500 dark:text-gray-100"
                />
              </Button>
            </li>

            <li>
              <Popover open={openAI}>
                <PopoverTrigger
                  asChild
                  className="focus-visible:ring-offset-0 focus-visible:ring-0"
                >
                  <Button
                    className={`w-6 flex flex-row items-center justify-center  hover:bg-buttonHover dark:hover:bg-buttonHover
                      ${
                        editMode === "rembg" || editMode === "inpaint"
                          ? "bg-buttonHover dark:bg-[#3b3b3b]"
                          : "bg-navbarBackground dark:bg-navbarBackground"
                      }`}
                    variant="outline"
                    onMouseEnter={handleMouseEnterAI}
                    onMouseLeave={handleMouseLeaveAI}
                  >
                    <span>
                      <Psychology
                        aria-hidden="true"
                        className="w-6 h-6 text-gray-500 dark:text-gray-100"
                      ></Psychology>
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  className={`w-72 select-none`}
                  onMouseEnter={handleMouseEnterAI}
                  onMouseLeave={handleMouseLeaveAI}
                >
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">
                        Artificial Intelligence
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Utilise AI to help with your editing
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover hover:dark:bg-buttonHover cursor-pointer"
                        onClick={() => setEditMode("rembg")}
                      >
                        <span className="flex flex-row items-center space-x-3 col-span-1">
                          {editMode === "rembg" && (
                            <CheckIcon className={`w-6 h-6 text-blue-600`} />
                          )}
                          <MagicWandIcon className="w-6 h-6" />
                          <Label htmlFor="rembg" className="cursor-pointer">
                            Remove Background
                          </Label>
                        </span>

                        <DropdownMenuShortcut>Ctrl+R+B</DropdownMenuShortcut>
                      </div>
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover hover:dark:bg-buttonHover cursor-pointer"
                        onClick={() => {
                          if (!(target instanceof ImageLayer)) {
                            toast.warning(
                              "Please select an image layer to inpaint",
                            );
                          } else {
                            setEditMode("inpaint");
                          }
                        }}
                      >
                        <span className="flex flex-row items-center space-x-3 col-span-1">
                          {editMode === "inpaint" && (
                            <CheckIcon className={`w-6 h-6 text-blue-600`} />
                          )}
                          <Brush className="w-6 h-6" />
                          <Label htmlFor="inpaint" className="cursor-pointer">
                            Inpaint
                          </Label>
                        </span>

                        <DropdownMenuShortcut>Ctrl+I+P</DropdownMenuShortcut>
                      </div>
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover hover:dark:bg-buttonHover cursor-pointer"
                        onClick={() => {
                          setOpenGenerate(true);
                          handleMouseLeaveAI();
                        }}
                      >
                        <span className="flex flex-row items-center space-x-3 col-span-1">
                          <AutoAwesome className="w-6 h-6" />
                          <Label htmlFor="generate" className="cursor-pointer">
                            Generate
                          </Label>
                        </span>

                        <DropdownMenuShortcut>Ctrl+G</DropdownMenuShortcut>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </li>
          </ul>
        </div>
      </aside>
      <BackgroundRemover />
      <Inpaint />
      <Generate open={openGenerate} onOpenChange={setOpenGenerate} />
      {(editMode === "rembg" || editMode === "inpaint") && (
        <div className="w-80"></div>
      )}
    </div>
  );
};
export default ToolBar;
