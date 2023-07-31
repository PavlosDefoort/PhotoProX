import React from "react";
import { Slider } from "@mui/material";
import { Tooltip } from "@mui/material";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

interface BottomBarProps {
  imgSrc: string;
  handleFitToScreen: () => void;
  handleZoomOut: () => void;
  handleZoomIn: () => void;
  setZoomValue: (value: number) => void;
  zoomValue: number;
}
const BottomBar: React.FC<BottomBarProps> = ({
  imgSrc,
  handleFitToScreen,
  handleZoomIn,
  handleZoomOut,
  zoomValue,
  setZoomValue,
}) => {
  return (
    <nav
      className="fixed bottom-0 z-10 w-full bg-white dark:bg-[#3b3b3b]  dark:border-gray-700 border-t border-gray-500"
      style={{ height: "54px" }}
    >
      <div className="px-3 py-3.5 lg:px-5 lg:pl-2 ">
        <div className="flex items-center justify-between">
          {imgSrc && (
            <div className="animate-fade animate-once animate-ease-linear flex items-center justify-center w-full ">
              <div className="flex flex-row w-80 ml-[330px]  ">
                <span className="pr-2  text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white ">
                  <Tooltip title="Fit to screen">
                    <AspectRatioIcon
                      onClick={handleFitToScreen}
                      className="w-5 text-gray-500 rounded-full transition-all duration-100 ease-in-out hover:bg-gray-800 dark:hover:bg-gray-700 "
                    />
                  </Tooltip>
                </span>
                <span className="pr-2  text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white ">
                  <Tooltip title="Zoom out">
                    <RemoveCircleOutlineIcon
                      onClick={handleZoomOut}
                      className="w-5 text-gray-500 rounded-full transition-all duration-100 ease-in-out hover:bg-gray-800 dark:hover:bg-gray-700 "
                    />
                  </Tooltip>
                </span>
                <Slider
                  size="small"
                  value={zoomValue}
                  min={0.1}
                  max={4}
                  step={0.1}
                  onChange={(event, newValue) => {
                    const newZoomValue = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue;
                    setZoomValue(newZoomValue);
                  }}
                ></Slider>
                <span className="pl-2  text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white ">
                  <Tooltip title="Zoom in">
                    <AddCircleOutlineIcon
                      onClick={handleZoomIn}
                      className="w-5 text-gray-500 rounded-full transition-all duration-100 ease-in-out hover:bg-gray-800 dark:hover:bg-gray-700 "
                    />
                  </Tooltip>
                </span>
                <span
                  className="pl-4 flex items-center pt-[1px] text-black text-sm font-semibold sm:text-md  dark:text-white "
                  style={{ width: "4rem" }}
                >
                  {(zoomValue * 100).toFixed(2) + "%"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
export default BottomBar;
