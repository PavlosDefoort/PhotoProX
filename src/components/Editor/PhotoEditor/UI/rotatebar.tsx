import React, { use, useEffect } from "react";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { Slider } from "@mui/material";
import { clamp } from "@/utils/calcUtils";
import Tooltip from "@mui/material/Tooltip";
import { set } from "lodash";
import { type } from "os";

interface RotateBarProps {
  changeActive: (mode: string) => void;
  setRotateValue: (value: number) => void;
  rotateValue: number;
  setScaleXSign: (value: number) => void;
  scaleXSign: number;
  scaleYSign: number;
  setScaleYSign: (value: number) => void;
}

const RotateBar: React.FC<RotateBarProps> = ({
  changeActive,
  setRotateValue,
  rotateValue,
  setScaleXSign,
  setScaleYSign,
  scaleXSign,
  scaleYSign,
}) => {
  const [previousRotateValue, setPreviousRotateValue] = React.useState(0);
  const [previousScaleXSign, setPreviousScaleXSign] = React.useState(1);
  const [previousScaleYSign, setPreviousScaleYSign] = React.useState(1);

  const rotateValueRef = React.useRef(rotateValue);
  const scaleXSignRef = React.useRef(scaleXSign);
  const scaleYSignRef = React.useRef(scaleYSign);

  useEffect(() => {
    setPreviousRotateValue(rotateValueRef.current);
    setPreviousScaleXSign(scaleXSignRef.current);
    setPreviousScaleYSign(scaleYSignRef.current);
  }, []);

  const handleRotateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    value;
    const parsedValue = parseInt(value);
    parsedValue;
    const newValue = clamp(parsedValue, -360, 360);
    setRotateValue(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const newRotateValue = clamp(
        parseInt((e.target as HTMLInputElement).value),
        -360,
        360
      );
      setRotateValue(newRotateValue);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (/^-?\d*$/.test(inputValue)) {
      // Check if the inputValue is a valid number with optional negative sign
      setRotateValue(parseInt(inputValue) || 0);
    }
  };

  const handleAccept = () => {
    changeActive("");
  };

  const handleCancel = () => {
    changeActive("");
    setRotateValue(previousRotateValue);
    setScaleXSign(previousScaleXSign);
    setScaleYSign(previousScaleYSign);
  };

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
              <span className="text-base">Rotate</span>
            </a>
          </li>

          <li className="relative flex justify-center pt-2" key={"rotate"}>
            <div
              className="flex flex-col justify-center items-center bg-gradient-to-t dark:from-[#3b3b3b]  dark:to-[#282828] bg-[#f3f3f3] h-60 w-48 dark:text-gray-300 border border-gray-500"
              id="rotate-container"
            >
              <div
                className="flex flex-row justify-center items-center"
                id="rotate-flip-group"
              >
                <div
                  className="w-20 text-[0.65rem] mr-2 font-bold uppercase flex flex-col justify-center items-center"
                  id="rotate-group"
                >
                  Rotate
                  <div id="rotate-button-group" className="pt-1 flex flex-row">
                    <Tooltip title="Rotate Clockwise" placement="bottom">
                      <span>
                        <button
                          className="bg-white dark:bg-[#3b3b3b] w-8 h-8 mr-2 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear"
                          onClick={() => {
                            const newRotateValue = clamp(
                              rotateValue + 15,
                              -360,
                              360
                            );
                            setRotateValue(newRotateValue);
                          }}
                          disabled={rotateValue === 360}
                        >
                          <RotateRightIcon />
                        </button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Rotate Counterclockwise" placement="bottom">
                      <span>
                        <button
                          className="bg-white dark:bg-[#3b3b3b] w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear"
                          onClick={() => {
                            const newRotateValue = clamp(
                              rotateValue - 15,
                              -360,
                              360
                            );
                            setRotateValue(newRotateValue);
                          }}
                          disabled={rotateValue === -360}
                        >
                          <RotateLeftIcon />
                        </button>
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <div
                  className="w-20 text-[0.65rem] font-bold uppercase flex flex-col justify-center items-center"
                  id="flip-group"
                >
                  Flip
                  <div id="flip-button-group" className="pt-1 flex flex-row">
                    <Tooltip title="Flip Horizontally" placement="bottom">
                      <button
                        className="bg-white dark:bg-[#3b3b3b] w-8 h-8 mr-2 border border-gray-500"
                        onClick={() => setScaleXSign(scaleXSign * -1)}
                      >
                        <SwapHorizIcon />
                      </button>
                    </Tooltip>
                    <Tooltip title="Flip Vertically" placement="bottom">
                      <button
                        className="bg-white dark:bg-[#3b3b3b] w-8 h-8 border border-gray-500"
                        onClick={() => setScaleYSign(scaleYSign * -1)}
                      >
                        <SwapVertIcon />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="w-40 mt-9" id="slider-group">
                {/* <input
                  type="number"
                  className="w-16 h-8 px-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  min="-360"
                  max="360"
                  step={15}
                  value={rotateValue}
                  onChange={handleChange}
                /> */}
                {/* <Slider
                  min={-360}
                  max={360}
                  value={rotateValue}
                  step={1}
                  onChange={(event, newValue) => {
                    const newRotateValue = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue;
                    setRotateValue(newRotateValue);
                  }}
                ></Slider> */}
              </div>
              <div id="accept-button-group">
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
export default RotateBar;
