import { useEffect } from "react";
import * as PIXI from "pixi.js";
import {
  Application,
  Sprite,
  ColorMatrixFilter,
  BlurFilter,
  NoiseFilter,
  TYPES,
  FORMATS,
  TARGETS,
  SCALE_MODES,
  MIPMAP_MODES,
  Graphics,
  Texture,
  Container,
  Rectangle,
  DisplayObject,
  FederatedPointerEvent,
} from "pixi.js";
import { WidthRotate, HeightRotate } from "@/utils/calcUtils";
import { throttle } from "lodash";
// ... (import other necessary dependencies)

import { AdjustmentFilter } from "pixi-filters";
import { InteractionEvents, Stage, render } from "@pixi/react";
import { on } from "events";
import {
  AdjustmentLayer,
  ImageLayer,
  Project,
  SpriteX,
} from "@/utils/editorInterfaces";
import { useProjectContext } from "@/pages/editor";
import { set } from "lodash";
import { Draft } from "immer";

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

interface ApplyCanvasProps {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  appRef: React.MutableRefObject<Application | null>;
  imgSrc: string;
  zoomValue: number;
  fakeY: number;
  fakeX: number;
  rotateValue: number;
  realNaturalWidth: React.MutableRefObject<number>;
  realNaturalHeight: React.MutableRefObject<number>;
  canvasHeight: number;
  canvasWidth: number;
  imageProperties: ImageProperties;
  darkMode: boolean;
  spriteRef: React.MutableRefObject<Sprite | null>;
  containerRef: React.MutableRefObject<Container | null>;
  maskRef: React.MutableRefObject<Graphics | null>;
  showThirds: boolean;
  scaleXSign: number;
  scaleYSign: number;
  scaleX: number;
  scaleY: number;
  spriteRefs: React.MutableRefObject<Sprite[]>;
  setPositionX: React.Dispatch<React.SetStateAction<number>>;
  setPositionY: React.Dispatch<React.SetStateAction<number>>;
  trigger: boolean;
  showTransform: boolean;
}

