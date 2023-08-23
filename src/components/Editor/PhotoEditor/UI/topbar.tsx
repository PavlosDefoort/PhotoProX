import React from "react";
import Link from "next/link";
import Image from "next/image";
import DownloadIcon from "@mui/icons-material/Download";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import dynamic from "next/dynamic";

interface TopBarProps {
  imgName: string;
  zoomValue: string;
}
const DynamicComponent = dynamic(() => import("./dropdown"), {
  ssr: false,
});
const TopBar: React.FC<TopBarProps> = ({ imgName, zoomValue }) => {
  return (
    <nav className="fixed top-0 z-40 w-full h-10 bg-white dark:bg-[#3b3b3b] border-b-2 border-[#cdcdcd] dark:border-[#252525] flex justify-between p-2">
      <div className="flex items-center h-full text-black dark:text-white">
        <Link href="/">
          <Image
            width={25}
            height={25}
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
            alt="PhotoProX Logo"
          />
        </Link>
      </div>
      <div className="pl-16 flex items-center h-full text-black dark:text-white text-sm">
        <h1>Download</h1>
        <h1 className="mx-4">{imgName}</h1>
        <DynamicComponent />
      </div>
      <div className="flex items-center h-full text-black dark:text-white">
        <button
          type="button"
          className="flex flex-row items-center justify-center text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-3 py-0.3 text-center"
        >
          <span className="flex flex-row justify-center items-center mr-1 ">
            <span className="mr-0.5">
              <DownloadIcon />
            </span>
            <h1>Download</h1>
          </span>
        </button>
      </div>
    </nav>
  );
};
export default TopBar;
