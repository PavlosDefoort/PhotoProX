import React, { useEffect } from "react";
import { Tooltip } from "@mui/material";
import { set } from "lodash";
import { TextField } from "@mui/material";
import { clamp } from "@/utils/calcUtils";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { calculateMaxScale } from "@/utils/calcUtils";

interface ResizeBarProps {
  changeActive: (mode: string) => void;
  setScaleX: (value: number) => void;
  setScaleY: (value: number) => void;
  scaleX: number;
  scaleY: number;
  imageWidth: number;
  imageHeight: number;
  useRatio: boolean;
  setUseRatio: (value: boolean) => void;
}

const ResizeBar: React.FC<ResizeBarProps> = ({
  changeActive,
  setScaleX,
  setScaleY,
  scaleX,
  scaleY,
  imageWidth,
  imageHeight,
  useRatio,
  setUseRatio,
}) => {
  const [previousScaleX, setPreviousScaleX] = React.useState(0);
  const [previousScaleY, setPreviousScaleY] = React.useState(0);
  const [previousUseRatio, setPreviousUseRatio] = React.useState(false);
  const [displayScaleX, setDisplayScaleX] = React.useState(
    (scaleX * 100).toString()
  );
  const [displayScaleY, setDisplayScaleY] = React.useState(
    (scaleY * 100).toString()
  );
  const [newWidth, setNewWidth] = React.useState(imageWidth * scaleX);
  const [newHeight, setNewHeight] = React.useState(imageHeight * scaleY);
  const scaleXRef = React.useRef(scaleX);
  const scaleYRef = React.useRef(scaleY);
  const useRatioRef = React.useRef(useRatio);

  React.useEffect(() => {
    setPreviousScaleX(scaleXRef.current);
    setPreviousScaleY(scaleYRef.current);
    setPreviousUseRatio(useRatioRef.current);
  }, []);

  const handleAccept = () => {
    // Check if assigned value is a number
    if (isNaN(scaleX) || isNaN(scaleY)) {
      setScaleX(1);
      setScaleY(1);
    }
    changeActive("");
  };

  const handleCancel = () => {
    setScaleX(previousScaleX);
    setScaleY(previousScaleY);
    setUseRatio(previousUseRatio);
    changeActive("");
  };

  const calculateScaleX = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);

    if (!isNaN(value)) {
      try {
        const newScaleX = value / imageWidth;
        setScaleX(
          Math.min(newScaleX, calculateMaxScale(imageWidth, imageHeight))
        );
      } catch (error) {
        error;
      }
    }
  };

  const handleKeyDownX = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const value = parseInt(displayScaleX);
      if (!isNaN(value)) {
        const newValue =
          Math.round(
            clamp(
              value / 100,
              0.05,
              calculateMaxScale(imageWidth, imageHeight)
            ) * 100
          ) / 100;

        if (useRatio) {
          setScaleY(newValue);

          setDisplayScaleY((newValue * 100).toFixed(0).toString());
        }
        setScaleX(newValue);
        setDisplayScaleX((newValue * 100).toFixed(0).toString());
      } else {
        setScaleX(1);
        setDisplayScaleX("100");
      }
    }
  };

  const handleKeyDownY = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const value = parseInt(displayScaleY);
      if (!isNaN(value)) {
        const newValue =
          Math.round(
            clamp(
              value / 100,
              0.05,
              calculateMaxScale(imageWidth, imageHeight)
            ) * 100
          ) / 100;

        if (useRatio) {
          setScaleX(newValue);
          setDisplayScaleX((newValue * 100).toFixed(0).toString());
        }
        setScaleY(newValue);
        setDisplayScaleY((newValue * 100).toFixed(0).toString());
      } else {
        setScaleY(1);
        setDisplayScaleY("100");
      }
    }
  };

  const calculateScaleY = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      try {
        const newScaleY = value / imageHeight;
        // Round the value to 2 decimal places

        setScaleY(
          Math.min(newScaleY, calculateMaxScale(imageWidth, imageHeight))
        );
      } catch (error) {
        error;
      }
    }
  };

  const handleScaleX = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDisplayScaleX(value);
  };

  const handleScaleY = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDisplayScaleY(value);
  };

  const handleRatio = () => {
    setUseRatio(!useRatio);
  };

  useEffect(() => {
    if (useRatio) {
      setScaleY(scaleX);
      setDisplayScaleY((scaleX * 100).toFixed(0).toString());
    }
  }, [useRatio, scaleX, setScaleY]);

  //   useEffect(() => {
  //     const adjustWidth = imageWidth * scaleX;
  //     const roundedWidth = Math.round(adjustWidth * 100) / 100;
  //     setNewWidth(roundedWidth);
  //     const adjustHeight = imageHeight * scaleY;
  //     const roundedHeight = Math.round(adjustHeight * 100) / 100;
  //     setNewHeight(roundedHeight);
  //   }, [imageWidth, imageHeight, scaleX, scaleY]);

  return (
    <div className="z-10">
      <nav
        id="sidenav-1"
        className="animate-fade-right animate-once animate-duration-[500ms] animate-ease-out overflow-y-scroll hover: scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200 absolute left-0 top-0 z-[1035] h-full w-60 -translate-x-full overflow-hidden bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.07),_0_2px_4px_rgba(0,0,0,0.05)] data-[te-sidenav-hidden='false']:translate-x-0 dark:bg-[#3b3b3b]"
        data-te-sidenav-init
        data-te-sidenav-hidden="false"
        data-te-sidenav-position="absolute"
      >
        <ul
          className="relative m-0 list-none px-[0.2rem] pt-16"
          data-te-sidenav-menu-ref
        >
          <li className="relative" onClick={() => changeActive("")}>
            <a
              className="flex h-12 cursor-pointer items-center truncate rounded-[5px] px-6 py-4 text-[0.875rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
              </span>
              <span className="text-base">Resize</span>
            </a>
          </li>

          <li className="relative flex justify-center pt-2" key={"resize"}>
            <div
              className="flex flex-col justify-center items-center bg-gradient-to-t dark:from-[#3b3b3b]  dark:to-[#282828] bg-[#f3f3f3] h-52 w-48 dark:text-gray-300 border border-gray-500"
              id="resize-container"
            >
              <div className="">
                {useRatio ? (
                  <Tooltip title="Ignore aspect ratio" placement="top">
                    <span>
                      <button
                        onClick={handleRatio}
                        className="bg-white dark:bg-[#3b3b3b] w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear"
                      >
                        <LinkIcon />
                      </button>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Keep aspect ratio" placement="top">
                    <span>
                      <button
                        onClick={handleRatio}
                        className="bg-white dark:bg-[#3b3b3b] w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear"
                      >
                        <LinkOffIcon />
                      </button>
                    </span>
                  </Tooltip>
                )}
              </div>

              <div
                className="flex flex-row justify-center items-center mt-4"
                id="resize-flip-group"
              >
                <div
                  className="w-20 text-[0.65rem]  font-bold uppercase flex flex-col justify-center items-center"
                  id="resize-group"
                >
                  <div
                    id="scale-input-group"
                    className="flex flex-row  text-[0.6rem]"
                  >
                    <div className="flex flex-col justify-start items-start">
                      <h1 className="mb-1">X-Scale</h1>

                      <Tooltip title="Change Scale X" placement="bottom">
                        <input
                          value={displayScaleX}
                          type="text"
                          className="bg-white dark:bg-[#3b3b3b] w-20 h-8 mr-2 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear"
                          step={1}
                          onChange={handleScaleX}
                          onKeyDown={handleKeyDownX}
                        />
                      </Tooltip>
                    </div>
                    <div className="flex flex-col justify-start items-start">
                      <h1 className="mb-1">Y-Scale</h1>

                      <Tooltip title="Change Scale Y" placement="bottom">
                        <input
                          onChange={handleScaleY}
                          onKeyDown={handleKeyDownY}
                          value={displayScaleY}
                          step={1}
                          type="text"
                          className="bg-white dark:bg-[#3b3b3b] w-20 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear"
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>

              <div id="accept-button-group" className="mt-5">
                <button
                  className="inline-block rounded bg-[#282828] px-3 pb-2 pt-2 mr-2 text-[0.70rem] font-medium leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  className="inline-block rounded bg-primary px-3 pb-2 pt-2 text-[0.70rem] font-medium leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                  type="button"
                  onClick={handleAccept}
                >
                  Accept
                </button>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
};
export default ResizeBar;
