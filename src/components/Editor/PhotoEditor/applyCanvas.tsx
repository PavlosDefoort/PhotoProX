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
}: ApplyCanvasProps): void => {
  useEffect(() => {
    if (!canvasRef.current) return;

    if (!appRef.current) {
      // If the app doesn't exist, create it
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
    }
    // Create a new app if canvasWidth or canvasHeight changes

    if (
      canvasHeight !== appRef.current.renderer.height ||
      canvasWidth !== appRef.current.renderer.width
    ) {
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
    }

    const app = appRef.current; // Use the existing app instance

    let dragOffset: PIXI.Point | null = null; // Store the initial offset when dragging starts
    let dragTarget: Sprite | null = null;

    if (imgSrc) {
      app.stage.removeChildren();
      app.stage.eventMode = "static";
      app.stage.on("pointerup", (event: FederatedPointerEvent) =>
        onDragEnd(event)
      );
      app.stage.on("pointerupoutside", (event: FederatedPointerEvent) =>
        onDragEnd(event)
      );
      const imageWidth = realNaturalWidth;
      const imageHeight = realNaturalHeight;

      let image: Sprite; // Declare the image variable outside of the if statement

      if (!spriteRef.current) {
        spriteRef.current = Sprite.from(imgSrc, {
          resolution: 1,
          type: TYPES.UNSIGNED_BYTE,
          format: FORMATS.RGBA,
          target: TARGETS.TEXTURE_2D,
          scaleMode: SCALE_MODES.LINEAR,
          mipmap: MIPMAP_MODES.ON,
          anisotropicLevel: 16,
        });
        spriteRef.current.width = imageWidth;
        spriteRef.current.height = imageHeight;
      }
      if (!containerRef.current || !maskRef.current) {
        containerRef.current = new Container();
        containerRef.current.width = imageWidth;
        containerRef.current.height = imageHeight;
        containerRef.current.pivot.set(imageWidth / 2, imageHeight / 2);
        const background = new PIXI.Graphics();
        const squareSize = 20; // Adjust the size of each square as needed
        const numRows = Math.floor(imageHeight / squareSize);
        const numCols = Math.floor(imageWidth / squareSize);
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

        maskRef.current = new Graphics();
        maskRef.current.beginFill(0xffffff);
        maskRef.current.alpha = 0;
        maskRef.current.drawRect(0, 0, imageWidth, imageHeight);
        maskRef.current.endFill();
      }
      // Create a mask so if the image leaves the canvas, it will be hidden

      const container = containerRef.current;
      container.width = imageWidth;
      container.height = imageHeight;

      const mask = maskRef.current;
      container.scale.set(
        scaleXSign * zoomValue * scaleX,
        scaleYSign * zoomValue * scaleY
      );

      container.position.set(canvasWidth / 2 + fakeX, canvasHeight / 2 + fakeY);
      //Add a background to the container

      image = spriteRef.current;

      image.eventMode = "static";
      image.cursor = "pointer";
      image.angle = rotateValue;
      image.roundPixels = true;

      const onDragMove = (event: FederatedPointerEvent) => {
        if (dragTarget && dragOffset) {
          const newPosition = event.global.clone();
          // Account for zoom
          const zoomAdjustedDeltaX = (newPosition.x - dragOffset.x) / zoomValue;
          const zoomAdjustedDeltaY = (newPosition.y - dragOffset.y) / zoomValue;

          // Update the drag target's position
          dragTarget.position.set(
            dragTarget.x + zoomAdjustedDeltaX,
            dragTarget.y + zoomAdjustedDeltaY
          );
          dragOffset = newPosition;
        }
      };

      image.on("pointerdown", (event: FederatedPointerEvent) =>
        onDragStart(event)
      );

      const onDragStart = (event: FederatedPointerEvent) => {
        image.alpha = 0.75;
        dragTarget = image;

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
          dragTarget = null;
        }
      };
      container.addChild(image);
      container.addChild(mask);
      container.mask = mask;
      app.stage.addChild(container);
      app.start();
      // Check if mouse is on sprite
      return () => {
        image.removeAllListeners();
        app.stage.removeAllListeners();
      };
    }
  }, [
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
