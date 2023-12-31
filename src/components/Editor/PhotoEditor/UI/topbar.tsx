import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DividerVerticalIcon,
  DownloadIcon,
  HomeIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import dynamic from "next/dynamic";
import { fillImageToScreen, fitImageToScreen, clamp } from "@/utils/calcUtils";
import { set } from "lodash";
import ImageDropDown from "./imagedropdown";
import MenubarDemo from "@/components/ui/menu";
interface TopBarProps {
  imgName: string;
  zoomValue: string;
  canvasWidth: number;
  canvasHeight: number;
  width: number;
  height: number;
  rotateValue: number;
  setZoomValue: (value: number) => void;
  setFakeX: (value: number) => void;
  setFakeY: (value: number) => void;
  setFileName: (value: string) => void;
  scaleX: number;
  scaleY: number;
}
const DynamicComponent = dynamic(() => import("./dropdown"), {
  ssr: false,
});

const DynamicImageDropDown = dynamic(() => import("./imagedropdown"), {
  ssr: false,
});
const TopBar: React.FC<TopBarProps> = ({
  imgName,
  zoomValue,
  canvasWidth,
  canvasHeight,
  width,
  height,
  setZoomValue,
  rotateValue,
  setFakeX,
  setFakeY,
  scaleX,
  scaleY,
  setFileName,
}) => {
  const requestFill = () => {
    const newScale = fillImageToScreen(
      width * scaleX,
      height * scaleY,
      canvasWidth,
      canvasHeight,
      rotateValue
    );

    setZoomValue(newScale);
    setTimeout(() => {
      setFakeX(0);
      setFakeY(0);
    }, 10);
  };
  const requestFit = () => {
    const newScale = fitImageToScreen(
      width * scaleX,
      height * scaleY,
      canvasWidth,
      canvasHeight,
      rotateValue
    );

    setZoomValue(newScale);
    setTimeout(() => {
      setFakeX(0);
      setFakeY(0);
    }, 10);
  };

  const handleZoom = (zoomFactor: number) => {
    const parsedZoomValue = parseFloat(zoomValue);
    const fitScale = fitImageToScreen(
      width,
      height,
      canvasWidth,
      canvasHeight,
      rotateValue
    );
    let newZoomValue = clamp(parsedZoomValue * zoomFactor, 0.1, 4);

    if (
      (zoomFactor > 1 &&
        newZoomValue > fitScale &&
        parsedZoomValue < fitScale) ||
      (zoomFactor < 1 && newZoomValue < fitScale && parsedZoomValue > fitScale)
    ) {
      newZoomValue = fitScale;
    }

    setZoomValue(parseFloat(newZoomValue.toFixed(2)));
  };

  const handleZoomIn = () => {
    handleZoom(2);
  };

  const handleZoomOut = () => {
    handleZoom(0.5);
  };

  React.useEffect(() => {
    const checkZoom = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        requestFit();
      } else if (e.ctrlKey && e.key === "9") {
        e.preventDefault();
        requestFill();
      }
    };

    document.addEventListener("keydown", checkZoom);
    return () => {
      document.removeEventListener("keydown", checkZoom);
    };
  });
  return (
    <nav className="fixed top-0 z-40 w-full h-10 bg-navbarBackground dark:bg-navbarBackground border-b-2 border-[#cdcdcd] dark:border-[#252525] flex justify-between p-2">
      <div className="flex items-center h-full text-black dark:text-white">
        <Link href="/">
          <HomeIcon className="hover:animate-bounce w-5 h-5" />
          {/* <Image
            width={25}
            height={25}
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
            alt="PhotoProX Logo"
          /> */}
        </Link>
        <DividerVerticalIcon className="w-6 h-6 text-[#cdcdcd] dark:text-gray-500" />
        <MenubarDemo />
      </div>

      <div className="pl-16 flex items-center h-full text-black dark:text-white text-xs">
        <h1 className="mx-2">
          <ImageDropDown imgName={imgName} setImgName={setFileName} />
        </h1>

        <DynamicComponent
          zoomValue={zoomValue}
          requestFill={requestFill}
          requestFit={requestFit}
          zoomIn={handleZoomIn}
          zoomOut={handleZoomOut}
        />
      </div>
      <div className="flex items-center h-full text-black dark:text-white ">
        <Button
          type="button"
          className="flex flex-row items-center justify-center text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-3 py-0.3 h-6 text-center"
        >
          <span className="flex flex-row justify-center items-center">
            <DownloadIcon className="mr-0.5" />
            Download
          </span>
        </Button>
      </div>
    </nav>
  );
};
export default TopBar;
