import Image from "next/image";
import Link from "next/link";
import React from "react";
import { CropIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoveIcon } from "@radix-ui/react-icons";
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import DownloadIcon from "@mui/icons-material/Download";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { TransformIcon } from "@radix-ui/react-icons";
import SettingsIcon from "@mui/icons-material/Settings";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useProjectContext } from "@/pages/editor";
import { Poppins } from "next/font/google";

interface ToolBarProps {
  imgSrc: string;
  downloadImage: () => void;
  toggleThirds: () => void;
}
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
const ToolBar: React.FC<ToolBarProps> = ({
  imgSrc,
  downloadImage,
  toggleThirds,
}) => {
  const [open, setOpen] = React.useState(false);
  const { project, setProject } = useProjectContext();
  return (
    <aside
      id="logo-sidebar"
      className={`animate-fade animate-once animate-ease-out fixed top-0 left-0 z-30 w-10 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r-2 border-[#cdcdcd] dark:border-[#252525]`}
      aria-label="Sidebar"
    >
      <div className="h-full py-6 overflow-y-auto bg-navbarBackground dark:bg-navbarBackground ">
        {imgSrc && (
          <div className="animate-fade animate-once animate-ease-linear mt-8">
            <div>
              <ul className="space-y-6 font-medium ">
                <li className="flex justify-center items-center">
                  <Popover open={open}>
                    <PopoverTrigger asChild>
                      <Button
                        className="w-6 flex flex-row items-center justify-center bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover"
                        variant="outline"
                        onMouseEnter={() => setOpen(true)}
                        onMouseLeave={() => setOpen(false)}
                      >
                        <span>
                          <MoveIcon
                            aria-hidden="true"
                            className="w-6 h-6 text-gray-500 dark:text-gray-100"
                            onClick={() => toggleThirds()}
                          ></MoveIcon>
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-72 ${poppins.className}`}>
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
                          <div className="grid grid-cols-2 items-center">
                            <span className="flex flex-row items-center space-x-1 col-span-1">
                              <MoveIcon className="w-6 h-6" />
                              <Label htmlFor="width">Move</Label>
                            </span>

                            <DropdownMenuShortcut>V</DropdownMenuShortcut>
                          </div>
                          <div className="grid grid-cols-2 items-center">
                            <span className="flex flex-row items-center space-x-1 col-span-1">
                              <TransformIcon className="w-6 h-6" />
                              <Label htmlFor="width">Transform</Label>
                            </span>
                            <DropdownMenuShortcut>Ctrl+T</DropdownMenuShortcut>
                          </div>
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
        )}
      </div>
    </aside>
  );
};
export default ToolBar;
