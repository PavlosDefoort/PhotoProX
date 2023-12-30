import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import dynamic from "next/dynamic";
import Decimal from "decimal.js";
import Image from "next/image";
import TopBar from "./UI/topbar";
import ToolBar from "./UI/toolbar";
import BottomBar from "./UI/bottombar";
import ApplyCanvas from "@/components/Editor/PhotoEditor/applyCanvas";
import PinchHandler from "./pinchLogic";
import { EditorProject } from "@/utils/interfaces";
import {
  Application,
  Container,
  DisplayObject,
  Graphics,
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
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  DotFilledIcon,
  CheckIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import { ConstructionIcon } from "lucide-react";
import { useProjectContext } from "@/pages/editor";
import LayerBar from "./UI/layerbar";

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
  const [canvasWidth, setCanvasWidth] = useState(8000);
  const [canvasHeight, setCanvasHeight] = useState(4000);
  const { darkMode } = useContext(ThemeContext);
  const [undoStack, setUndoStack] = useState<Stack>([]);
  const [redoStack, setRedoStack] = useState<Stack>([]);
  const [isUndoable, setIsUndoable] = useState(true);
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
  const [imgName, setImgName] = useState("");
  const [bookmarksChecked, setBookmarksChecked] = React.useState(true);
  const [urlsChecked, setUrlsChecked] = React.useState(false);
  const [person, setPerson] = React.useState("pedro");

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
  const spriteRefs = useRef<Sprite[]>([]);
  const containerRef = useRef<Container | null>(null);
  const maskRef = useRef<Graphics | null>(null);
  const imgRef = useRef(null);
  const target = useRef<HTMLDivElement | null>(null);
  const [windowHeight, setWindowHeight] = useState(0);
  const { project, setProject } = useProjectContext();

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);
  }, [windowWidth, windowHeight]);

  useEffect(() => {
    const calculateDeltaWidth = () => {
      const x = (windowWidth - 592) / 2;

      const delta = windowWidth / 2 - 148;

      const changeInWidth = delta - x;

      setDeltaWidth(changeInWidth);
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
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

        // // Adjust the width and height based on the rotation (absolute rotation matrix)
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
        const moveSpeed = 2;
        const deltaX = -event.deltaX * moveSpeed;
        const deltaY = -event.deltaY * moveSpeed;
        const halfHeight = (newHeight * scaleY * zoomValue) / 2;
        const halfWidth = (newWidth * scaleX * zoomValue) / 2;
        // Restrict to the canvas size
        let newY: number;
        let newX: number;
        if (newWidth * zoomValue < canvasWidth) {
          newX = clamp(
            fakeX + deltaX,
            -(maxOffsetLimitX + halfWidth),
            maxOffsetLimitX + halfWidth
          );
        } else {
          newX = clamp(fakeX + deltaX, -halfWidth, halfWidth);
        }

        if (newHeight * zoomValue < canvasHeight) {
          newY = clamp(
            fakeY + deltaY,
            -(maxOffsetLimitY + halfHeight),
            maxOffsetLimitY + halfHeight
          );
        } else {
          newY = clamp(deltaY + fakeY, -halfHeight, halfHeight);
        }
        setFakeX(newX);
        setFakeY(newY);
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
    spriteRefs,
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
    containerRef,
    maskRef,
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
        app.renderer.background.color = 0x1e1e1e;
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

  type FilterElement = {
    name: string;
    enabled: boolean;
    multiply: boolean;
    filterIcon: JSX.Element;
    background: string;
  };

  const handleFilterReset = (component: FilterElement[]) => {
    const updatedImageProperties = {
      ...imageProperties,
    };
    for (const property of component) {
      updatedImageProperties[property.name].enabled = property.enabled;
      updatedImageProperties[property.name].multiply = property.multiply;
    }
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
          setComponents={handleFilterReset}
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

  useEffect(() => {
    const factor = 5;
    const adjustWidth = (window.innerWidth - 80) * factor;
    const adjustHeight = (window.innerHeight - 40) * factor;
    setCanvasWidth(adjustWidth);
    setCanvasHeight(adjustHeight);
  }, [windowWidth, windowHeight]);

  useEffect(() => {
    if (project) {
      project.renameProject(fileName, setProject);
    }
  }, [fileName]);

  return (
    <div>
      <TopBar
        imgName={imgName}
        setFileName={setImgName}
        zoomValue={zoomValue.toFixed(2)}
        width={realNaturalWidth}
        height={realNaturalHeight}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        setZoomValue={setZoomValue}
        setFakeX={setFakeX}
        setFakeY={setFakeY}
        rotateValue={rotateValue}
        scaleX={scaleX}
        scaleY={scaleY}
      />
      {imgSrc && (
        <div>
          <ToolBar
            imgSrc={imgSrc}
            downloadImage={handleDownload}
            toggleThirds={handleThirds}
          />
          <LayerBar
            imgSrc={imgSrc}
            downloadImage={handleDownload}
            toggleThirds={handleThirds}
          />
        </div>
      )}

      {/* {imgSrc && (
        <aside
          id="logo-sidebar"
          className="animate-fade animate-once animate-ease-out fixed top-0 left-[40px] z-30 w-[240px] h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-gray-500"
          aria-label="Sidebar"
        >
          {content}
        </aside>
      )} */}

      {rendering && (
        <Dialog open={rendering}>
          <DialogContentText id="render-dialog">
            Rendering Image...
          </DialogContentText>
        </Dialog>
      )}

      <ContextMenu.Root>
        <ContextMenu.Trigger className="">
          <div className=" ">
            <div className="">
              <PinchHandler
                setZoomValue={setZoomValue}
                setIsZooming={setIsZooming}
                target={target} // Pass the targetRef as the target
              />
              <div
                id="stage-container"
                ref={target}
                className="flex items-center justify-center "
                style={{
                  position: "fixed",
                  top: `calc(50% + 18px)`,
                  left: `calc(50%)`,
                  transform: `translate(-50%, -50%)`,
                  width: realNaturalWidth ? `${windowWidth - 80}px` : "100%",
                  height: realNaturalHeight ? `${windowHeight - 40}px` : "100%",
                }}
              >
                <canvas
                  id="canvas"
                  ref={canvasRef}
                  className=""
                  style={{
                    display: "block",
                    position: "absolute",
                    width: realNaturalWidth ? `${windowWidth - 80}px` : "100%",
                    height: realNaturalHeight
                      ? `${windowHeight - 40}px`
                      : "100%",
                    zIndex: -1,
                  }}
                ></canvas>
              </div>
            </div>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            className="min-w-[220px] bg-navbarBackground dark:bg-navbarBackground rounded-md overflow-hidden p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]"
            // sideOffset={5}
            // align="end"
          >
            <ContextMenu.Item
              className="group text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1"
              onClick={() =>
                project?.removeLayer(
                  project.target!.id,
                  setProject,
                  project.container
                )
              }
            >
              Copy{" "}
              <div className="ml-auto pl-5 text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                Ctrl+C
              </div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="group text-[13px] leading-none text-violet11  rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1"
              disabled
            >
              Paste{" "}
              <div className="ml-auto pl-5 text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                Ctrl+V
              </div>
            </ContextMenu.Item>
            <ContextMenu.Item className="group text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1">
              Reload{" "}
              <div className="ml-auto pl-5 text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                ⌘+R
              </div>
            </ContextMenu.Item>
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="group text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[state=open]:bg-violet4 dark:data-[state=open]:bg-violet9 data-[state=open]:text-violet11 data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1 data-[highlighted]:data-[state=open]:bg-violet9 data-[highlighted]:data-[state=open]:text-violet1">
                More Tools
                <div className="ml-auto pl-5 text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                  <ChevronRightIcon />
                </div>
              </ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent
                  className="min-w-[220px] bg-navbarBackground dark:bg-navbarBackground rounded-md overflow-hidden p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]"
                  sideOffset={2}
                  alignOffset={-5}
                >
                  <ContextMenu.Item className="group text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1">
                    Save Page As…{" "}
                    <div className="ml-auto pl-5 text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                      ⌘+S
                    </div>
                  </ContextMenu.Item>
                  <ContextMenu.Item className="text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1">
                    Create Shortcut…
                  </ContextMenu.Item>
                  <ContextMenu.Item className="text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1">
                    Name Window…
                  </ContextMenu.Item>
                  <ContextMenu.Separator className="h-[1px] bg-violet6 m-[5px]" />
                  <ContextMenu.Item className="text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1">
                    Developer Tools
                  </ContextMenu.Item>
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>

            <ContextMenu.Separator className="h-[1px] bg-violet6 m-[5px]" />

            <ContextMenu.CheckboxItem
              className="group text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1"
              checked={bookmarksChecked}
              onCheckedChange={setBookmarksChecked}
            >
              <ContextMenu.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
                <CheckIcon />
              </ContextMenu.ItemIndicator>
              Show Bookmarks{" "}
              <div className="ml-auto pl-5 text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                ⌘+B
              </div>
            </ContextMenu.CheckboxItem>
            <ContextMenu.CheckboxItem
              className="text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1"
              checked={urlsChecked}
              onCheckedChange={setUrlsChecked}
            >
              <ContextMenu.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
                <CheckIcon />
              </ContextMenu.ItemIndicator>
              Show Full URLs
            </ContextMenu.CheckboxItem>

            <ContextMenu.Separator className="h-[1px] bg-violet6 m-[5px]" />

            <ContextMenu.Label className="pl-[25px] text-xs leading-[25px] text-mauve11 dark:text-mauve8">
              People
            </ContextMenu.Label>
            <ContextMenu.RadioGroup value={person} onValueChange={setPerson}>
              <ContextMenu.RadioItem
                className="text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1"
                value="pedro"
              >
                <ContextMenu.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
                  <DotFilledIcon />
                </ContextMenu.ItemIndicator>
                Pedro Duarte
              </ContextMenu.RadioItem>
              <ContextMenu.RadioItem
                className="text-[13px] leading-none text-violet11 dark:text-violet3 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1"
                value="colm"
              >
                <ContextMenu.ItemIndicator className="absolute left-0 w-[25px] inline-flex items-center justify-center">
                  <DotFilledIcon />
                </ContextMenu.ItemIndicator>
                Colm Tuite
              </ContextMenu.RadioItem>
            </ContextMenu.RadioGroup>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
};

export default PhotoEditor;
