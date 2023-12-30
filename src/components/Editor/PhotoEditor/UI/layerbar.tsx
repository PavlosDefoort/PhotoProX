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

interface LayerBarProps {
  imgSrc: string;
  downloadImage: () => void;
  toggleThirds: () => void;
}

const LayerBar: React.FC<LayerBarProps> = ({
  imgSrc,
  downloadImage,
  toggleThirds,
}) => {
  const [open, setOpen] = React.useState(false);
  const { project, setProject } = useProjectContext();
  return (
    <aside
      id="logo-sidebar"
      className="animate-fade animate-once animate-ease-out fixed top-0 right-0 z-30 w-40 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r-2 border-[#cdcdcd] dark:border-[#252525]"
      aria-label="Sidebar"
    >
      <div className="h-full py-6 overflow-y-auto bg-navbarBackground dark:bg-navbarBackground ">
        {imgSrc && (
          <div className="animate-fade animate-once animate-ease-linear mt-8">
            <div>
              <ul className="space-y-6 font-medium ">
                <li className="flex justify-center items-center">Layers</li>
                {project.layers
                  .slice()
                  .reverse()
                  .map((layer) => (
                    <li key={layer.id}>
                      <span className="text-xs">Layer {layer.zIndex}</span>
                      <div className="w-20 h-20 bg-blue-500 relative">
                        <img
                          src={layer.imageData.src}
                          alt="Image"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </li>
                  ))}

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
export default LayerBar;
