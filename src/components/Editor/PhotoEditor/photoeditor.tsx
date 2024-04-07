import dynamic from "next/dynamic";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ReactZoomPanPinchContentRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import TopBar from "./UI/topbar";

import ApplyCanvas from "@/components/Editor/PhotoEditor/applyCanvas";
import { ImageData, ImageLayer } from "@/utils/editorInterfaces";

import {
  HeightRotate,
  WidthRotate,
  calculateMaxScale,
  clamp,
  fitImageToScreen,
} from "@/utils/calcUtils";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import AlarmIcon from "@mui/icons-material/Alarm";
import BedtimeIcon from "@mui/icons-material/Bedtime";
import CameraEnhanceIcon from "@mui/icons-material/CameraEnhance";
import FilterVintageIcon from "@mui/icons-material/FilterVintage";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import LooksIcon from "@mui/icons-material/Looks";
import PsychologyIcon from "@mui/icons-material/Psychology";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import TagFacesIcon from "@mui/icons-material/TagFaces";
import WarningIcon from "@mui/icons-material/Warning";
import {
  Application,
  Container,
  Graphics,
  Sprite,
  autoDetectRenderer,
} from "pixi.js";
import { ThemeContext } from "../../ThemeProvider/themeprovider";

import { useProjectContext } from "@/pages/editor";
import { uploadLayer } from "../../../../app/firebase";
import LayerBar from "./UI/layerbar";

import { GetInfo } from "@/components/getinfo";
import { TierResult } from "detect-gpu";
import { Draft } from "immer";
import { useAuth } from "../../../../app/authcontext";
import ImageSelector from "../ImageSelect/imageselector";
import CreateProject from "./UI/createProject";
import TopBarTwo from "./UI/transformbar";

const SideBar = dynamic(() => import("./UI/sidebar"), {
  loading: () => <p>loading</p>,
});

const FilterBar = dynamic(() => import("./UI/filterbar"), {
  loading: () => <p>loading</p>,
});

const ToolBar = dynamic(() => import("./UI/toolbar"));

const RotateBar = dynamic(() => import("./UI/rotatebar"), {
  loading: () => <p>loading</p>,
});

const ResizeBar = dynamic(() => import("./UI/resizebar"), {
  loading: () => <p>loading</p>,
});

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

