import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import TopBar from "./UI/topbar";
import ToolBar from "./UI/toolbar";
import BottomBar from "./UI/bottombar";
import ApplyCanvas from "@/components/Editor/PhotoEditor/applyCanvas";
import PinchHandler from "./pinchLogic";
import {
  Application,
  Container,
  DisplayObject,
  Prepare,
  Sprite,
  autoDetectRenderer,
} from "pixi.js";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import BedtimeIcon from "@mui/icons-material/Bedtime";
import FilterVintageIcon from "@mui/icons-material/FilterVintage";
import CameraEnhanceIcon from "@mui/icons-material/CameraEnhance";
import WarningIcon from "@mui/icons-material/Warning";
import AlarmIcon from "@mui/icons-material/Alarm";
import LooksIcon from "@mui/icons-material/Looks";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import TagFacesIcon from "@mui/icons-material/TagFaces";

import { ThemeContext } from "../../ThemeProvider/themeprovider";
import {
  WidthRotate,
  HeightRotate,
  clamp,
  calculateZoomPan,
  fitImageToScreen,
  calculateMaxScale,
} from "@/utils/calcUtils";
import { Newsreader } from "next/font/google";
import { set } from "lodash";

const SideBar = dynamic(() => import("./UI/sidebar"), {
  loading: () => <p>loading</p>,
});
const FilterBar = dynamic(() => import("./UI/filterbar"), {
  loading: () => <p>loading</p>,
});

const RotateBar = dynamic(() => import("./UI/rotatebar"), {
  loading: () => <p>loading</p>,
});

const ResizeBar = dynamic(() => import("./UI/resizebar"), {
  loading: () => <p>loading</p>,
});

interface PhotoEditorProps {
  imageData: string;
  realNaturalWidth: number;
  realNaturalHeight: number;
  fileName: string;
  fileSize: number;
}

type StackElement = {
  rotate: number;
  translateX: number;
  translateY: number;
  scaleFactor: number;
  skewX: number;
  skewY: number;
  saturation: number;
  brightness: number;
  opacity: number;
};

