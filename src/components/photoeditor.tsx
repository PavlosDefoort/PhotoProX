import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
} from "react";

// import Cropping from "./cropping";
// import SaturationSlider from "./saturation";
// import ImageSelector from "./ImageSelector";
// import Rotate from "./Rotate";
import { debounce, set } from "lodash";
import { Tooltip } from "@mui/material";
import CropIcon from "@mui/icons-material/Crop";
import DownloadIcon from "@mui/icons-material/Download";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TransformIcon from "@mui/icons-material/Transform";
import SettingsIcon from "@mui/icons-material/Settings";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import { Crop, Remove, Undo } from "@mui/icons-material";
import { blue, pink, red } from "@mui/material/colors";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UndoIcon from "@mui/icons-material/Undo";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import RedoIcon from "@mui/icons-material/Redo";
// import { file } from "jszip";
import { usePinch } from "@use-gesture/react";
import { Slider } from "@mui/material";

interface PhotoEditorProps {
  naturalWidth: number;
  naturalHeight: number;
  imageData: string;
  realNaturalWidth: number;
  realNaturalHeight: number;
  fileName: string;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({
  naturalWidth,
  naturalHeight,
  imageData,
  realNaturalWidth,
  realNaturalHeight,
  fileName,
}) => {
  const [editingMode, setEditingMode] = useState("none");
  const [imgSrc, setImgSrc] = useState("");
  const [newImgSrc, setNewImgSrc] = useState("");
  const [firstRender, setFirstRender] = useState(true);
  const [linkedScale, setLinkedScale] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [displayXValue, setDisplayXValue] = useState(0);
  const [displayYValue, setDisplayYValue] = useState(0);
  const [undoStack, setUndoStack] = useState<
    Array<{
      rotate: number;
      translateX: number;
      translateY: number;
      scaleFactor: number;
      skewX: number;
      skewY: number;
      saturation: number;
      brightness: number;
      opacity: number;
    }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{
      rotate: number;
      translateX: number;
      translateY: number;
      scaleFactor: number;
      skewX: number;
      skewY: number;
      saturation: number;
      brightness: number;
      opacity: number;
    }>
  >([]);
  const [isUndoable, setIsUndoable] = useState(true);
  const [maxUndoStackSize, setMaxUndoStackSize] = useState(100);
  const [zoomValue, setZoomValue] = useState(1);
  const [previousZoom, setPreviousZoom] = useState(zoomValue);
  const [isZooming, setIsZooming] = useState(false);
  const [fake, setFake] = useState(0);
  const [fakeX, setFakeX] = useState(0);

  // Set the default values for the filters, tranformations, and effects
  const [saturationValue, setSaturationValue] = useState(1);
  const [brightnessValue, setBrightnessValue] = useState(1);
  const [opacityValue, setOpacityValue] = useState(1);
  const [contrastValue, setContrastValue] = useState(1);
  const [blurValue, setBlurValue] = useState(0);
  const [sepiaValue, setSepiaValue] = useState(0);
  const [dropShadowValue, setDropShadowValue] = useState(0);
  const [grayscaleValue, setGrayscaleValue] = useState(0);
  const [hueRotateValue, setHueRotateValue] = useState(0);
  const [invertValue, setInvertValue] = useState(0);
  const [scaleXValue, setScaleXValue] = useState(1);
  const [scaleYValue, setScaleYValue] = useState(1);
  const [rotateValue, setRotateValue] = useState(0);
  const [skewXValue, setSkewXValue] = useState(0);
  const [skewYValue, setSkewYValue] = useState(0);
  const [translateXValue, setTranslateXValue] = useState(0);
  const [translateYValue, setTranslateYValue] = useState(0);
  const [someWidth, setSomeWidth] = useState(0);
  const [someHeight, setSomeHeight] = useState(0);

  // Next task: Zoom to use scale generated value
  // Next task: Fix zoom usability

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef(null);
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // See https://use-gesture.netlify.app/docs/hooks/#about-the-pinch-gesture
    const preventGesture = (e: Event | TouchEvent) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
    };
  }, []);

  const zoomStep = 0.01;

  usePinch(
    ({ active, last, offset: [pinchScale], pinching }) => {
      if (active) {
        setIsZooming(true);
        const stepScale = Math.floor(pinchScale / zoomStep) * zoomStep;
        const newScale = stepScale + zoomStep;
        setZoomValue(newScale);
        return;
      }

      if (last) {
        setIsZooming(false);
      }
    },
    {
      target,
      scaleBounds: { min: 0.09, max: 3.9 },
      pointer: { touch: true },
      eventOptions: { passive: false },
    }
  );

  useEffect(() => {
    const canvas = canvasRef.current!;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "z") {
        setIsZooming(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "z") {
        setIsZooming(false);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (isZooming) {
        event.preventDefault();
        const zoomSpeed = 0.1; // Adjust the zoom speed as needed
        const deltaY = -event.deltaY; // Get the direction of the scroll (negative to zoom in, positive to zoom out)

        const zoom = deltaY > 0 ? zoomSpeed : -zoomSpeed;
        const newScaleFactor = Math.max(0.1, Math.min(10, zoomValue + zoom));
        // setZoomValue(newScaleFactor);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("wheel", handleWheel);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [
    isDragging,
    dragStartX,
    dragStartY,
    scaleFactor,
    rotateValue,
    zoomValue,
    isZooming,
  ]);

  // Call the drawNodes function whenever relevant values change

  const handleModeChange = (mode: string) => {
    setEditingMode(mode);
  };

  const handleDownload = () => {
    // Get the canvas element
    const canvas = canvasRef.current!;

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = canvas.toDataURL(); // Convert canvas to data URL
    link.download = "image.png"; // Set the filename for the downloaded image

    // Simulate a click event   on the link element to trigger the download
    link.click();
  };

  const handleScroll = (event: WheelEvent) => {
    // Pinch gestures usually trigger the ctrlKey or metaKey modifier
    const isPinchGesture = event.ctrlKey || event.metaKey;
    if (isPinchGesture) {
      return; // Ignore the event if it's a pinch gesture
    }

    if (!isZooming) {
      event.preventDefault();

      // Adjust the width and height based on the rotation (absolute rotation matrix)
      const newWidth =
        Math.abs(realNaturalWidth * Math.cos((rotateValue * Math.PI) / 180)) +
        Math.abs(realNaturalHeight * Math.sin((rotateValue * Math.PI) / 180));
      const newHeight =
        Math.abs(realNaturalWidth * Math.sin((rotateValue * Math.PI) / 180)) +
        Math.abs(realNaturalHeight * Math.cos((rotateValue * Math.PI) / 180));

      const maxOffsetLimit = Math.abs((newHeight * zoomValue - 1400) / 2);
      const maxOffsetLimitX = Math.abs((newWidth * zoomValue - 2800) / 2);

      // Calculate the maximum vertical offset based on the zoom level (prevent scrolling past the edges of the image)
      const maxVerticalOffset = Math.min(
        Math.max(0, newHeight * zoomValue - 1400),
        maxOffsetLimit
      );
      const maxHorizontalOffset = Math.min(
        Math.max(0, newWidth * zoomValue - 2800),
        maxOffsetLimitX
      );
      const zoomSpeed = 100; // Adjust the zoom speed as needed
      const deltaY = -event.deltaY; // Get the direction of the vertical scroll (negative to zoom in, positive to zoom out)
      const deltaX = -event.deltaX; // Get the direction of the horizontal scroll (negative to pan left, positive to pan right)
      const zoom = deltaY > 0 ? zoomSpeed : -zoomSpeed;
      const zoomX = deltaX > 0 ? zoomSpeed : -zoomSpeed;
      let newScaleFactor = fake;
      let newScaleFactorX = fakeX;

      if (deltaY !== 0) {
        // Zoom vertically
        if (zoom > 0) {
          newScaleFactor = Math.min(
            fake + zoom,
            maxVerticalOffset !== 0
              ? maxVerticalOffset + 100
              : maxVerticalOffset
          );
        } else {
          newScaleFactor = Math.max(
            fake + zoom,
            -maxVerticalOffset !== 0
              ? -maxVerticalOffset - 100
              : -maxVerticalOffset
          );
        }
      } else if (deltaX !== 0) {
        // Pan horizontally
        if (zoomX > 0) {
          newScaleFactorX = Math.min(
            fakeX + zoomX,
            maxHorizontalOffset !== 0
              ? maxHorizontalOffset + 100
              : maxHorizontalOffset
          );
        } else {
          newScaleFactorX = Math.max(
            fakeX + zoomX,
            -maxHorizontalOffset !== 0
              ? -maxHorizontalOffset - 100
              : -maxHorizontalOffset
          );
        }
      }

      setFake(newScaleFactor);
      setFakeX(newScaleFactorX);
    }
  };

  useEffect(() => {
    window.addEventListener("wheel", handleScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleScroll);
    };
  }, [fake, fakeX, isZooming, zoomValue]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    setNewImgSrc(canvas.toDataURL());
  }, [editingMode]);

  useEffect(() => {
    // set the image source to the imageData prop
    console.log("imageData", imageData);
    setImgSrc(imageData);
    const canvasWidth = 2800;
    const canvasHeight = 1400;
    const scale = Math.min(
      canvasWidth / realNaturalWidth,
      canvasHeight / realNaturalHeight
    );
    setZoomValue(scale);
  }, [imageData]);

  useEffect(() => {
    if (previousZoom > zoomValue) {
      // Zoom Out: Set the offset proportionally to the zoom level
      //(only if the zoom level is less than 1 to avoid growing the offset indefinitely)
      if (zoomValue < 1) {
        setFake(fake * zoomValue);
        setFakeX(fakeX * zoomValue);
      }
    }
    setPreviousZoom(zoomValue);
  }, [zoomValue]);

  useEffect(() => {
    const canvas = canvasRef.current!;

    const ctx = canvas.getContext("2d")!;

    // const pica = require("pica")();
    const image = new Image();

    const canvasWidth = 2800;
    const canvasHeight = 1400;

    // Calculate the new dimensions of the image
    const newWidth = realNaturalWidth * zoomValue;
    const newHeight = realNaturalHeight * zoomValue;

    // Calculate the coordinates to position the image at the center of the canvas
    const imageX = (canvasWidth - newWidth) / 2;
    const imageY = (canvasHeight - newHeight) / 2;

    const drawImageOnCanvas = async () => {
      // Set the dimensions of the offscreen canvas
      // const offscreenCanvas = document.createElement("canvas");
      // const offscreenCtx = offscreenCanvas.getContext("2d");
      // offscreenCanvas.width = image.width;
      // offscreenCanvas.height = image.height;
      // await pica.resize(image, offscreenCanvas, {
      //   unsharpAmount: 150,
      //   unsharpRadius: 0.8,
      //   unsharpThreshold: 2,
      // });

      // Perform interpolation using pica

      canvas.width = canvasWidth;

      canvas.height = canvasHeight;

      const currentState = {
        rotate: rotateValue,
        translateX: translateXValue,
        translateY: translateYValue,
        scaleFactor: scaleFactor,
        skewX: skewXValue,
        skewY: skewYValue,
        saturation: saturationValue,
        brightness: brightnessValue,
        opacity: opacityValue,
      };

      const filterValue = `
      saturate(${saturationValue})
      brightness(${brightnessValue})
      opacity(${opacityValue})
      contrast(${contrastValue})
      blur(${blurValue}px)
      sepia(${sepiaValue})
      drop-shadow(${dropShadowValue}px ${dropShadowValue}px 0 #000000)
      grayscale(${grayscaleValue})
      hue-rotate(${hueRotateValue}deg)
      invert(${invertValue})`;
      ctx.filter = filterValue;

      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing

      ctx.translate(canvas.width / 2, canvas.height / 2);

      ctx.rotate((rotateValue * Math.PI) / 180);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.transform(
        1,
        Math.tan((skewYValue * Math.PI) / 180),
        Math.tan((skewXValue * Math.PI) / 180),
        1,
        0,
        0
      );

      // Adjust the position based on the rotation (rotation matrix)
      const adjustedX =
        imageX +
        fakeX * Math.cos((rotateValue * Math.PI) / 180) +
        fake * Math.sin((rotateValue * Math.PI) / 180);
      const adjustedY =
        imageY +
        fake * Math.cos((rotateValue * Math.PI) / 180) -
        fakeX * Math.sin((rotateValue * Math.PI) / 180);

      if (firstRender) {
        const strings = ["jump-in", "spin", "rotate-y", "rotate-x"];
        const randomIndex = Math.floor(Math.random() * strings.length);
        const randomString = strings[randomIndex];

        ctx.drawImage(image, adjustedX, adjustedY, newWidth, newHeight);
        // canvas.className = `animate-${randomString} animate-once animate-ease-out bg-///border-solid border-2 bg-opacity-10 rounded-lg`;
        setFirstRender(false);
      } else {
        setSomeWidth(newWidth);
        setSomeHeight(newHeight);
        ctx.drawImage(image, adjustedX, adjustedY, newWidth, newHeight);
      }
      if (isUndoable) {
        if (undoStack.length === maxUndoStackSize) {
          const updatedUndoStack = undoStack.slice(1);
          setUndoStack([...updatedUndoStack, currentState]);
        } else {
          //Configure stack size?
          setUndoStack([...undoStack, currentState]);
          // Configure stack?
          setRedoStack([]);
        }
      }
    };

    // Debounce the drawImageOnCanvas function to prevent it from being called too often
    const debouncedEffect = debounce(() => {
      if (imgSrc) {
        image.onload = drawImageOnCanvas;

        image.src = imgSrc;
      }
    }, 0);

    debouncedEffect();

    return () => {
      debouncedEffect.cancel();
    };
  }, [
    imgSrc,
    rotateValue,
    skewXValue,
    skewYValue,
    scaleXValue,
    scaleYValue,
    translateXValue,
    translateYValue,
    saturationValue,
    brightnessValue,
    opacityValue,
    contrastValue,
    blurValue,
    sepiaValue,
    dropShadowValue,
    grayscaleValue,
    hueRotateValue,
    invertValue,
    scaleFactor,
    fake,
    fakeX,
    zoomValue,
  ]);

  const undoAction = async () => {
    if (undoStack.length <= 1) {
      return; // No actions to undo
    }

    // Get the last saved rotation value from the undoStack
    const lastRotationValue = undoStack[undoStack.length - 2];
    const redoValue = undoStack[undoStack.length - 1];

    // Disable adding actions to the undo stack temporarily
    setIsUndoable(false);

    // Apply the previous rotation value
    setRotateValue(lastRotationValue.rotate);
    setSkewXValue(lastRotationValue.skewX);
    setSkewYValue(lastRotationValue.skewY);
    setScaleFactor(lastRotationValue.scaleFactor);
    setTranslateXValue(lastRotationValue.translateX);
    setTranslateYValue(lastRotationValue.translateY);

    // Move the undone action to the redoStack
    setRedoStack([redoValue, ...redoStack]);

    // Remove the last rotation value from the undoStack
    const updatedUndoStack = undoStack.slice(0, undoStack.length - 1);

    setUndoStack(updatedUndoStack);

    // Wait for the state update to complete before re-enabling adding actions to the undo stack
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsUndoable(true);
        resolve();
      }, 0);
    });
  };

  const redoAction = async () => {
    if (redoStack.length === 0) {
      return; // No actions to redo
    }
    setIsUndoable(false);

    // Get the last saved canvas state from the redoStack; LIFO (last in first out)
    const nextState = redoStack[0];

    // Reapply the canvas state
    setRotateValue(nextState.rotate);
    setSkewXValue(nextState.skewX);
    setSkewYValue(nextState.skewY);
    setScaleFactor(nextState.scaleFactor);
    setTranslateXValue(nextState.translateX);
    setTranslateYValue(nextState.translateY);

    // Move the redone action to the undoStack
    setUndoStack([...undoStack, redoStack.shift()!]);

    // Update the redoStack
    const updatedRedoStack = redoStack.slice();

    setRedoStack(updatedRedoStack);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsUndoable(true);
        resolve();
      }, 0);
    });
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "z") {
        event.preventDefault();
        undoAction();
      }
    },
    [undoAction]
  );

  const handleKeyDownTwo = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "y") {
        event.preventDefault();
        redoAction();
      }
    },
    [redoAction]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDownTwo);

    return () => {
      window.removeEventListener("keydown", handleKeyDownTwo);
    };
  }, [handleKeyDownTwo]);

  const handleRotateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const rotatingValue = parseInt(value, 10);
    setRotateValue(rotatingValue);
  };

  const handleSkewXChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const skewingValue = parseInt(value, 10);
    setSkewXValue(skewingValue);
  };

  const handleReset = () => {
    setRotateValue(0);
    setSkewXValue(0);
    setSkewYValue(0);
    setScaleXValue(1);
    setScaleYValue(1);
    setTranslateXValue(0);
    setTranslateYValue(0);
    setDisplayXValue(0);
    setDisplayYValue(0);
    setScaleFactor(1);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleZoomIn = () => {
    const newZoomValue = Math.min(zoomValue * 2, 4); // Zoom in by doubling the value, limit to a maximum of 4
    setZoomValue(newZoomValue);
  };

  const handleZoomOut = () => {
    const newZoomValue = Math.max(zoomValue / 2, 0.1); // Zoom out by halving the value, limit to a minimum of 0.1
    setZoomValue(newZoomValue);
  };

  const [sliderValue, setSliderValue] = useState(zoomValue);

  useEffect(() => {
    setSliderValue(zoomValue);
  }, [zoomValue]);

  return (
    <div className="bg-[#252525] min-h-screen">
      <nav className="fixed top-0 z-50 w-full bg-[#3b3b3b] border-b border-[#3b3b3b] dark:bg-gray-800 dark:border-gray-700">
        <div className="px-3 py-2 lg:px-5 lg:pl-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <a href="https://flowbite.com" className="flex  md:mr-24">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
                  className="h-8 mr-3"
                  alt="FlowBite Logo"
                />
                <span className="self-center text-white text-xl font-semibold sm:text-2xl whitespace-nowrap dark:text-white">
                  PhotoProX
                </span>
              </a>
              <div className="w-96 ">
                {/* <span className=" text-white text-lg font-semibold sm:text-sm whitespace-nowrap dark:text-white">
                  Workspace: {fileName}
                </span> */}
                {imgSrc && (
                  <div className="flex">
                    <span className="pr-4 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                      <RemoveCircleOutlineIcon onClick={handleZoomOut} />
                    </span>
                    <Slider
                      value={zoomValue}
                      min={0.1}
                      max={4}
                      step={0.1}
                      onChange={(event, newValue) => {
                        const newZoomValue = Array.isArray(newValue)
                          ? newValue[0]
                          : newValue;
                        setZoomValue(newZoomValue);
                        setSliderValue(newZoomValue); // Update the slider value
                      }}
                    ></Slider>
                    <span className="pl-2 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                      <AddCircleOutlineIcon onClick={handleZoomIn} />
                    </span>
                    <span
                      className="pl-4 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700"
                      style={{ width: "4rem" }}
                    >
                      {(zoomValue * 100).toFixed(2) + "%"}
                    </span>
                  </div>
                )}

                {/* <span className="p-2 self-center text-white text-lg font-semibold sm:text-sm whitespace-nowrap dark:text-white">
                  {fake.toFixed(2)}
                </span> */}
              </div>
              {/* <img src={imgSrc} className="w-12 h-12"></img> */}

              {/* 
              <span class="self-center text-white text-lg font-semibold sm:text-sm whitespace-nowrap dark:text-white">
                <img src={imgSrc} className="w-4"></img>
              </span> */}
              {/* <span className="pl-8 self-center text-white text-lg font-semibold sm:text-lg whitespace-nowrap dark:text-white">
                {rotateValue + "\u00B0"}
              </span>
              <span className="pl-8 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white">
                {scaleFactor.toFixed(2)}
              </span>
              <span className="pl-8 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white">
                X: {Math.round(displayXValue * 100) / 100}
              </span>
              <span className="pl-8 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white">
                Y: {Math.round(displayYValue * 100) / 100}
              </span>

            
              <span className="pl-8 self-center text-white text-xl font-semibold sm:text-lg whitespace-nowrap dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                <RedoIcon onClick={redoAction} />
              </span> */}
            </div>
            <div className="flex items-center">
              {/* <div className="flex items-center ml-3">
                <div>
                  <button
                    type="button"
                    className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
                    aria-expanded="false"
                    data-dropdown-toggle="dropdown-user"
                  >
                    <span className="sr-only">Open user menu</span>
                    <img
                      className="w-8 h-8 rounded-full"
                      src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
                      alt="user photo"
                    />
                  </button>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </nav>

      <aside
        id="logo-sidebar"
        className="fixed top-0 left-0 z-40 w-12 h-screen transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-[#3b3b3b] dark:bg-gray-800">
          <div>
            <a
              href="https://flowbite.com/"
              className="flex items-center pl-2.5 mb-5"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
                className="h-6 mr-3 sm:h-7"
                alt="Flowbite Logo"
              />
            </a>
            <ul className="space-y-6 font-medium ">
              <li>
                <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                  <CropIcon
                    onClick={() => handleModeChange("crop")}
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    sx={{ color: blue[100] }}
                  ></CropIcon>
                </a>
              </li>

              <li>
                <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                  <DownloadIcon
                    onClick={handleDownload}
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    sx={{ color: blue[100] }}
                  ></DownloadIcon>
                </a>
              </li>
              <li>
                <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                  <ControlCameraIcon
                    onClick={() => handleModeChange("transform")}
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300"
                    sx={{ color: blue[200] }}
                  ></ControlCameraIcon>
                </a>
              </li>
              <li>
                <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                  <AutoAwesomeIcon
                    onClick={() => handleModeChange("adjust")}
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    sx={{ color: blue[100] }}
                  ></AutoAwesomeIcon>
                </a>
              </li>
              <li>
                <a className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700">
                  <SettingsIcon
                    onClick={() => handleModeChange("none")}
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    sx={{ color: blue[100] }}
                  ></SettingsIcon>
                </a>
              </li>
            </ul>
          </div>
          <div className="mt-6">
            <ul className="space-y-6 font-medium ">
              <li>
                <a
                  className="flex items-center justify-center text-gray-200 rounded-lg dark:text-white hover:bg-gray-800 dark:hover:bg-gray-700"
                  onClick={handleReset}
                >
                  <RestartAltIcon
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    sx={{ color: red[500] }}
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* <aside
        id="logo-sidebar"
        className="fixed top-0 right-0 z-40 w-80 h-screen transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-[#3b3b3b] dark:bg-gray-800">
          <ul className="space-y-4 font-medium">
            <li>
              <input
                className="relative z-10"
                type="range"
                min="0"
                max="360"
                step={15}
                value={rotateValue}
                onChange={handleRotateChange}
              />
              <input
                className="relative z-10"
                type="range"
                min="-90"
                max="90"
                step={1}
                value={skewXValue}
                onChange={handleSkewXChange}
              />
            </li>
          </ul>
        </div>
      </aside> */}

      <div className="p-4 sm:ml-64 ">
        <div className="">
          <div
            ref={target}
            className="flex items-center justify-center"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%)`,
              marginTop: "1.75rem",
            }}
          >
            <canvas
              id="canvas"
              ref={canvasRef}
              style={{
                display: "block",
                position: "absolute",
                width: naturalWidth ? `${1540}px` : "100%",
                height: naturalHeight ? `${770}px` : "100%",

                // backgroundImage:
                //   "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
                // backgroundSize: "10px 10px",
                // backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
              }}
            ></canvas>
            <img style={{ display: "none" }} src={imgSrc} ref={imgRef}></img>

            {/* {imgSrc && (
              <img
                src={imgSrc}
                style={{
                  display: "none",

                  width: naturalWidth ? `${naturalWidth}px` : "100%",
                  height: naturalHeight ? `${naturalHeight}px` : "100%",
                }}
              ></img>
            )} */}

            {editingMode === "crop" && (
              <div>Hello</div>
              //   <Cropping
              //     image={newImgSrc}
              //     scaledWidth={naturalWidth}
              //     scaledHeight={naturalHeight}
              //   />
            )}

            {/* <img 
              src={imgSrc}
              alt="img"
              style={{
                width: naturalWidth ? naturalWidth : "100%",
                height: naturalHeight ? naturalHeight : "100%",
                display: "none",
                maxWidth: "100vw",
                maxHeight: "92vh",
              }}
            />*/}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
