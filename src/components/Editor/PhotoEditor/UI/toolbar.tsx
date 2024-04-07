import { Button } from "@/components/ui/button";
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckIcon,
  EyeOpenIcon,
  MagicWandIcon,
  MoveIcon,
} from "@radix-ui/react-icons";
import React, { useEffect } from "react";

import Discovery from "@/components/Editor/PhotoEditor/UI/discovery";
import { useProjectContext } from "@/pages/editor";
import { Psychology } from "@mui/icons-material";
import { TransformIcon } from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import { Poppins } from "next/font/google";

interface ToolBarProps {
  downloadImage: () => void;
  toggleThirds: () => void;
  mode: string;
  setMode: (mode: string) => void;
}
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const DynamicRemgb = dynamic(
  () => import("@/components/Editor/PhotoEditor/UI/rembg")
);

const ToolBar: React.FC<ToolBarProps> = ({
  downloadImage,
  toggleThirds,
  mode,
  setMode,
}) => {
  const [openView, setOpenView] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [openGallery, setOpenGallery] = React.useState(false);
  const [openAI, setOpenAI] = React.useState(false);
  const { loading } = useProjectContext();

  const { project, setProject } = useProjectContext();
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
    if (mode === "rembg") {
      handleMouseLeaveAI();
    }
  }, [mode]);
  return (
    <div>
      <aside
        id="logo-sidebar"
        className={`animate-fade select-none animate-once animate-ease-out w-10 h-full border-r-2 border-[#cdcdcd] dark:border-[#252525]`}
        aria-label="Sidebar"
      >
        <div className="h-full py-6 overflow-y-auto bg-navbarBackground dark:bg-navbarBackground ">
          <div className="animate-fade animate-once animate-ease-linear mt-1">
            <div>
              <ul className="space-y-6 font-medium ">
                <li className="flex justify-center items-center">
                  <Popover open={openView}>
                    <PopoverTrigger
                      asChild
                      className="focus-visible:ring-offset-0 focus-visible:ring-0"
                    >
                      <Button
                        className={`w-6 flex flex-row items-center justify-center hover:bg-buttonHover dark:hover:bg-buttonHover ${
                          mode === "view"
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
                      className={`w-72 ${poppins.className} select-none`}
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
                              setMode("view");
                            }}
                          >
                            <span className="flex flex-row items-center space-x-1 col-span-1">
                              {mode === "view" && (
                                <CheckIcon
                                  className={`w-6 h-6 text-blue-600`}
                                />
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

                <li className="flex justify-center items-center ">
                  <Popover open={open}>
                    <PopoverTrigger
                      asChild
                      className="focus-visible:ring-offset-0 focus-visible:ring-0"
                    >
                      <Button
                        className={`w-6 flex flex-row items-center justify-center  hover:bg-buttonHover dark:hover:bg-buttonHover
                      ${
                        mode === "move" || mode === "transform"
                          ? "bg-buttonHover dark:bg-[#3b3b3b]"
                          : "bg-navbarBackground dark:bg-navbarBackground"
                      }`}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        variant={"outline"}
                      >
                        <span>
                          {mode !== "transform" && (
                            <MoveIcon
                              aria-hidden="true"
                              className="w-6 h-6 text-gray-500 dark:text-gray-100"
                            ></MoveIcon>
                          )}
                          {mode === "transform" && (
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
                      className={`w-72 ${poppins.className} select-none`}
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
                              setMode("move");
                            }}
                          >
                            <span className="flex flex-row items-center space-x-1 col-span-1">
                              {mode === "move" && (
                                <CheckIcon
                                  className={`w-6 h-6 text-blue-600`}
                                />
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
                              setMode("transform");
                            }}
                          >
                            <span className="flex flex-row items-center space-x-1 col-span-1">
                              {mode === "transform" && (
                                <CheckIcon
                                  className={`w-6 h-6 text-blue-600`}
                                />
                              )}

                              <TransformIcon className="w-6 h-6" />
                              <Label
                                htmlFor="transform"
                                className="cursor-pointer"
                              >
                                Transform
                              </Label>
                            </span>
                            <DropdownMenuShortcut>
                              Ctrl+Alt+T
                            </DropdownMenuShortcut>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </li>
                <li className="flex justify-center items-center">
                  <Discovery />
                </li>
                <li className="flex justify-center items-center">
                  <Popover open={openAI}>
                    <PopoverTrigger
                      asChild
                      className="focus-visible:ring-offset-0 focus-visible:ring-0"
                    >
                      <Button
                        className={`w-6 flex flex-row items-center justify-center  hover:bg-buttonHover dark:hover:bg-buttonHover
                      ${
                        mode === "rembg"
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
                            onClick={() => toggleThirds()}
                          ></Psychology>
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      className={`w-72 ${poppins.className} select-none`}
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
                            onClick={() => setMode("rembg")}
                          >
                            <span className="flex flex-row items-center space-x-3 col-span-1">
                              {mode === "rembg" && (
                                <CheckIcon
                                  className={`w-6 h-6 text-blue-600`}
                                />
                              )}
                              <MagicWandIcon className="w-6 h-6" />
                              <Label htmlFor="rembg" className="cursor-pointer">
                                Remove Background
                              </Label>
                            </span>

                            <DropdownMenuShortcut>
                              Ctrl+R+B
                            </DropdownMenuShortcut>
                          </div>
                          {/* <div
                          className="grid grid-cols-2 items-center hover:bg-slate-200 cursor-pointer"
                          id="aiTransform"
                          onClick={() => {
                            setShowTransform(true);
                          }}
                        >
                          <span className="flex flex-row items-center space-x-1 col-span-1">
                            {showTransform && (
                              <CheckIcon className={`w-6 h-6 text-blue-600`} />
                            )}

                            <TransformIcon className="w-6 h-6" />
                            <Label
                              htmlFor="generativeFill"
                              className="cursor-pointer"
                            >
                              Generative Fill
                            </Label>
                          </span>
                          <DropdownMenuShortcut>Ctrl+T</DropdownMenuShortcut>
                        </div> */}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </li>

                {/* <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <DownloadIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                      onClick={() => downloadImage()}
                    ></DownloadIcon>
                  </a>
                </li> */}
                {/* <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <ControlCameraIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300"
                    ></ControlCameraIcon>
                  </a>
                </li>
                <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <AutoAwesomeIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    ></AutoAwesomeIcon>
                  </a>
                </li>
                <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <SettingsIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    ></SettingsIcon>
                  </a>
                </li> */}
              </ul>
            </div>
            {/* <div className="mt-6">
              <ul className="space-y-6 font-medium ">
                <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <RestartAltIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    />
                  </a>
                </li>
              </ul>
            </div> */}
          </div>
        </div>
      </aside>
      {mode === "rembg" && <div className="w-64"></div>}
      <DynamicRemgb setMode={setMode} mode={mode} />
    </div>
  );
};
export default ToolBar;
