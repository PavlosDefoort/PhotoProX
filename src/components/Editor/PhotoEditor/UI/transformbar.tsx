import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clamp } from "@/utils/calcUtils";
import { Poppins } from "next/font/google";
import React, { useEffect } from "react";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import { SwapHoriz, SwapVert } from "@mui/icons-material";
import { set } from "lodash";
import { useProjectContext } from "@/pages/editor";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LockClosedIcon,
  LockOpen1Icon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { CSSTransition } from "react-transition-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { height } from "@mui/system";
import "../../../../styles/animations.css";
import { ImageLayer } from "@/utils/editorInterfaces";

interface TopBarTwoProps {
  rotateValue: number;
  setRotateValue: (rotation: number) => void;
  setScaleXSign: (value: number) => void;
  scaleXSign: number;
  scaleYSign: number;
  setScaleYSign: (value: number) => void;
  showTransform: boolean;
  setShowTransform: (value: boolean) => void;
  positionX: number;
  positionY: number;
}

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const TopBarTwo: React.FC<TopBarTwoProps> = ({
  rotateValue,
  setRotateValue,
  setScaleXSign,
  scaleXSign,
  scaleYSign,
  setScaleYSign,
  showTransform,
  setShowTransform,
  positionX,
  positionY,
}) => {
  const [previousRotateValue, setPreviousRotateValue] = React.useState(0);
  const [previousScaleXSign, setPreviousScaleXSign] = React.useState(1);
  const [previousScaleYSign, setPreviousScaleYSign] = React.useState(1);

  const { project, setProject } = useProjectContext();

  const [stringXValue, setStringXValue] = React.useState("0");
  const [stringYValue, setStringYValue] = React.useState("0");
  const [stringWidthValue, setStringWidthValue] = React.useState("0");
  const [stringHeightValue, setStringHeightValue] = React.useState("0");
  const [stringSkewXValue, setStringSkewXValue] = React.useState("0.00");
  const [stringSkewYValue, setStringSkewYValue] = React.useState("0.00");
  const [isRatio, setIsRatio] = React.useState(true);

  const [stringRotateValue, setStringRotateValue] = React.useState(
    (Math.round(Number(rotateValue) * 10) / 10).toFixed(1) + "°"
  );
  const rotateValueRef = React.useRef(rotateValue);
  const scaleXSignRef = React.useRef(scaleXSign);
  const scaleYSignRef = React.useRef(scaleYSign);
  const positionXRef = React.useRef(positionX);
  const positionYRef = React.useRef(positionY);
  const heightRef = React.useRef(
    project.target?.type === "image"
      ? (project.target as ImageLayer).sprite.height
      : 0
  );
  const widthRef = React.useRef(
    project.target?.type === "image"
      ? (project.target as ImageLayer).sprite.width
      : 0
  );
  const skewXRef = React.useRef(
    project.target?.type === "image"
      ? (project.target as ImageLayer).sprite.skew.x
      : 0
  );
  const skewYRef = React.useRef(
    project.target?.type === "image"
      ? (project.target as ImageLayer).sprite.skew.y
      : 0
  );

  useEffect(() => {
    if (project.target && project.target.type === "image") {
      const imageLayer = project.target as ImageLayer;
      rotateValueRef.current = imageLayer.sprite.rotation;
      scaleXSignRef.current = imageLayer.sprite.scale.x > 0 ? 1 : -1;
      scaleYSignRef.current = imageLayer.sprite.scale.y > 0 ? 1 : -1;
      positionXRef.current = imageLayer.sprite.position.x;
      positionYRef.current = imageLayer.sprite.position.y;
      heightRef.current = imageLayer.sprite.height;
      widthRef.current = imageLayer.sprite.width;
      skewXRef.current = imageLayer.sprite.skew.x;
      skewYRef.current = imageLayer.sprite.skew.y;
    }
  }, [showTransform, project.target]);

  // Create event listener for ctrl + t to toggle the showTransform state
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (Cmd on macOS) + T is pressed
      // Prevent browser's default behavior
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "t" &&
        event.altKey
      ) {
        event.preventDefault(); // Prevent browser's default behavior
        setShowTransform(!showTransform);
      }
      if (showTransform && event.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTransform, setShowTransform]);

  const handleCancel = () => {
    if (
      heightRef.current &&
      widthRef.current &&
      project.target &&
      project.target.type === "image"
    ) {
      setStringHeightValue(heightRef.current.toFixed(0));
      setStringWidthValue(widthRef.current.toFixed(0));

      const imageLayer = project.target as ImageLayer;
      imageLayer.sprite.width = widthRef.current;
      imageLayer.sprite.height = heightRef.current;

      imageLayer.sprite.position.x = positionXRef.current;
      imageLayer.sprite.position.y = positionYRef.current;
      setStringXValue(positionXRef.current.toFixed(0));
      setStringYValue(positionYRef.current.toFixed(0));

      imageLayer.sprite.rotation = rotateValueRef.current;
      setStringRotateValue(
        (
          Math.round(Number(rotateValueRef.current * (180 / Math.PI)) * 10) / 10
        ).toFixed(1) + "°"
      );
      imageLayer.sprite.scale.set(scaleXSignRef.current, scaleYSignRef.current);

      imageLayer.sprite.skew.set(skewXRef.current ?? 0, skewYRef.current ?? 0);
      setStringSkewXValue((skewXRef.current ?? 0).toFixed(2));
      setStringSkewYValue((skewYRef.current ?? 0).toFixed(2));
    }
    setShowTransform(false);
  };

  const resetTransform = () => {
    // Reset to original state
    if (project.target && project.target.type === "image") {
      const imageLayer = project.target as ImageLayer;
      imageLayer.sprite.rotation = 0;
      imageLayer.sprite.scale.set(1, 1);
      imageLayer.sprite.skew.set(0, 0);
      imageLayer.sprite.position.x = project.settings.canvasSettings.width / 2;
      imageLayer.sprite.position.y = project.settings.canvasSettings.height / 2;

      setStringRotateValue("0.0°");
      setStringHeightValue(imageLayer.sprite.height.toFixed(0));
      setStringWidthValue(imageLayer.sprite.width.toFixed(0));
      setStringXValue(
        Math.round(project.settings.canvasSettings.width / 2).toString()
      );
      setStringYValue(
        Math.round(project.settings.canvasSettings.height / 2).toString()
      );
      setStringSkewXValue("0.00");
      setStringSkewYValue("0.00");
    }
  };

  const handleDone = () => {
    if (project.target && project.target.type === "image") {
      const imageLayer = project.target as ImageLayer;
      heightRef.current = imageLayer.sprite.height;
      widthRef.current = imageLayer.sprite.width;
      positionXRef.current = imageLayer.sprite.position.x;
      positionYRef.current = imageLayer.sprite.position.y;
      rotateValueRef.current = imageLayer.sprite.rotation;
      scaleXSignRef.current = imageLayer.sprite.scale.x;
      scaleYSignRef.current = imageLayer.sprite.scale.y;
      skewXRef.current = imageLayer.sprite.skew.x;
      skewYRef.current = imageLayer.sprite.skew.y;
    }
    setShowTransform(false);
  };

  React.useEffect(() => {
    if (project.target && project.target.type === "image") {
      const imageLayer = project.target as ImageLayer;
      setStringRotateValue(
        (
          Math.round(
            Number(imageLayer.sprite.rotation * (180 / Math.PI)) * 10
          ) / 10
        ).toFixed(1) + "°"
      );
      const roundedX = Math.round(imageLayer.sprite.position.x);
      const roundedY = Math.round(imageLayer.sprite.position.y);
      setStringXValue(roundedX.toString());
      setStringYValue(roundedY.toString());
      setStringWidthValue(imageLayer.sprite.width.toFixed(0));
      setStringHeightValue(imageLayer.sprite.height.toFixed(0));
    }
  }, [project, positionX, positionY]);

  const handleDimensionEnter = (
    dimension: string,
    value: string,
    isRatio: boolean
  ) => {
    let stringValue = value;
    if (stringValue === "-") {
      stringValue = "-1";
    }

    const roundedValue = Math.round(Number(stringValue));

    if (project.target && project.target.type === "image") {
      const imageLayer = project.target as ImageLayer;
      if (isRatio) {
        const aspectRatio =
          imageLayer.imageData.imageWidth / imageLayer.imageData.imageHeight;
        // Calculate corresponding width or height to maintain aspect ratio
        if (dimension === "w") {
          let newHeight = Math.round(roundedValue / aspectRatio).toFixed(0);
          // Check if newHeight is NaN
          if (isNaN(Number(newHeight))) {
            newHeight = "0";
          }

          imageLayer.sprite.width = Number(roundedValue);
          imageLayer.sprite.height = Number(newHeight);

          setStringWidthValue(roundedValue.toString());

          setStringHeightValue(newHeight.toString());
        } else {
          let newWidth = Math.round(roundedValue * aspectRatio);
          // Check if newWidth is NaN
          if (isNaN(Number(newWidth))) {
            newWidth = 0;
          }
          imageLayer.sprite.height = Number(roundedValue);
          imageLayer.sprite.width = Number(newWidth);
          setStringHeightValue(roundedValue.toString());
          setStringWidthValue(newWidth.toFixed(0));
          // Position the image in the center of the canvas
        }
      } else {
        if (dimension === "w") {
          imageLayer.sprite.width = Number(roundedValue);
          setStringWidthValue(roundedValue.toString());
        } else {
          imageLayer.sprite.height = Number(roundedValue);
          setStringHeightValue(roundedValue.toString());
        }
      }
      const middleX = Math.round(project.settings.canvasSettings.width / 2);
      const middleY = Math.round(project.settings.canvasSettings.height / 2);
      setProject((draft) => {
        if (draft.target && draft.target.type === "image") {
          (draft.target as ImageLayer).sprite.position.x = middleX;
          (draft.target as ImageLayer).sprite.position.y = middleY;
        }
      });
    }
  };

  const handleSkewEnter = (direction: string, value: string) => {
    let stringValue = value;
    if (stringValue === "-") {
      stringValue = "-1";
    }
    const roundedValue = (Math.round(Number(stringValue) * 100) / 100).toFixed(
      2
    );

    if (project.target && project.target.type === "image") {
      if (direction === "x") {
        (project.target as ImageLayer).sprite.skew.x = Number(roundedValue);
        setStringSkewXValue(roundedValue);
      } else {
        (project.target as ImageLayer).sprite.skew.y = Number(roundedValue);
        setStringSkewYValue(roundedValue);
      }
    }
  };

  const handlePositionEnter = (direction: string, value: string) => {
    let stringValue = value;
    if (stringValue === "-") {
      stringValue = "-1";
    }
    const roundedValue = Math.round(Number(stringValue));

    if (project.target && project.target.type === "image") {
      if (direction === "x") {
        (project.target as ImageLayer).sprite.position.x = Number(roundedValue);
        setStringXValue(roundedValue.toString());
      } else {
        (project.target as ImageLayer).sprite.position.y = Number(roundedValue);
        setStringYValue(roundedValue.toString());
      }
    }
  };

  const handleRotationEnter = () => {
    // Set the rotate value to the input value
    // Deal with the string value and convert it to a number, rounding it to the nearest decimal
    // Take out the degree symbol
    let stringValue = stringRotateValue;
    if (stringValue === "-") {
      stringValue = "-1";
    }
    const degreelessValue = stringValue.replace("°", "");
    const roundedValue = (
      Math.round(Number(degreelessValue) * 10) / 10
    ).toFixed(1);

    if (project.target && project.target.type === "image") {
      (project.target as ImageLayer).sprite.rotation =
        Number(roundedValue) * (Math.PI / 180);
    }

    // Set the string rotate value to the input value
    setStringRotateValue(roundedValue.toString() + "°");
  };
  return (
    <div className="w-full" id="transforming">
      {project.target && showTransform && (
        <div className="relative h-full w-full">
          <div
            className={`h-10 flex-wrap w-full z-10 bg-navbarBackground dark:bg-navbarBackground border-b-2 border-[#cdcdcd] dark:border-[#252525] flex justify-center items-center  ${poppins.className} text-black dark:text-white`}
          >
            <div className="w-40 h-7 flex flex-row items-center justify-center">
              <Label className="text-xs mr-2" htmlFor="skewX">
                Skew X
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={() => handleSkewEnter("x", stringSkewXValue)}
                type="text"
                id="skewX"
                className="h-7 w-20"
                value={stringSkewXValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign and the degree symbol
                  if (isNaN(Number(value)) && value !== "-") {
                    return;
                  }
                  // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                  // We don't want the picture to go out of bound and be hidden

                  // const maxPositive =
                  //   project.settings.canvasSettings.width +
                  //   project.target?.imageData.imageWidth! / 2;
                  // const maxNegative =
                  //   -project.target?.imageData.imageWidth! / 2;
                  // (
                  //   "maxPositive",
                  //   maxPositive,
                  //   "maxNegative",
                  //   maxNegative,
                  //   "value",
                  //   Number(value)
                  // );
                  if (Number(value) >= 1000 || Number(value) <= -1000) {
                    return;
                  }
                  setStringSkewXValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handleSkewEnter("x", stringSkewXValue);
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className="w-40 h-7 flex flex-row items-center justify-center">
              <Label className="text-xs mr-2" htmlFor="skewY">
                Skew Y
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={() => handleSkewEnter("y", stringSkewYValue)}
                type="text"
                id="skewY"
                className="h-7 w-20"
                value={stringSkewYValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign and the degree symbol
                  if (isNaN(Number(value)) && value !== "-") {
                    return;
                  }
                  // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                  // We don't want the picture to go out of bound and be hidden

                  // const maxPositive =
                  //   project.settings.canvasSettings.width +
                  //   project.target?.imageData.imageWidth! / 2;
                  // const maxNegative =
                  //   -project.target?.imageData.imageWidth! / 2;
                  // (
                  //   "maxPositive",
                  //   maxPositive,
                  //   "maxNegative",
                  //   maxNegative,
                  //   "value",
                  //   Number(value)
                  // );
                  if (Number(value) >= 1000 || Number(value) <= -1000) {
                    return;
                  }
                  setStringSkewYValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handleSkewEnter("y", stringSkewYValue);
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className="w-40 h-7 flex flex-row items-center justify-center cursor-fancy ">
              <Label className="text-xs mr-2" htmlFor="translatex">
                Width
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={() =>
                  handleDimensionEnter("w", stringWidthValue, isRatio)
                }
                type="text"
                id="width"
                className="h-7 w-20"
                value={stringWidthValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign and the degree symbol
                  if (isNaN(Number(value)) && value !== "-") {
                    return;
                  }
                  // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                  // We don't want the picture to go out of bound and be hidden

                  const maxPositive = 10000;
                  const maxNegative = -10000;

                  if (
                    Number(value) >= maxPositive ||
                    Number(value) <= maxNegative
                  ) {
                    return;
                  }
                  setStringWidthValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handleDimensionEnter("w", stringWidthValue, isRatio);
                    e.currentTarget.blur();
                  }
                }}
              />

              {isRatio && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {" "}
                      <button
                        className="ml-2 w-5 h-5"
                        onClick={() => setIsRatio(false)}
                      >
                        <LockClosedIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-gray-600 text-white text-xs"
                    >
                      <p>Maintain aspect ratio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isRatio && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {" "}
                      <button
                        className="ml-2 w-5 h-5"
                        onClick={() => setIsRatio(true)}
                      >
                        <LockOpen1Icon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="bg-gray-600 text-white text-xs"
                    >
                      <p>Neglect aspect ratio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="w-40 h-7 flex flex-row items-center justify-center">
              <Label className="text-xs mr-2" htmlFor="translatex">
                Height
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={() =>
                  handleDimensionEnter("h", stringHeightValue, isRatio)
                }
                type="text"
                id="height"
                className="h-7 w-20"
                value={stringHeightValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign and the degree symbol
                  if (isNaN(Number(value)) && value !== "-") {
                    return;
                  }
                  // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                  // We don't want the picture to go out of bound and be hidden

                  const maxPositive = 10000;
                  const maxNegative = -10000;

                  if (
                    Number(value) >= maxPositive ||
                    Number(value) <= maxNegative
                  ) {
                    return;
                  }

                  setStringHeightValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handleDimensionEnter("h", stringHeightValue, isRatio);
                    // Unfocus the input
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className="w-40 h-7 flex flex-row items-center justify-center">
              <Label className="text-xs mr-2" htmlFor="translatex">
                X
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={() => handlePositionEnter("x", stringXValue)}
                type="text"
                id="translatex"
                className="h-7 w-20"
                value={stringXValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign and the degree symbol
                  if (isNaN(Number(value)) && value !== "-") {
                    return;
                  }
                  // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                  // We don't want the picture to go out of bound and be hidden

                  if (project.target && project.target.type === "image") {
                    const maxPositive =
                      project.settings.canvasSettings.width +
                      (project.target as ImageLayer).imageData.imageWidth! / 2;
                    const maxNegative =
                      -(project.target as ImageLayer).imageData.imageWidth! / 2;

                    if (
                      Number(value) >= maxPositive ||
                      Number(value) <= maxNegative
                    ) {
                      return;
                    }
                  }

                  setStringXValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handlePositionEnter("x", stringXValue);
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className="w-40 h-7 flex flex-row items-center justify-center">
              <Label className="text-xs mr-2" htmlFor="translatey">
                Y
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={() => handlePositionEnter("y", stringYValue)}
                type="text"
                id="translatey"
                className="h-7 w-20"
                value={stringYValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign and the degree symbol
                  if (isNaN(Number(value)) && value !== "-") {
                    return;
                  }
                  // Check if the number is between the canvas height and the negative canvas height

                  if (project.target && project.target.type === "image") {
                    const maxPositive =
                      project.settings.canvasSettings.height +
                      (project.target as ImageLayer).imageData.imageHeight! / 2;
                    const maxNegative =
                      -(project.target as ImageLayer).imageData.imageHeight! /
                      2;
                    if (
                      Number(value) >= maxPositive ||
                      Number(value) <= maxNegative
                    ) {
                      return;
                    }
                  }

                  setStringYValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handlePositionEnter("y", stringYValue);
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className="w-40 h-7 flex flex-row items-center justify-center">
              <Label className="text-xs mr-2" htmlFor="rotation">
                Rotation
              </Label>
              <Input
                onFocus={(e) => e.target.select()}
                onBlur={handleRotationEnter}
                type="text"
                id="rotation"
                className="h-7 w-20"
                value={stringRotateValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Check if the value is a number, omitting the minus sign
                  if (isNaN(Number(value)) && value !== "-" && value !== "°") {
                    return;
                  }
                  // Check if the number is between -360 and 360
                  if (Number(value) > 360 || Number(value) < -360) {
                    return;
                  }

                  setStringRotateValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  // Check if key is enter
                  if (e.key === "Enter") {
                    handleRotationEnter();
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          </div>
          <div
            className="h-12 z-10 w-72 fixed bottom-0 flex flex-row items-center justify-center mb-8  text-black dark:text-white animate-jump-in animate-once"
            style={{
              left: `${
                document.getElementById("logo-sidebar")?.clientWidth! +
                (document.getElementById("transforming")?.clientWidth! / 2 -
                  144)
              }px`,
            }}
          >
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                if (project.target && project.target.type === "image") {
                  const imageLayer = project.target as ImageLayer;
                  const newRotateValue = clamp(
                    scaleXSign * scaleYSign === 1
                      ? imageLayer.sprite.rotation * (180 / Math.PI) - 15
                      : imageLayer.sprite.rotation * (180 / Math.PI) + 15,
                    -360,
                    360
                  );
                  const roundedValue = (
                    Math.round(Number(newRotateValue) * 10) / 10
                  ).toFixed(1);
                  imageLayer.sprite.rotation =
                    Number(roundedValue) * (Math.PI / 180);
                  setStringRotateValue(roundedValue + "°");
                }
              }}
              disabled={
                project.target.type === "image"
                  ? scaleXSign * scaleYSign === 1
                    ? (project.target as ImageLayer).sprite.rotation *
                        (180 / Math.PI) ===
                      -360
                    : (project.target as ImageLayer).sprite.rotation *
                        (180 / Math.PI) ===
                      360
                  : true
              }
            >
              <RotateLeftIcon />
            </button>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                if (project.target && project.target.type === "image") {
                  const imageLayer = project.target as ImageLayer;
                  const newRotateValue = clamp(
                    scaleXSign * scaleYSign === 1
                      ? imageLayer.sprite.rotation * (180 / Math.PI) + 15
                      : imageLayer.sprite.rotation * (180 / Math.PI) - 15,
                    -360,
                    360
                  );
                  const roundedValue = (
                    Math.round(Number(newRotateValue) * 10) / 10
                  ).toFixed(1);
                  imageLayer.sprite.rotation =
                    Number(roundedValue) * (Math.PI / 180);
                  setStringRotateValue(roundedValue + "°");
                }
              }}
              disabled={
                project.target.type === "image"
                  ? scaleXSign * scaleYSign === 1
                    ? (project.target as ImageLayer).sprite.rotation *
                        (180 / Math.PI) ===
                      360
                    : (project.target as ImageLayer).sprite.rotation *
                        (180 / Math.PI) ===
                      -360
                  : true
              }
            >
              <RotateRightIcon />
            </button>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                if (project.target && project.target.type === "image") {
                  const imageLayer = project.target as ImageLayer;
                  imageLayer.sprite.scale.set(
                    imageLayer.sprite.scale.x * -1,
                    imageLayer.sprite.scale.y
                  );
                }
              }}
            >
              <SwapHoriz
                className={`${scaleXSign === -1 ? "bg-blue-400" : ""}`}
              />
            </button>
            <button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-8 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95"
              onClick={() => {
                if (project.target && project.target.type === "image") {
                  const imageLayer = project.target as ImageLayer;
                  imageLayer.sprite.scale.set(
                    imageLayer.sprite.scale.x,
                    imageLayer.sprite.scale.y * -1
                  );
                }
              }}
            >
              <SwapVert />
            </button>

            <Button
              className="bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover w-14 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black"
              onClick={() => handleCancel()}
            >
              Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                asChild
                className="bg-red-500 hover:bg-red-600 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 w-10 h-8 text-sm"
              >
                <Button variant="outline" className="w-14 h-8">
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="text-black dark:text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will redo all the transformations you have made
                    to the image. This action can be undone, so no worries :)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetTransform}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              className="bg-blue-500 dark:bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-600 w-14 h-8 border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black"
              onClick={() => handleDone()}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default TopBarTwo;
