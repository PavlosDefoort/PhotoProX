import { DividerVerticalIcon, HomeIcon } from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";
import MenuNavigation from "./navigation/menu/MenuNavigation";
import ProjectDropDown from "./navigation/project-dropdown/ProjectDropDown";
import UserNavigationMenu from "./navigation/user/UserNavigation";
import ZoomDropDown from "./navigation/zoom-dropdown/ZoomDropDown";
import UndoRedoButtons from "./navigation/undo/UndoRedoButtons";

const TopBar: React.FC = () => {
  return (
    <nav
      className={`z-40 w-full h-10 bg-navbarBackground dark:bg-navbarBackground border-b-2 border-[#cdcdcd] dark:border-[#252525] pl-2  flex items-center justify-start`}
    >
      <div className="w-11/12 flex justify-between h-full">
        <div className="flex items-center  text-black dark:text-white">
          <Link href="/">
            <HomeIcon className="hover:animate-bounce w-5 h-5" />
          </Link>
          <DividerVerticalIcon className="w-6 h-6 text-[#cdcdcd] dark:text-gray-500" />
          <div className="">
            <UserNavigationMenu />
          </div>
          <DividerVerticalIcon className="w-6 h-6 text-[#cdcdcd] dark:text-gray-500" />
          <MenuNavigation />
          <DividerVerticalIcon className="w-6 h-6 text-[#cdcdcd] dark:text-gray-500" />

          <ProjectDropDown />
        </div>

        <div className="flex items-center h-full text-black dark:text-white text-xs pr-10 space-x-4">
          <div className="flex items-center h-full text-black dark:text-white text-xs">
            <h1 className="mx-2"></h1>
            <UndoRedoButtons />
            <ZoomDropDown />
          </div>
        </div>
      </div>
    </nav>
  );
};
export default TopBar;