const PhotoEditor: React.FC = () => {
  const [editingMode, setEditingMode] = useState("");
  const [windowWidth, setWindowWidth] = useState(0);
  const [deltaWidth, setDeltaWidth] = useState(0);
  const [fitToScreen, setFitToScreen] = useState(0);
  const [imgSrc, setImgSrc] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [toolBarLength, setToolBarLength] = useState(40);
  const [layerBarLength, setLayerBarLength] = useState(160);
  const [topBarLength, setTopBarLength] = useState(40);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);

  // Add a canvasWidth and height global state to optimize resolution
  const [canvasWidth, setCanvasWidth] = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1000);
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
  const [bookmarksChecked, setBookmarksChecked] = useState(true);
  const [urlsChecked, setUrlsChecked] = useState(false);
  const [person, setPerson] = useState("pedro");

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
  const { project, setProject, trigger, setTrigger, loading, setLoading } =
    useProjectContext();

  const realNaturalWidth = useRef(project.settings.canvasSettings.width);
  const realNaturalHeight = useRef(project.settings.canvasSettings.height);
  const [mode, setMode] = useState("view");

  useEffect(() => {
    if (
      project.settings.canvasSettings.width != null &&
      project.settings.canvasSettings.height != null
    ) {
      realNaturalWidth.current = project.settings.canvasSettings.width;
      realNaturalHeight.current = project.settings.canvasSettings.height;
    }
  }, [
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
  ]);

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
    const stageContainer = document.getElementById("stage-container");
    const handleResize = () => {
      if (stageContainer) {
        setWindowWidth(stageContainer.clientWidth);
        setWindowHeight(stageContainer.clientHeight);
      }
    };

    // Check if the element exists before adding the event listener
    if (stageContainer) {
      // Create a new ResizeObserver instance
      const resizeObserver = new ResizeObserver(handleResize);

      // Start observing the target element
      resizeObserver.observe(stageContainer);

      // Stop observing on cleanup
      return () => {
        resizeObserver.unobserve(stageContainer);
      };
    }
  }, [windowWidth]);

  const handleFitToScreen = () => {
    const roundedScale = fitImageToScreen(
      realNaturalWidth.current * scaleX,
      realNaturalHeight.current * scaleY,
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
  // useEffect(() => {
  //   if (project) {
  //     // Take the first 20 characters of the file name
  //     const first20 = fileName.slice(0, 20);

  //     setProject((draft) => {
  //       draft.settings.name = first20;
  //     });
  //   }
  // }, [fileName]);

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
      realNaturalWidth.current * scaleX,
      realNaturalHeight.current * scaleY,
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
        realNaturalWidth.current * scaleX,
        realNaturalHeight.current * scaleY,
        rotateValue
      );

      // Get the height of the rotated image
      const rotatedHeight = HeightRotate(
        realNaturalWidth.current * scaleX,
        realNaturalHeight.current * scaleY,
        rotateValue
      );

      // Height and width technically does not need to be set due to the reference, but it is good practice to do so
      image.width = realNaturalWidth.current;
      image.height = realNaturalHeight.current;

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
        realNaturalWidth.current,
        realNaturalHeight.current,
        canvasWidth,
        canvasHeight,
        rotateValue
      );

      // Cheap tricks to force a re-render of the canvas
      setZoomValue(scale + 0.00001);
    }
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

        // // Adjust the width and height based on the rotation (absolute rotation matrix)
        const newWidth = WidthRotate(
          realNaturalWidth.current * scaleX,
          realNaturalHeight.current * scaleY,
          rotateValue
        );

        const newHeight = HeightRotate(
          realNaturalWidth.current * scaleX,
          realNaturalHeight.current * scaleY,
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
    rotateValue,
    canvasWidth,
    canvasHeight,
    scaleX,
    scaleY,
  ]);

  ApplyCanvas({
    spriteRefs,
    canvasRef,
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
    setPositionX,
    setPositionY,
    trigger,
    mode,
  });

  useEffect(() => {
    const newZoom = fitImageToScreen(
      realNaturalWidth.current * scaleX,
      realNaturalHeight.current * scaleY,
      canvasWidth,
      canvasHeight,
      rotateValue
    );
    // setZoomValue(clamp(newZoom, 0.1, 4));
  }, [scaleX, scaleY, canvasHeight, canvasWidth, rotateValue]);

  useEffect(() => {
    // set the image source to the imageData prop

    // setImgSrc(imageData);
    const maxScale = calculateMaxScale(
      realNaturalWidth.current,
      realNaturalHeight.current
    );
    let scale;
    if (firstLoad && maxScale < 1) {
      setScaleX(maxScale);
      setScaleY(maxScale);
    }

    scale = fitImageToScreen(
      realNaturalWidth.current *
        (firstLoad && maxScale < 1 ? maxScale : scaleX),
      realNaturalHeight.current *
        (firstLoad && maxScale < 1 ? maxScale : scaleY),
      canvasWidth,
      canvasHeight,
      rotateValue
    );
    const newZoom = clamp(scale, 0.1, 4);

    setZoomValue(newZoom);
    if (transformRef.current) {
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    realNaturalWidth.current,
    realNaturalHeight.current,
    rotateValue,

    canvasWidth,
    canvasHeight,
    firstLoad,
  ]);

  useEffect(() => {
    const calculateAspectRatioFit = () => {
      const targetRatio = realNaturalWidth.current / realNaturalHeight.current;
      let newWidth, newHeight;

      if (realNaturalWidth.current / realNaturalHeight.current > targetRatio) {
        newWidth = realNaturalHeight.current * targetRatio;
        newHeight = realNaturalHeight.current;
      } else {
        newWidth = realNaturalWidth.current;
        newHeight = realNaturalWidth.current / targetRatio;
      }

      // setCanvasWidth(newWidth);
      // setCanvasHeight(newHeight);
      // const app = appRef.current!;
      // (newWidth, newHeight);
      // if (app) app.renderer.resize(newWidth, newHeight);
    };
    calculateAspectRatioFit();
  }, []);

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
    darkMode;

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
          imageWidth={realNaturalWidth.current}
          imageHeight={realNaturalHeight.current}
          useRatio={useRatio}
          setUseRatio={setUseRatio}
        />
      );
      break;
    default:
      content = <SideBar changeActive={handleModeChange} />;
  }

  const [userGPU, setUserGPU] = useState<Object>({});
  const [gpuFactor, setGpuFactor] = useState(1);

  useEffect(() => {
    if (project.layerManager.layers.length > 0) {
      const adjustWidth = (windowWidth ? windowWidth : 0) * gpuFactor;
      const adjustHeight = (windowHeight ? windowHeight : 0) * gpuFactor;
      setCanvasWidth(adjustWidth);
      setCanvasHeight(adjustHeight);
    }
  }, [gpuFactor, windowWidth, windowHeight, project]);

  useEffect(() => {
    GetInfo().then((gpu: TierResult) => {
      if (gpu.tier === 0) {
        setGpuFactor(1);
      } else if (gpu.tier === 1) {
        setGpuFactor(1);
      } else if (gpu.tier === 2 || gpu.fps! <= 100) {
        setGpuFactor(1.25);
      } else if (gpu.tier === 3) {
        const fpsFactor = clamp(gpu.fps! / 100, 1.25, 3);
        setGpuFactor(fpsFactor);
      } else {
        setGpuFactor(1);
      }
    });
  }, []);

  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);

  useEffect(() => {
    if (layerBarLength > toolBarLength) {
      setShiftX((toolBarLength - layerBarLength) / 2);
    } else {
      setShiftX(-(toolBarLength - layerBarLength) / 2);
    }
    setShiftY(topBarLength / 2);
  }, [layerBarLength, toolBarLength, topBarLength]);

  const [bins, setBins] = useState<number[]>([] as number[]);
  const [frequencies, setFrequencies] = useState<number[]>([] as number[]);

  useEffect(() => {
    if (appRef.current && project.layerManager.layers.length > 0) {
    }
  }, [project.layerManager.layers.length]);

  const { user } = useAuth();
  const { landing, setLanding } = useProjectContext();

  const handleImageSet = (
    selectedImage: HTMLImageElement | string | ArrayBuffer | null,
    natWidth: number,
    natHeight: number,
    realWit: number,
    realHit: number,
    fileName: string,
    fileSize: number,
    file: File
  ) => {
    if (typeof selectedImage === "string") {
      const backgroundLayer = project.layerManager.createBackgroundLayer(
        false,
        "#ffffff",
        realWit,
        realHit,
        0
      );
      setProject((draft) => {
        draft.layerManager.addLayer(backgroundLayer);
      });

      setLanding(true);

      const imageData: ImageData = {
        name: fileName,
        src: selectedImage,
        imageHeight: realHit,
        imageWidth: realWit,
      };

      try {
        const layer = project.layerManager.createLayer(
          realWit,
          realHit,
          imageData,
          file,
          project.id,
          user?.uid!
        );
        setProject((draft) => {
          draft.settings.canvasSettings.width = realWit;
          draft.settings.canvasSettings.height = realHit;

          const imageLayer: ImageLayer = {
            id: layer.id,
            imageData: layer.imageData,
            zIndex: layer.zIndex,
            editingParameters: layer.editingParameters,
            sprite: layer.sprite,
            visible: layer.visible,
            type: "image", // Add the 'type' property with the value 'image'
            opacity: 1,
          };

          draft.layerManager.addLayer(imageLayer);
          const targetLayer = draft.layerManager.findLayer(layer.id);
          if (targetLayer) {
            draft.target = targetLayer as Draft<ImageLayer>;
          }
        });

        // Now you can use the 'newLayer' object after it's resolved
      } catch (error) {
        // Handle any errors that may occur during the async operation
        console.error("Error creating layer:", error);
      }

      // Add the layer to the project
    }

    // const newName = removeExtension(fileName);
    // setFileName(newName);
    // setFileSize(toNumber((fileSize / 1024 / 1024).toFixed(2)));

    uploadLayer(file, project.id, user?.uid!);
  };

  return (
    <div className="h-full">
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div>
          <TopBar
            imgName={imgName}
            setFileName={setImgName}
            zoomValue={zoomValue.toFixed(2)}
            width={realNaturalWidth.current}
            height={realNaturalHeight.current}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            setZoomValue={setZoomValue}
            setFakeX={setFakeX}
            setFakeY={setFakeY}
            rotateValue={rotateValue}
            scaleX={scaleX}
            scaleY={scaleY}
            appRef={appRef}
            containerRef={containerRef}
            maskRef={maskRef}
            canvasRef={canvasRef}
            trigger={trigger}
            setTrigger={setTrigger}
          />
        </div>

        <div className="flex flex-row h-full justify-between">
          <ToolBar
            downloadImage={handleDownload}
            toggleThirds={handleThirds}
            mode={mode}
            setMode={setMode}
          />
          <div className="flex-grow flex flex-col h-full">
            <TopBarTwo
              rotateValue={rotateValue}
              setRotateValue={setRotateValue}
              scaleXSign={scaleXSign}
              scaleYSign={scaleYSign}
              setScaleXSign={setScaleXSign}
              setScaleYSign={setScaleYSign}
              mode={mode}
              setMode={setMode}
              positionX={positionX}
              positionY={positionY}
            />

            <div
              className="flex-grow w-full "
              style={{
                background:
                  "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px",
              }}
            >
              {!landing && (
                <div className="w-full h-full flex flex-row justify-center items-center bg-[#cdcdcd] dark:bg-[#252525]">
                  <div className="flex flex-col justify-center items-center space-y-3 ">
                    <ImageSelector onImageSelect={handleImageSet} />
                    <CreateProject />
                  </div>
                </div>
              )}

              {/* <PinchHandler
                setZoomValue={setZoomValue}
                setIsZooming={setIsZooming}
                target={target} // Pass the targetRef as the target
              /> */}
              <div className="w-full h-full ">
                <TransformWrapper
                  ref={transformRef}
                  onZoom={(e) => {}}
                  panning={{
                    disabled: mode === "move" || mode === "transform",
                  }}
                  onPanning={() => {}}
                >
                  <TransformComponent
                    contentStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                    wrapperStyle={{
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <div
                      id="stage-container"
                      ref={target}
                      className="w-full h-full relative "
                    >
                      <canvas
                        id="canvas"
                        ref={canvasRef}
                        className="w-full h-full absolute top-0 left-0 "
                      ></canvas>
                    </div>
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </div>
          </div>

          <LayerBar
            downloadImage={handleDownload}
            toggleThirds={handleThirds}
            containerRef={containerRef}
            trigger={trigger}
            setTrigger={setTrigger}
            appRef={appRef}
            landing={landing}
          />
        </div>
      </div>
    </div>
  );
};

export default PhotoEditor;