type Stack = StackElement[];

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  // Add a canvasWidth and height global state to optimize resolution
  const [canvasWidth, setCanvasWidth] = useState(2800);
  const [canvasHeight, setCanvasHeight] = useState(1400);
  const { darkMode } = useContext(ThemeContext);
  const [undoStack, setUndoStack] = useState<Stack>([]);
  const [redoStack, setRedoStack] = useState<Stack>([]);
  const [isUndoable, setIsUndoable] = useState(true);
  const [maxUndoStackSize, setMaxUndoStackSize] = useState(100);
  const [zoomValue, setZoomValue] = useState(1);
  const [previousZoom, setPreviousZoom] = useState(zoomValue);
  const [isZooming, setIsZooming] = useState(false);
  const [fakeY, setFakeY] = useState(0);
  const [fakeX, setFakeX] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [showThirds, setShowThirds] = useState(false);
  const [scaleXSign, setScaleXSign] = useState(1);
  const [scaleYSign, setScaleYSign] = useState(1);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [useRatio, setUseRatio] = useState(true);

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
  const [firstLoad, setFirstLoad] = useState(true);
  const appRef = useRef<Application | null>(null);
  const spriteRef = useRef<Sprite | null>(null);
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
    const roundedScale = fitImageToScreen(
      realNaturalWidth * scaleX,
      realNaturalHeight * scaleY,
      canvasWidth,
      canvasHeight,
      rotateValue
    );
    setZoomValue(clamp(roundedScale, 0.1, 4));
    // wait 1 second for the zoom to finish
    setTimeout(() => {
      setFakeX(0);
      setFakeY(0);
    }, 20);
  };

  const handleThirds = () => {
    setShowThirds(!showThirds);
  };

  // Make a function to let the user drag on the canvas to move the image

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
    canvas.addEventListener("wheel", handleWheel, { passive: false });

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
    const fitToScreen = fitImageToScreen(
      realNaturalWidth * scaleX,
      realNaturalHeight * scaleY,
      canvasWidth,
      canvasHeight,
      rotateValue
    );
    // setZoomValue(clamp(fitToScreen, 0.1, 4));
  };

  const handleDownload = async () => {
    // Make the function asynchronous, to deal with the promise of the toDataURL method
    if (spriteRef.current) {
      setRendering(true);

      // Get the sprite as reference
      const image = spriteRef.current;

      // Get the width of the rotated image
      const rotatedWidth = WidthRotate(
        realNaturalWidth * scaleX,
        realNaturalHeight * scaleY,
        rotateValue
      );

      // Get the height of the rotated image
      const rotatedHeight = HeightRotate(
        realNaturalWidth * scaleX,
        realNaturalHeight * scaleY,
        rotateValue
      );

      // Height and width technically does not need to be set due to the reference, but it is good practice to do so
      image.width = realNaturalWidth;
      image.height = realNaturalHeight;

      // Scale the image to fit the canvas
      image.scale.set(scaleX * scaleXSign, scaleY * scaleYSign);

      // Rotate the image
      image.angle = rotateValue;

      // Set the origin to the middle of the image
      image.anchor.set(0.5);

      // The pivot is about the origin, which is now in the middle of the image
      image.pivot.set(0, 0);

      // Position the image in the center of the canvas
      image.position.set(rotatedWidth / 2, rotatedHeight / 2);

      // Create a renderer, with the best performance settings
      const renderer = autoDetectRenderer({
        width: rotatedWidth,
        height: rotatedHeight,
        powerPreference: "high-performance",
        antialias: true,
        resolution: 1,
        backgroundAlpha: 0,
      });

      // Create a container object, that will hold the image
      const container = new Container();

      // Add the image to the container, the container will inherit the filters from the image
      container.addChild(image);

      // Render the container
      renderer.render(container);

      // Get the image as base64 data url using async/await
      const base64 = await renderer.extract.base64();
      setRendering(false);

      // Alternatively, you can use .then() instead of async/await
      // renderer.extract.base64().then(base64 => { ... });

      // Create a link
      const link = document.createElement("a");
      // Set link's href to point to the Base64 URL
      link.href = base64;
      link.download = "image.png";

      // Simulate a click on the link to trigger the download
      link.click();

      // Destroy the renderer object to free up resources
      renderer.destroy();
      // Destroy the container object to free up resources
      container.destroy();

      const app = appRef.current!;
      // Add the child to the stage, the container took it from the image
      image.anchor.set(0);
      app.stage.addChild(image);

      const scale = fitImageToScreen(
        realNaturalWidth,
        realNaturalHeight,
        canvasWidth,
        canvasHeight,
        rotateValue
      );

      // Cheap tricks to force a re-render of the canvas
      setZoomValue(scale + 0.00001);
    }
  };

  useEffect(() => {}, [rendering]);

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
        const newWidth = WidthRotate(
          realNaturalWidth * scaleX,
          realNaturalHeight * scaleY,
          rotateValue
        );

        const newHeight = HeightRotate(
          realNaturalWidth * scaleX,
          realNaturalHeight * scaleY,
          rotateValue
        );

        const maxOffsetLimitY = Math.abs(
          (newHeight * zoomValue - canvasHeight) / 2
        );
        const maxOffsetLimitX = Math.abs(
          (newWidth * zoomValue - canvasWidth) / 2
        );

        // Calculate the maximum vertical offset based on the zoom level (prevent scrolling past the edges of the image)
        const maxVerticalOffset = clamp(
          newHeight * zoomValue - canvasHeight,
          0,
          maxOffsetLimitY
        );

        const maxHorizontalOffset = clamp(
          newWidth * zoomValue - canvasWidth,
          0,
          maxOffsetLimitX
        );

        const zoomSpeed = 100; // Adjust the zoom speed as needed
        const deltaY = -event.deltaY; // Get the direction of the vertical scroll (negative to zoom in, positive to zoom out)
        const deltaX = -event.deltaX; // Get the direction of the horizontal scroll (negative to pan left, positive to pan right)
        const zoomY = deltaY > 0 ? zoomSpeed : -zoomSpeed;
        const zoomX = deltaX > 0 ? zoomSpeed : -zoomSpeed;
        let newScaleFactorY = fakeY;
        let newScaleFactorX = fakeX;

        const factors = calculateZoomPan(
          deltaY,
          deltaX,
          newScaleFactorX,
          newScaleFactorY,
          fakeX,
          fakeY,
          zoomX,
          zoomY,
          maxHorizontalOffset,
          maxVerticalOffset
        );

        setFakeY(factors.newScaleFactorY);
        setFakeX(factors.newScaleFactorX);
      }
    };

    const canvas = canvasRef.current!;

    canvas.addEventListener("wheel", handleScroll, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleScroll);
    };
  }, [
    fakeY,
    fakeX,
    isZooming,
    zoomValue,
    realNaturalHeight,
    realNaturalWidth,
    rotateValue,
    canvasWidth,
    canvasHeight,
    scaleX,
    scaleY,
  ]);

  ApplyCanvas({
    canvasRef,
    imgSrc,
    zoomValue,
    darkMode,
    fakeY,
    fakeX,
    rotateValue,
    realNaturalWidth,
    realNaturalHeight,
    canvasHeight,
    canvasWidth,
    imageProperties,
    appRef,
    spriteRef,
    showThirds,
    scaleXSign,
    scaleYSign,
    scaleX,
    scaleY,
  });

  useEffect(() => {
    const newZoom = fitImageToScreen(
      realNaturalWidth * scaleX,
      realNaturalHeight * scaleY,
      canvasWidth,
      canvasHeight,
      rotateValue
    );
    // setZoomValue(clamp(newZoom, 0.1, 4));
  }, [
    scaleX,
    scaleY,
    canvasHeight,
    canvasWidth,
    rotateValue,
    realNaturalHeight,
    realNaturalWidth,
  ]);

  useEffect(() => {
    // set the image source to the imageData prop

    setImgSrc(imageData);
    const maxScale = calculateMaxScale(realNaturalWidth, realNaturalHeight);
    let scale;
    if (firstLoad && maxScale < 1) {
      setScaleX(maxScale);
      setScaleY(maxScale);
    }

    scale = fitImageToScreen(
      realNaturalWidth * (firstLoad && maxScale < 1 ? maxScale : scaleX),
      realNaturalHeight * (firstLoad && maxScale < 1 ? maxScale : scaleY),
      canvasWidth,
      canvasHeight,
      rotateValue
    );

    setZoomValue(clamp(scale, 0.1, 4));

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
      setFirstLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageData,
    realNaturalWidth,
    realNaturalHeight,
    rotateValue,
    fileName,
    fileSize,
    canvasWidth,
    canvasHeight,
    firstLoad,
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

  const previousZoomRef = useRef(zoomValue);
  const previousFakeYRef = useRef(fakeY);
  const previousFakeXRef = useRef(fakeX);

  useEffect(() => {
    if (previousZoomRef.current > zoomValue) {
      // Zoom Out: Set the offset proportionally to the zoom level
      //(only if the zoom level is less than 1 to avoid growing the offset indefinitely)
      if (zoomValue < 1) {
        setFakeY(previousFakeYRef.current * zoomValue);
        setFakeX(previousFakeXRef.current * zoomValue);
      }
    }

    // Update the previous values with the current values for the next iteration
    previousZoomRef.current = zoomValue;
    previousFakeYRef.current = fakeY;
    previousFakeXRef.current = fakeX;
  }, [zoomValue, fakeY, fakeX]);

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

  const handleZoomIn = () => {
    const newZoomValue = Math.min(zoomValue * 2, 4); // Zoom in by doubling the value, limit to a maximum of 4
    setZoomValue(newZoomValue);
  };

  const handleZoomOut = () => {
    const newZoomValue = Math.max(zoomValue / 2, 0.1); // Zoom out by halving the value, limit to a minimum of 0.1
    setZoomValue(newZoomValue);
  };

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
  const someComponents = [
    {
      name: "sepia",
      enabled: imageProperties.sepia.enabled,
      multiply: imageProperties.sepia.multiply,
      filterIcon: <AlarmIcon />,
      background: "yellow",
    },
    {
      name: "night",
      enabled: imageProperties.night.enabled,
      multiply: imageProperties.night.multiply,
      filterIcon: <BedtimeIcon />,
      background: "purple",
    },
    {
      name: "vintage",
      enabled: imageProperties.vintage.enabled,
      multiply: imageProperties.vintage.multiply,
      filterIcon: <FilterVintageIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "polaroid",
      enabled: imageProperties.polaroid.enabled,
      multiply: imageProperties.polaroid.multiply,
      filterIcon: <CameraEnhanceIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "kodachrome",
      enabled: imageProperties.kodachrome.enabled,
      multiply: imageProperties.kodachrome.multiply,
      filterIcon: <LooksIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "predator",
      enabled: imageProperties.predator.enabled,
      multiply: imageProperties.predator.multiply,
      filterIcon: <WarningIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "lsd",
      enabled: imageProperties.lsd.enabled,
      multiply: imageProperties.lsd.multiply,
      filterIcon: <PsychologyIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "technicolor",
      enabled: imageProperties.technicolor.enabled,
      multiply: imageProperties.technicolor.multiply,
      filterIcon: <TagFacesIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "browni",
      enabled: imageProperties.browni.enabled,
      multiply: imageProperties.browni.multiply,
      filterIcon: <LocalFireDepartmentIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "toBGR",
      enabled: imageProperties.toBGR.enabled,
      multiply: imageProperties.toBGR.multiply,
      filterIcon: <AcUnitIcon />,
      background: "bg-yellow-500",
    },
    {
      name: "negative",
      enabled: imageProperties.negative.enabled,
      multiply: imageProperties.negative.multiply,
      filterIcon: <RemoveCircleOutlineIcon />,
      background: "blue",
    },
  ];

  let content = <SideBar changeActive={handleModeChange} />;
  // Create switch statement to render the correct component based on editingMode
  switch (editingMode) {
    case "rotate":
      content = (
        <RotateBar
          changeActive={handleModeChange}
          setRotateValue={setRotateValue}
          rotateValue={rotateValue}
          setScaleXSign={setScaleXSign}
          setScaleYSign={setScaleYSign}
          scaleXSign={scaleXSign}
          scaleYSign={scaleYSign}
        />
      );
      break;
    case "filters":
      content = (
        <FilterBar
          changeActive={handleModeChange}
          handleEnable={handleEnable}
          components={someComponents}
          handleMultiply={handleMultiply}
        />
      );
      break;
    case "resize":
      content = (
        <ResizeBar
          changeActive={handleModeChange}
          setScaleX={setScaleX}
          setScaleY={setScaleY}
          scaleX={scaleX}
          scaleY={scaleY}
          imageWidth={realNaturalWidth}
          imageHeight={realNaturalHeight}
          useRatio={useRatio}
          setUseRatio={setUseRatio}
        />
      );
      break;
    default:
      content = <SideBar changeActive={handleModeChange} />;
  }
  interface ImagePosition {
    x: number;
    y: number;
  }
  const [startPosition, setStartPosition] = useState<ImagePosition>({
    x: 0,
    y: 0,
  });
  const [isInsideImage, setIsInsideImage] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (isInsideImage) {
      canvas.style.cursor = isDragging ? "grabbing" : "grab";
    } else {
      canvas.style.cursor = "default";
    }
  }, [isInsideImage, isDragging]);

  const draggingSpeed = 2;
  useEffect(() => {
    const canvas = canvasRef.current!;
    const handleMouseMove = (e: MouseEvent) => {
      // Check if the user is on the image and not just on the canvas
      const canvasRect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - canvasRect.left;
      const canvasY = e.clientY - canvasRect.top;
      // Check if the mouse is inside the image

      const sprite = spriteRef.current!;

      const rangeX = sprite.position.x / 2;
      const rangeY = sprite.position.y / 2;
      const rotatedWidth = WidthRotate(
        realNaturalWidth * zoomValue * scaleX,
        realNaturalHeight * zoomValue * scaleY,
        rotateValue
      );
      const rotatedHeight = HeightRotate(
        realNaturalWidth * zoomValue * scaleX,
        realNaturalHeight * zoomValue * scaleY,
        rotateValue
      );
      const adjustedX = rotatedWidth / 4;
      const adjustedY = rotatedHeight / 4;

      const isInsideImage =
        canvasX >= rangeX - adjustedX &&
        canvasX <= rangeX + adjustedX &&
        canvasY >= rangeY - adjustedY &&
        canvasY <= rangeY + adjustedY;
      setIsInsideImage(isInsideImage);

      if (!isInsideImage) {
        canvas.style.cursor = "default"; // Not on the image
        return;
      }

      if (isDragging) {
        const offsetX = (e.clientX - startPosition.x) * draggingSpeed;
        const offsetY = (e.clientY - startPosition.y) * draggingSpeed;
        setFakeX(fakeX + offsetX);
        setFakeY(fakeY + offsetY);
        setStartPosition({ x: e.clientX, y: e.clientY });
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [
    isDragging,
    fakeX,
    fakeY,
    startPosition,
    realNaturalWidth,
    zoomValue,
    scaleX,
    scaleY,
    realNaturalHeight,
    rotateValue,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setStartPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div>
      <TopBar />
      <ToolBar
        imgSrc={imgSrc}
        downloadImage={handleDownload}
        toggleThirds={handleThirds}
      />
      {imgSrc && (
        <aside
          id="logo-sidebar"
          className="animate-fade animate-once animate-ease-out fixed top-0 left-[56px] z-30 w-[240px] h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-gray-500"
          aria-label="Sidebar"
        >
          {content}
        </aside>
      )}
      <BottomBar
        zoomValue={zoomValue}
        imgSrc={imgSrc}
        setZoomValue={setZoomValue}
        handleFitToScreen={handleFitToScreen}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
      />

      {rendering && (
        <Dialog open={rendering}>
          <DialogContentText id="render-dialog">
            Rendering Image...
          </DialogContentText>
        </Dialog>
      )}

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
              cursor: "default",
            }}
          >
            <canvas
              id="canvas"
              ref={canvasRef}
              className=""
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
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
            {/* {imgSrc && (
              <Image
                style={{ display: "none" }}
                src={imgSrc}
                ref={imgRef}
                alt="Image"
                width={1410}
                height={705}
              ></Image>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
