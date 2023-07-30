import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
  useContext,
  lazy,
  Suspense,
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
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import RedoIcon from "@mui/icons-material/Redo";
import PinchHandler from "./pinchLogic";
// import { file } from "jszip";
import { Slider } from "@mui/material";
const SideBar = lazy(() => import("../components/sidebar"));
const FilterBar = lazy(() => import("../components/filterbar"));
import Link from "next/link";
import {
  Application,
  Sprite,
  BlurFilter,
  NoiseFilter,
  ColorMatrixFilter,
} from "pixi.js";
import { ThemeContext } from "../components/themeprovider";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { Console } from "console";
import { Filter } from "pixi.js";
import EditBar from "./editbar";

interface PhotoEditorProps {
  imageData: string;
  realNaturalWidth: number;
  realNaturalHeight: number;
  fileName: string;
  fileSize: number;
}

const PhotoEditor: React.FC<PhotoEditorProps> = ({
  imageData,
  realNaturalWidth,
  realNaturalHeight,
  fileName,
  fileSize,
}) => {
  const [editingMode, setEditingMode] = useState("");
  const [windowWidth, setWindowWidth] = useState(0);
  const [deltaWidth, setDeltaWidth] = useState(0);
  const [fitToScreen, setFitToScreen] = useState(0);
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
  // Add a canvasWidth and height global state to optimize resolution
  const [canvasWidth, setCanvasWidth] = useState(3000);
  const [canvasHeight, setCanvasHeight] = useState(1500);
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
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

  // Sidebar Layout

  // Transform
  // Crop
  // Skew
  // Rotate
  // Resize

  // Color Filters
  // Tint
  // Night
  // Sepia
  // Vintage
  // Predator
  // LSD
  // Browni
  // Polaroid
  // Negative
  // Kodachrome
  // toBGR

  // Set the default values for the filters, tranformations, and effects

  interface ImageProperties {
    contrast: { value: number; multiply: boolean; enabled?: boolean };
    brightness: { value: number; multiply: boolean; enabled?: boolean };
    grayscale: { value: number; multiply: boolean; enabled?: boolean };
    vintage: { multiply: boolean; enabled: boolean };
    sepia: { multiply: boolean; enabled: boolean };
    predator: { value: number; multiply: boolean; enabled: boolean };
    night: { value: number; multiply: boolean; enabled: boolean };
    lsd: { multiply: boolean; enabled: boolean };
    browni: { multiply: boolean; enabled: boolean };
    polaroid: { multiply: boolean; enabled: boolean };
    negative: { multiply: boolean; enabled: boolean };
    kodachrome: { multiply: boolean; enabled: boolean };
    hue: { value: number; multiply: boolean; enabled?: boolean };
    tint: { value: number; multiply: boolean; enabled: boolean }; // 'enabled' property is optional here
    toBGR: { multiply: boolean; enabled: boolean };
    technicolor: { multiply: boolean; enabled: boolean };

    // Index signature
    [key: string]: { value?: number; multiply: boolean; enabled?: boolean };
  }

  const defaultImageProperties: ImageProperties = {
    contrast: {
      value: 0,
      multiply: false,
    },
    brightness: {
      value: 1,
      multiply: false,
    },
    grayscale: {
      value: 1,
      multiply: false,
    },
    vintage: {
      multiply: true,
      enabled: false,
    },
    sepia: {
      multiply: false,
      enabled: false,
    },
    predator: {
      value: 0.1,
      multiply: false,
      enabled: false,
    },
    night: {
      value: 1,
      multiply: false,
      enabled: false,
    },
    lsd: {
      multiply: false,
      enabled: false,
    },
    browni: {
      multiply: true,
      enabled: false,
    },
    polaroid: {
      multiply: false,
      enabled: false,
    },
    negative: {
      multiply: false,
      enabled: false,
    },

    kodachrome: {
      multiply: true,
      enabled: false,
    },

    hue: {
      value: 0,
      multiply: false,
    },
    tint: {
      value: 0xff0000,
      multiply: false,
      enabled: false,
    },
    toBGR: {
      multiply: false,
      enabled: false,
    },
    technicolor: {
      multiply: true,
      enabled: false,
    },
  };
  const [imageProperties, setImageProperties] = useState<ImageProperties>(
    defaultImageProperties
  );

  const [rotateValue, setRotateValue] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const imgRef = useRef(null);
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const calculateDeltaWidth = () => {
      const x = (windowWidth - 592) / 2;

      const delta = windowWidth / 2 - 148;

      const changeInWidth = delta - x;

      setDeltaWidth(changeInWidth);
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    calculateDeltaWidth();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [windowWidth]);

  const handleFitToScreen = () => {
    setZoomValue(fitToScreen);
  };

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

  useEffect(() => {
    console.log(editingMode);
  }, [editingMode]);

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

  useEffect(() => {
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

        const maxOffsetLimit = Math.abs(
          (newHeight * zoomValue - canvasHeight) / 2
        );
        const maxOffsetLimitX = Math.abs(
          (newWidth * zoomValue - canvasWidth) / 2
        );

        // Calculate the maximum vertical offset based on the zoom level (prevent scrolling past the edges of the image)
        const maxVerticalOffset = Math.min(
          Math.max(0, newHeight * zoomValue - canvasHeight),
          maxOffsetLimit
        );
        const maxHorizontalOffset = Math.min(
          Math.max(0, newWidth * zoomValue - canvasWidth),
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

    const canvas = canvasRef.current!;

    canvas.addEventListener("wheel", handleScroll, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleScroll);
    };
  }, [
    fake,
    fakeX,
    isZooming,
    zoomValue,
    realNaturalHeight,
    realNaturalWidth,
    rotateValue,
    canvasWidth,
    canvasHeight,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    setNewImgSrc(canvas.toDataURL());
  }, [editingMode]);

  useEffect(() => {
    // set the image source to the imageData prop

    setImgSrc(imageData);

    const scale = Math.min(
      canvasWidth / 1.1 / realNaturalWidth,
      canvasHeight / 1.1 / realNaturalHeight
    );

    setZoomValue(parseFloat(scale.toFixed(2)));
    setFitToScreen(parseFloat(scale.toFixed(2)));
    if (
      imageData.length > 0 &&
      realNaturalWidth > 0 &&
      realNaturalHeight > 0 &&
      fileName.length > 0 &&
      (fileSize / 3) * 4 < 4
    ) {
      localStorage.setItem("imageData", imageData);
      localStorage.setItem("realNaturalWidth", realNaturalWidth.toString());
      localStorage.setItem("realNaturalHeight", realNaturalHeight.toString());
      localStorage.setItem("imageName", fileName);
    }
  }, [
    imageData,
    realNaturalWidth,
    realNaturalHeight,
    fileName,
    fileSize,
    canvasWidth,
    canvasHeight,
  ]);
  useEffect(() => {
    const calculateAspectRatioFit = () => {
      const targetRatio = realNaturalWidth / realNaturalHeight;
      let newWidth, newHeight;

      if (realNaturalWidth / realNaturalHeight > targetRatio) {
        newWidth = realNaturalHeight * targetRatio;
        newHeight = realNaturalHeight;
      } else {
        newWidth = realNaturalWidth;
        newHeight = realNaturalWidth / targetRatio;
      }

      // setCanvasWidth(newWidth);
      // setCanvasHeight(newHeight);
      // const app = appRef.current!;
      // console.log(newWidth, newHeight);
      // if (app) app.renderer.resize(newWidth, newHeight);
    };
    calculateAspectRatioFit();
  }, [realNaturalWidth, realNaturalHeight]);

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
  }, [zoomValue, fake, fakeX, previousZoom]);

  useEffect(() => {
    const app = appRef.current!;

    if (app) {
      if (darkMode) {
        app.renderer.background.color = 0x252525;
      } else {
        app.renderer.background.color = 0xcdcdcd;
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!appRef.current) {
      // If the app doesn't exist, create it
      let backgroundColor;
      if (darkMode) {
        backgroundColor = 0x252525;
      } else {
        backgroundColor = 0xcdcdcd;
      }
      appRef.current = new Application({
        view: canvasRef.current,
        width: canvasWidth,
        height: canvasHeight,
        antialias: true,
        preserveDrawingBuffer: true,
        resolution: 1,
        powerPreference: "high-performance",
        clearBeforeRender: true,
        backgroundColor: backgroundColor,
        hello: true,
      });
    }

    const app = appRef.current; // Use the existing app instance

    if (imgSrc) {
      const imageWidth = realNaturalWidth;
      const imageHeight = realNaturalHeight;
      app.stage.removeChildren();
      const blurFilter = new BlurFilter();
      // Load image with PIXI

      // Add a saturation filter
      const saturationFilter = new NoiseFilter();

      const offsetX = 0;

      // Calculate the new dimensions of the image
      const newWidth = imageWidth * zoomValue;
      const newHeight = imageHeight * zoomValue;

      // Calculate the coordinates to position the image at the center of the canvas
      const imageX = (canvasWidth - newWidth) / 2 + offsetX;

      const imageY = (canvasHeight - newHeight) / 2;

      // Calculate the adjusted coordinates to position the image at the center of the canvas using rotation matrix
      const adjustedX =
        imageX +
        fakeX * Math.cos((rotateValue * Math.PI) / 180) -
        fake * Math.sin((rotateValue * Math.PI) / 180);
      const adjustedY =
        imageY +
        fake * Math.cos((rotateValue * Math.PI) / 180) +
        fakeX * Math.sin((rotateValue * Math.PI) / 180);

      const image = Sprite.from(imgSrc);

      // Calculate the scale factor

      image.width = imageWidth;
      image.height = imageHeight;

      // Change saturation
      const colorMatrix = new ColorMatrixFilter();

      colorMatrix.contrast(
        imageProperties.contrast.value,
        imageProperties.contrast.multiply
      );
      colorMatrix.brightness(
        imageProperties.brightness.value,
        imageProperties.brightness.multiply
      );

      colorMatrix.grayscale(
        imageProperties.grayscale.value,
        imageProperties.grayscale.multiply
      );
      colorMatrix.hue(imageProperties.hue.value, imageProperties.hue.multiply);

      if (imageProperties.vintage.enabled) {
        colorMatrix.vintage(imageProperties.vintage.multiply);
      }

      if (imageProperties.toBGR.enabled) {
        colorMatrix.toBGR(imageProperties.toBGR.multiply);
      }

      if (imageProperties.technicolor.enabled) {
        colorMatrix.technicolor(imageProperties.technicolor.multiply);
      }

      if (imageProperties.sepia.enabled) {
        colorMatrix.sepia(imageProperties.sepia.multiply);
      }

      if (imageProperties.predator.enabled) {
        colorMatrix.predator(
          imageProperties.predator.value,
          imageProperties.predator.multiply
        );
      }

      if (imageProperties.polaroid.enabled) {
        colorMatrix.polaroid(imageProperties.polaroid.multiply);
      }

      if (imageProperties.night.enabled) {
        colorMatrix.night(
          imageProperties.night.value,
          imageProperties.night.multiply
        );
      }

      if (imageProperties.kodachrome.enabled) {
        colorMatrix.kodachrome(imageProperties.kodachrome.multiply);
      }

      // colorMatrix.vintage(true);
      // colorMatrix.toBGR(false);
      // colorMatrix.tint(0xff0000, false);
      // colorMatrix.technicolor(true);
      // colorMatrix.sepia(false);
      // colorMatrix.reset();
      // colorMatrix.predator(1, false);
      // colorMatrix.polaroid(false);
      // colorMatrix.night(0.2, false);
      // colorMatrix.negative(false);
      // colorMatrix.lsd(false);
      // colorMatrix.kodachrome(true);
      // colorMatrix.browni(true);

      image.filters = [colorMatrix];

      image.roundPixels = true;

      // image.position.set(canvasWidth / 2, canvasHeight / 2);
      // image.rotation = (rotateValue * Math.PI) / 180;
      // image.position.set(-canvasWidth / 2, -canvasHeight / 2);

      image.scale.set(zoomValue, zoomValue);

      image.position.set(adjustedX, adjustedY);

      app.stage.addChild(image);
    }

    app.start(); // Start the app

    return () => {
      // The cleanup function will be called when the component unmounts
      // No need to destroy the app here, as we want to reuse it if the component mounts again
    };
  }, [
    imgSrc,
    zoomValue,
    darkMode,
    fake,
    fakeX,
    rotateValue,
    realNaturalWidth,
    realNaturalHeight,
    canvasHeight,
    canvasWidth,
    imageProperties,
  ]);

  const undoAction = useCallback(async () => {
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

    setScaleFactor(lastRotationValue.scaleFactor);

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
  }, [
    undoStack,
    setIsUndoable,
    setRotateValue,

    setScaleFactor,

    setRedoStack,
    redoStack,
  ]);

  const redoAction = useCallback(async () => {
    if (redoStack.length === 0) {
      return; // No actions to redo
    }
    setIsUndoable(false);

    // Get the last saved canvas state from the redoStack; LIFO (last in first out)
    const nextState = redoStack[0];

    // Reapply the canvas state
    setRotateValue(nextState.rotate);

    setScaleFactor(nextState.scaleFactor);
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
  }, [
    redoStack,
    setIsUndoable,
    setRotateValue,

    setScaleFactor,
    setUndoStack,
    setRedoStack,
    undoStack,
  ]);

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

  const handleReset = () => {
    setRotateValue(0);

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

  let content = <SideBar changeActive={handleModeChange} />;

  interface ImagePropertiesUpdate {
    [key: string]: {
      value?: number | undefined;
      multiply: boolean;
      enabled?: boolean | undefined;
    };
  }

  const handleEnable = (name: string) => {
    // Object is possibly undefined

    const updatedImageProperties = {
      ...imageProperties,
      [name]: {
        ...imageProperties[name as keyof ImageProperties],
        enabled:
          !imageProperties[name as keyof ImageProperties]?.enabled ?? false,
      },
    };

    setImageProperties(updatedImageProperties);
  };

  const handleMultiply = (name: string) => {
    const updatedImageProperties = {
      ...imageProperties,
      [name]: {
        ...imageProperties[name as keyof ImageProperties],
        multiply:
          !imageProperties[name as keyof ImageProperties]?.multiply ?? false,
      },
    };

    setImageProperties(updatedImageProperties);
  };

  const editModeProperties: Record<
    string,
    {
      name: keyof ImageProperties;
      enabled: boolean;
      multiply: boolean;
    }
  > = {
    sepia: {
      name: "sepia",
      enabled: imageProperties.sepia.enabled,
      multiply: imageProperties.sepia.multiply,
    },
    night: {
      name: "night",
      enabled: imageProperties.night.enabled,
      multiply: imageProperties.night.multiply,
    },
    vintage: {
      name: "vintage",
      enabled: imageProperties.vintage.enabled,
      multiply: imageProperties.vintage.multiply,
    },
    polaroid: {
      name: "polaroid",
      enabled: imageProperties.polaroid.enabled,
      multiply: imageProperties.polaroid.multiply,
    },
    kodachrome: {
      name: "kodachrome",
      enabled: imageProperties.kodachrome.enabled,
      multiply: imageProperties.kodachrome.multiply,
    },
  };

  const someComponents = [
    {
      name: "sepia",
      enabled: imageProperties.sepia.enabled,
      multiply: imageProperties.sepia.multiply,
    },
    {
      name: "night",
      enabled: imageProperties.night.enabled,
      multiply: imageProperties.night.multiply,
    },
    {
      name: "vintage",
      enabled: imageProperties.vintage.enabled,
      multiply: imageProperties.vintage.multiply,
    },
    {
      name: "polaroid",
      enabled: imageProperties.polaroid.enabled,
      multiply: imageProperties.polaroid.multiply,
    },
    {
      name: "kodachrome",
      enabled: imageProperties.kodachrome.enabled,
      multiply: imageProperties.kodachrome.multiply,
    },
    {
      name: "predator",
      enabled: imageProperties.predator.enabled,
      multiply: imageProperties.predator.multiply,
    },
  ];

  if (editingMode === "filters") {
    content = (
      <FilterBar
        changeActive={handleModeChange}
        handleEnable={handleEnable}
        handleMultiply={handleMultiply}
        components={someComponents}
      />
    );
  } else {
    content = <SideBar changeActive={handleModeChange} />;
  }

  return (
    <div>
      <nav className="fixed top-0 z-40 w-full bg-white dark:bg-[#3b3b3b] border-b border-gray-500">
        <div className="px-3 py-3 lg:px-5 lg:pl-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex md:mr-24">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
                  className="h-8 mr-3"
                  alt="PhotoProX Logo"
                />
                <span className="self-center text-black dark:text-white text-xl font-semibold sm:text-2xl whitespace-nowrap ">
                  PhotoProX
                </span>
              </Link>
            </div>
            <div className="mr-7"></div>
          </div>
        </div>
      </nav>

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
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
                    className="h-6 mr-3 sm:h-7"
                    alt="Flowbite Logo"
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
      {imgSrc && (
        <aside
          id="logo-sidebar"
          className="animate-fade animate-once animate-ease-out fixed top-0 left-[56px] z-30 w-[240px] h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-gray-500"
          aria-label="Sidebar"
        >
          <Suspense fallback={<div>Loading...</div>}>
            {editingMode === "filters" ? (
              <FilterBar
                changeActive={handleModeChange}
                handleEnable={handleEnable}
                components={someComponents}
                handleMultiply={handleMultiply}
              />
            ) : (
              <SideBar changeActive={handleModeChange} />
            )}
          </Suspense>
        </aside>
      )}

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

      <div className="p-20 sm:ml-64 ">
        <div className="">
          <PinchHandler
            setZoomValue={setZoomValue}
            setIsZooming={setIsZooming}
            target={target} // Pass the targetRef as the target
          />
          <div
            ref={target}
            className="flex items-center justify-center "
            style={{
              position: "fixed",
              top: "49%",
              left: "50%",
              transform: `translate(-50%, -50%)`,
              marginTop: "0.6rem",
              marginLeft: `${deltaWidth}px`,
              width: realNaturalWidth ? `${1410}px` : "100%",
              height: realNaturalHeight ? `${705}px` : "100%",
            }}
          >
            <canvas
              id="canvas"
              ref={canvasRef}
              className=""
              style={{
                display: "block",
                position: "absolute",
                width: realNaturalWidth ? `${1410}px` : "100%",
                height: realNaturalHeight ? `${705}px` : "100%",
                zIndex: -1,

                // backgroundImage:
                //   "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
                // backgroundSize: "10px 10px",
                // backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
              }}
            ></canvas>

            <img style={{ display: "none" }} src={imgSrc} ref={imgRef}></img>

            {editingMode === "crop" && (
              <div>Hello</div>
              //   <Cropping
              //     image={newImgSrc}
              //     scaledWidth={naturalWidth}
              //     scaledHeight={naturalHeight}
              //   />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
