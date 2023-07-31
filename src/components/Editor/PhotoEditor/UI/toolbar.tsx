import Image from "next/image";
import Link from "next/link";
import React from "react";
import CropIcon from "@mui/icons-material/Crop";
import DownloadIcon from "@mui/icons-material/Download";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import TransformIcon from "@mui/icons-material/Transform";
import SettingsIcon from "@mui/icons-material/Settings";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

interface ToolBarProps {
  imgSrc: string;
}

const ToolBar: React.FC<ToolBarProps> = ({ imgSrc }) => {
  return (
    <aside
      id="logo-sidebar"
      className="fixed top-0 left-0 z-30 w-[56px] h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-gray-500"
      aria-label="Sidebar"
    >
      <div className="h-full px-3 py-6 overflow-y-auto bg-white dark:bg-[#3b3b3b] ">
        {imgSrc && (
          <div className="animate-fade animate-once animate-ease-linear">
            <div>
              <Link href="/" className="flex items-center pl-2.5 mb-5">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
                  className="h-6 mr-3 sm:h-7"
                  alt="Flowbite Logo"
                  width={35}
                  height={35}
                />
              </Link>
              <ul className="space-y-6 font-medium ">
                <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <CropIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    ></CropIcon>
                  </a>
                </li>

                <li>
                  <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                    <DownloadIcon
                      aria-hidden="true"
                      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    ></DownloadIcon>
                  </a>
                </li>
                <li>
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
                </li>
              </ul>
            </div>
            <div className="mt-6">
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
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
export default ToolBar;