const ApplyCanvas = ({
  canvasRef,
  appRef,
  imgSrc,
  zoomValue,
  fakeY,
  fakeX,
  rotateValue,
  realNaturalWidth,
  realNaturalHeight,
  canvasHeight,
  canvasWidth,
  imageProperties,
  darkMode,
  spriteRef,
  containerRef,
  maskRef,
  showThirds,
  scaleXSign,
  scaleYSign,
  scaleX,
  scaleY,
  spriteRefs,
  setPositionX,
  setPositionY,
  trigger,
  showTransform,
}: ApplyCanvasProps): void => {
  // Create container if needed

  // Create mask if needed
  const { project, setProject } = useProjectContext();
  const throttledSetProject = throttle(setProject, 100); // Adjust the delay as needed
  const throttledSetPositionX = throttle(setPositionX, 10);
  const throttledSetPositionY = throttle(setPositionY, 10);

  useEffect(() => {
    console.log("Rendering canvas");
    const createContainerIfNeeded = () => {
      if (
        appRef.current &&
        !containerRef.current &&
        realNaturalWidth.current > 1 &&
        realNaturalHeight.current > 1
      ) {
        console.log(
          appRef.current.renderer.width,
          appRef.current.renderer.height
        );
        console.log("Creating containerRRR", realNaturalWidth.current);
        containerRef.current = new Container();
        containerRef.current.width = realNaturalWidth.current;
        containerRef.current.height = realNaturalHeight.current;
        containerRef.current.pivot.set(
          realNaturalWidth.current / 2,
          realNaturalHeight.current / 2
        );
        const background = new Graphics();
        const squareSize = 5;
        const numRows = Math.floor(realNaturalHeight.current / squareSize);
        const numCols = Math.floor(realNaturalWidth.current / squareSize);
        const colors = [0xffffff, 0xe5e5e5]; // Colors for the checkerboard pattern

        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const color = colors[(row + col) % 2];
            const x = Math.ceil(col * squareSize); // Round to integer
            const y = Math.ceil(row * squareSize); // Round to integer
            background.beginFill(color);
            background.drawRect(x, y, squareSize, squareSize);
            background.endFill();
          }
        }
        background.alpha = 0.75;
        background.zIndex = -1;
        containerRef.current.addChild(background);
        appRef.current.stage.addChild(containerRef.current);
      }
    };

    const createMaskIfNeeded = () => {
      if (
        !maskRef.current &&
        realNaturalWidth.current &&
        realNaturalHeight.current &&
        containerRef.current
      ) {
        maskRef.current = new Graphics();
        maskRef.current.beginFill(0xffffff);
        maskRef.current.alpha = 0;
        maskRef.current.drawRect(
          0,
          0,
          realNaturalWidth.current,
          realNaturalHeight.current
        );
        maskRef.current.endFill();
        containerRef.current.addChild(maskRef.current);
        containerRef.current.mask = maskRef.current;
      }
    };

    // If there's no canvas, we can't do anything; return
    if (!canvasRef.current) return;

    // Check if there's an app
    if (!appRef.current) {
      let backgroundColor;
      if (darkMode) {
        backgroundColor = 0x1e1e1e;
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
      // Start the app
      appRef.current.start();
    }

    if (
      Math.round(canvasHeight) !== appRef.current.renderer.height ||
      Math.round(canvasWidth) !== appRef.current.renderer.width
    ) {
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
    }

    const app = appRef.current;
    console.log(app.renderer.width, app.renderer.height);

    // Remove the children whenever there's a change
    // app.stage.removeChildren();
    // Check if there's a container
    if (!containerRef.current) {
      console.log("Creating container");
      createContainerIfNeeded();
    }
    // Check if there's a mask
    if (!maskRef.current) {
      createMaskIfNeeded();
    }

    // Check if there's a new layer in project that's not in the app

    const container = containerRef.current!;
    // Add container to project

    const mask = maskRef.current;
    let dragTarget: Sprite | null = null;
    let dragOffset: PIXI.Point | null = null; // Store the initial offset when dragging starts

    const testLayers = [
      { type: "layer", zIndex: 1 },
      { type: "adjustment", zIndex: 1, layers: [] },
      { type: "layer", zIndex: 2 },
      { type: "adjustment", zIndex: 2, layers: [] },
      { type: "layer", zIndex: 3 },
      { type: "adjustment", zIndex: 3, layers: [] },
      { type: "layer", zIndex: 4 },
      { type: "adjustment", zIndex: 4, layers: [] },
    ];

    function renderLayers(layers: any[]) {
      layers.forEach((layer) => {
        if (layer.type === "adjustment") {
          const adjustmentLayer = layer as any;
          adjustmentLayer.layers = layers.filter(
            (l) => l.zIndex < adjustmentLayer.zIndex
          );
        }
      });
    }
    console.log(renderLayers(testLayers), "renderLayers");

    if (container && mask && project.layerManager.layers.length > 0) {
      container.position.set(canvasWidth / 2 + fakeX, canvasHeight / 2 + fakeY);
      container.sortableChildren = true;
      container.scale.set(zoomValue * scaleX, zoomValue * scaleY);
      //Only show layers that are visible
      // const visibleLayers = project.layers.filter((layer) => layer.visible);

      return () => {
        app.stage.removeAllListeners();
      };
      // container.addChild(mask);
      // container.mask = mask;
      // app.stage.addChild(container);
    }
  }, [
    project,
    showTransform,
    spriteRefs,
    imgSrc,
    zoomValue,
    fakeY,
    fakeX,
    rotateValue,
    realNaturalWidth,
    realNaturalHeight,
    canvasHeight,
    canvasWidth,
    imageProperties,
    appRef,
    canvasRef,
    darkMode,
    spriteRef,
    containerRef,
    maskRef,
    showThirds,
    scaleXSign,
    scaleYSign,
    scaleX,
    scaleY,
    setProject,
    project.target,
    trigger,
  ]);
};

export default ApplyCanvas;
