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
import { Application } from "pixi.js";
import { ThemeContext } from "../../ThemeProvider/themeprovider";
import {
  WidthRotate,
  HeightRotate,
  clamp,
  calculateZoomPan,
} from "@/utils/calcUtils";
import { Newsreader } from "next/font/google";

const SideBar = dynamic(() => import("./UI/sidebar"), {
  loading: () => <p>loading</p>,
});
const FilterBar = dynamic(() => import("./UI/filterbar"), {
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
          realNaturalWidth,
          realNaturalHeight,
          rotateValue
        );

        const newHeight = HeightRotate(
          realNaturalWidth,
          realNaturalHeight,
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
  });

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

  const previousZoomRef = useRef(zoomValue);
  const previousFakeRef = useRef(fakeY);
  const previousFakeXRef = useRef(fakeX);

  useEffect(() => {
    if (previousZoomRef.current > zoomValue) {
      // Zoom Out: Set the offset proportionally to the zoom level
      //(only if the zoom level is less than 1 to avoid growing the offset indefinitely)
      if (zoomValue < 1) {
        setFakeY(previousFakeRef.current * zoomValue);
        setFakeX(previousFakeXRef.current * zoomValue);
      }
    }

    // Update the previous values with the current values for the next iteration
    previousZoomRef.current = zoomValue;
    previousFakeRef.current = fakeY;
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

  return (
    <div>
      <TopBar />
      <ToolBar imgSrc={imgSrc} />
      {imgSrc && (
        <aside
          id="logo-sidebar"
          className="animate-fade animate-once animate-ease-out fixed top-0 left-[56px] z-30 w-[240px] h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-gray-500"
          aria-label="Sidebar"
        >
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
