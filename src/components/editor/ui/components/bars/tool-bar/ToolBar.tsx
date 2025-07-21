import { Button } from "@/components/ui/button";
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChatBubbleIcon,
  CheckIcon,
  EyeOpenIcon,
  MagicWandIcon,
  MoveIcon,
} from "@radix-ui/react-icons";
import React, { useEffect } from "react";

import { useProject } from "@/hooks/useProject";
import { Psychology } from "@mui/icons-material";
import { TransformIcon } from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { toast } from "sonner";
import BackgroundRemover from "./tools/artificial-intelligence/BackgroundRemover";

const ToolBar: React.FC = () => {
  const [openView, setOpenView] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [openAI, setOpenAI] = React.useState(false);
  const { editMode, setEditMode } = useProject();
  const { layerManager } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);

  let timer: any;
  let aiTimer: any;
  let viewTimer: any;

  const handleMouseEnterView = () => {
    clearTimeout(viewTimer); // Clear any existing timeout
    setOpenView(true);
  };

  const handleMouseLeaveView = () => {
    // Set a timeout to close the popover after a delay
    viewTimer = setTimeout(() => {
      setOpenView(false);
    }, 200); // Adjust the delay time as needed
  };

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
    if (editMode === "rembg") {
      handleMouseLeaveAI();
    }
  }, [editMode]);
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
              <Popover open={openView}>
                <PopoverTrigger
                  asChild
                  className="focus-visible:ring-offset-0 focus-visible:ring-0"
                >
                  <Button
                    className={`w-6 flex flex-row items-center justify-center hover:bg-buttonHover dark:hover:bg-buttonHover ${
                      editMode === "view"
                        ? "bg-buttonHover dark:bg-[#3b3b3b]"
                        : "bg-navbarBackground dark:bg-navbarBackground"
                    }`}
                    onMouseEnter={handleMouseEnterView}
                    onMouseLeave={handleMouseLeaveView}
                    variant={"outline"}
                  >
                    <span>
                      <EyeOpenIcon
                        aria-hidden="true"
                        className="w-6 h-6 text-gray-500 dark:text-gray-100"
                      ></EyeOpenIcon>
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  className={`w-72 select-none`}
                  onMouseEnter={handleMouseEnterView}
                  onMouseLeave={handleMouseLeaveView}
                >
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">View</h4>
                      <p className="text-sm text-muted-foreground">
                        View the canvas with smooth animation
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover dark:hover:bg-buttonHover cursor-pointer"
                        onClick={() => {
                          setEditMode("view");
                        }}
                      >
                        <span className="flex flex-row items-center space-x-1 col-span-1">
                          {editMode === "view" && (
                            <CheckIcon className={`w-6 h-6 text-blue-600`} />
                          )}
                          <EyeOpenIcon className="w-6 h-6" />
                          <Label htmlFor="width" className="cursor-pointer">
                            View
                          </Label>
                        </span>

                        <DropdownMenuShortcut>V</DropdownMenuShortcut>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </li>

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

                        <DropdownMenuShortcut>M</DropdownMenuShortcut>
                      </div>
                      <div
                        className="grid grid-cols-2 items-center hover:bg-buttonHover dark:hover:bg-buttonHover cursor-pointer"
                        id="transform"
                        onClick={() => {
                          if (!(target instanceof ImageLayer)) {
                            toast.warning(
                              "Please select an image layer to transform"
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
              <Popover open={openAI}>
                <PopoverTrigger
                  asChild
                  className="focus-visible:ring-offset-0 focus-visible:ring-0"
                >
                  <Button
                    className={`w-6 flex flex-row items-center justify-center  hover:bg-buttonHover dark:hover:bg-buttonHover
                      ${
                        editMode === "rembg"
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
                        onClick={() => setEditMode("rembg")}
                      >
                        <span className="flex flex-row items-center space-x-3 col-span-1">
                          {editMode === "rembg" && (
                            <CheckIcon className={`w-6 h-6 text-blue-600`} />
                          )}
                          <ChatBubbleIcon className="w-6 h-6" />
                          <Label htmlFor="rembg" className="cursor-pointer">
                            Generate
                          </Label>
                        </span>

                        <DropdownMenuShortcut>Ctrl+R+B</DropdownMenuShortcut>
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
      {editMode === "rembg" && <div className="w-64"></div>}
    </div>
  );
};
export default ToolBar;
