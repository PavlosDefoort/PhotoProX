import { useEffect } from "react";
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
} from "pixi.js";
import { WidthRotate, HeightRotate } from "@/utils/calcUtils";
// ... (import other necessary dependencies)

import { AdjustmentFilter } from "pixi-filters";

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

      // Calculate the new dimensions of the image
      const newWidth = imageWidth * zoomValue * scaleX;
      const newHeight = imageHeight * zoomValue * scaleY;

      // Calculate the coordinates to position the image at the center of the canvas
      const imageX = (canvasWidth - newWidth) / 2;

      const imageY = (canvasHeight - newHeight) / 2;

      let image; // Declare the image variable outside of the if statement

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
      }

      image = spriteRef.current;

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

      image.scale.set(
        scaleXSign * zoomValue * scaleX,
        scaleYSign * zoomValue * scaleY
      );

      image.pivot.set(imageWidth / 2, imageHeight / 2);
      // Center the image

      image.angle = rotateValue;

      image.position.set(canvasWidth / 2 + fakeX, canvasHeight / 2 + fakeY);

      // image.position.set(adjustedX, adjustedY);

      const drawRuleOfThirdsGrid = () => {
        const gridGraphics = new Graphics();
        let gridColor;
        if (darkMode) {
          gridColor = 0xffffff;
        } else {
          gridColor = 0x00000;
        } // Color of the grid lines
        const gridAlpha = 0.8; // Transparency of the grid lines
        const numCols = 3; // Number of columns in the Rule of Thirds grid
        const numRows = 3; // Number of rows in the Rule of Thirds grid
        // Adjust width and height to account for rotation
        const nextWidth = WidthRotate(newWidth, newHeight, rotateValue);
        const nextHeight = HeightRotate(newWidth, newHeight, rotateValue);
        const cellWidth = nextWidth / numCols;
        const cellHeight = nextHeight / numRows;
        const nextImageX = (canvasWidth - nextWidth) / 2;

        const nextImageY = (canvasHeight - nextHeight) / 2;
        // const cellSize = 100; // Size of each grid cell in pixels

        // Adjust fakeX and fakeY to account for rotation
        const adjustedFakeX = fakeX;

        const adjustedFakeY = fakeY;

        for (let col = 1; col < numCols; col++) {
          const x = nextImageX + col * cellWidth;
          gridGraphics.lineStyle(1.8, gridColor, gridAlpha);
          gridGraphics.moveTo(x + adjustedFakeX, nextImageY + adjustedFakeY);
          gridGraphics.lineTo(
            x + adjustedFakeX,
            nextImageY + nextHeight + adjustedFakeY
          );
        }

        // Draw the horizontal grid lines
        for (let row = 1; row < numRows; row++) {
          const y = nextImageY + row * cellHeight;
          gridGraphics.lineStyle(1.8, gridColor, gridAlpha);
          gridGraphics.moveTo(nextImageX + adjustedFakeX, y + adjustedFakeY);
          gridGraphics.lineTo(
            nextImageX + nextWidth + adjustedFakeX,
            y + adjustedFakeY
          );
        }

        return gridGraphics;
      };
      let gridGraphics = new Graphics();
      if (showThirds) {
        gridGraphics = drawRuleOfThirdsGrid();
      }

      //       // Calculate the number of grid cells horizontally and vertically
      // const numCols = Math.floor(newWidth / cellSize);
      // const numRows = Math.floor(newHeight / cellSize);

      // // Calculate the actual grid width and height based on the number of cells
      // const gridWidth = numCols * cellSize;
      // const gridHeight = numRows * cellSize;

      // // Draw the vertical grid lines
      // for (let x = 0; x <= gridWidth; x += cellSize) {
      //     gridGraphics.lineStyle(1, gridColor, gridAlpha);
      //     gridGraphics.moveTo(x + imageX +fakeX, imageY +fakeY);
      //     gridGraphics.lineTo(x + imageX +fakeX, imageY + gridHeight +fakeY);
      // }

      // // Draw the horizontal grid lines
      // for (let y = 0; y <= gridHeight; y += cellSize) {
      //     gridGraphics.lineStyle(1, gridColor, gridAlpha);
      //     gridGraphics.moveTo(imageX +fakeX, y + imageY +fakeY);
      //     gridGraphics.lineTo(imageX + gridWidth +fakeX, y + imageY +fakeY);
      // }

      // Create a black background and apply it on image

      if (rotateValue !== 0) {
        const nextWidth = WidthRotate(newWidth, newHeight, rotateValue);
        const nextHeight = HeightRotate(newWidth, newHeight, rotateValue);
        const nextImageX = (canvasWidth - nextWidth) / 2;

        const nextImageY = (canvasHeight - nextHeight) / 2;
        const background = new Graphics();
        background.beginFill(0x000000);
        background.drawRect(0, 0, nextWidth, nextHeight);
        background.endFill();
        background.alpha = 0.3;
        background.zIndex = -1;
        // position the background behind the image
        background.position.set(nextImageX + fakeX, nextImageY + fakeY);
        app.stage.addChild(background);
      }

      app.stage.addChild(image);
      app.stage.addChild(gridGraphics);
      app.start();
    }

    return () => {
      // The cleanup function will be called when the component unmounts
      // No need to destroy the app here, as we want to reuse it if the component mounts again
    };
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
    showThirds,
    scaleXSign,
    scaleYSign,
    scaleX,
    scaleY,
  ]);

  // You can perform calculations or other operations here
};

export default ApplyCanvas;
