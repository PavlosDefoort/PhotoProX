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
// ... (import other necessary dependencies)

import { AdjustmentFilter } from "pixi-filters";
import { InteractionEvents, Stage } from "@pixi/react";
import { on } from "events";
import { Project } from "@/utils/interfaces";
import { useProjectContext } from "@/pages/editor";

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
  realNaturalWidth: number;
  realNaturalHeight: number;
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
}: ApplyCanvasProps): void => {
  // Create container if needed

  // Create mask if needed
  const { project, setProject } = useProjectContext();

  useEffect(() => {
    const createContainerIfNeeded = () => {
      if (
        appRef.current &&
        !containerRef.current &&
        project.settings.canvasSettings.width &&
        project.settings.canvasSettings.height
      ) {
        containerRef.current = new Container();
        containerRef.current.width = project.settings.canvasSettings.width;
        containerRef.current.height = project.settings.canvasSettings.height;
        containerRef.current.pivot.set(
          project.settings.canvasSettings.width / 2,
          project.settings.canvasSettings.height / 2
        );
        const background = new Graphics();
        const squareSize = 20;
        const numRows = Math.floor(
          project.settings.canvasSettings.height / squareSize
        );
        const numCols = Math.floor(
          project.settings.canvasSettings.width / squareSize
        );
        const colors = [0xffffff, 0xe5e5e5]; // Colors for the checkerboard pattern

        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const color = colors[(row + col) % 2];
            background.beginFill(color);
            background.drawRect(
              col * squareSize,
              row * squareSize,
              squareSize,
              squareSize
            );
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
        project.settings.canvasSettings.width &&
        project.settings.canvasSettings.height &&
        containerRef.current
      ) {
        maskRef.current = new Graphics();
        maskRef.current.beginFill(0xffffff);
        maskRef.current.alpha = 0;
        maskRef.current.drawRect(
          0,
          0,
          project.settings.canvasSettings.width,
          project.settings.canvasSettings.height
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
      canvasHeight !== appRef.current.renderer.height ||
      canvasWidth !== appRef.current.renderer.width
    ) {
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
    }

    const app = appRef.current;

    // Remove the children whenever there's a change
    // app.stage.removeChildren();
    // Check if there's a container
    if (!containerRef.current) {
      createContainerIfNeeded();
    }
    // Check if there's a mask
    if (!maskRef.current) {
      createMaskIfNeeded();
    }

    // Check if there's a new layer in project that's not in the app

    const container = containerRef.current;
    // Add container to project
    if (container && !project.container) {
      project.container = container;
    }
    const mask = maskRef.current;
    let dragTarget: Sprite | null = null;
    let dragOffset: PIXI.Point | null = null; // Store the initial offset when dragging starts

    if (container && mask && project.layers.length > 0) {
      container.position.set(canvasWidth / 2 + fakeX, canvasHeight / 2 + fakeY);
      container.scale.set(zoomValue * scaleX, zoomValue * scaleY);

      const layers = project.layers;
      layers.forEach((layer) => {
        // Add the layer to container if it's not there
        console.log("layer", layer);
        app.stage.eventMode = "static";
        app.stage.on("pointerup", (event: FederatedPointerEvent) =>
          onDragEnd(event)
        );
        app.stage.on("pointerupoutside", (event: FederatedPointerEvent) =>
          onDragEnd(event)
        );

        layer.sprite.zIndex = layer.zIndex;
        layer.sprite.rotation = rotateValue * (Math.PI / 180);
        layer.sprite.eventMode = "static";
        layer.sprite.cursor = "grab";

        layer.sprite.on("pointerdown", (event: FederatedPointerEvent) => {
          project.target = layer;

          onDragStart(event);
        });

        const onDragMove = (event: FederatedPointerEvent) => {
          if (dragTarget && dragOffset) {
            const newPosition = event.global.clone();
            // Account for zoom
            const zoomAdjustedDeltaX =
              (newPosition.x - dragOffset.x) / zoomValue;
            const zoomAdjustedDeltaY =
              (newPosition.y - dragOffset.y) / zoomValue;

            // Update the drag target's position
            dragTarget.position.set(
              dragTarget.x + zoomAdjustedDeltaX,
              dragTarget.y + zoomAdjustedDeltaY
            );
            dragOffset = newPosition;
          }
        };
        const onDragStart = (event: FederatedPointerEvent) => {
          layer.sprite.alpha = 0.75;

          dragTarget = layer.sprite;
          dragTarget.cursor = "grabbing";

          dragOffset = event.global.clone(); // Store the initial offset

          app.stage.on("pointermove", (event: FederatedPointerEvent) =>
            onDragMove(event)
          );
        };

        const onDragEnd = (event: FederatedPointerEvent) => {
          if (dragTarget) {
            app.stage.off("pointermove", (event: FederatedPointerEvent) =>
              onDragMove(event)
            );
            dragTarget.alpha = 1;
            dragTarget.cursor = "grab";
            dragTarget = null;
          }
        };

        if (!container.children.find((child) => child.name === layer.id)) {
          container.addChild(layer.sprite);
        }
      });
      return () => {
        app.stage.removeAllListeners();
        layers.forEach((layer) => {
          layer.sprite.removeAllListeners();
        });
      };
      // container.addChild(mask);
      // container.mask = mask;
      // app.stage.addChild(container);
    }
  }, [
    project,
    setProject,
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
  ]);
};

export default ApplyCanvas;
