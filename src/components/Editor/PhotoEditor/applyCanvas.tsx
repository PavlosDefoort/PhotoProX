import { useEffect } from "react";
import {
  Application,
  Sprite,
  ColorMatrixFilter,
  BlurFilter,
  NoiseFilter,
} from "pixi.js";
// ... (import other necessary dependencies)

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
  fake: number;
  fakeX: number;
  rotateValue: number;
  realNaturalWidth: number;
  realNaturalHeight: number;
  canvasHeight: number;
  canvasWidth: number;
  imageProperties: ImageProperties;
  darkMode: boolean;
}

const ApplyCanvas = ({
  canvasRef,
  appRef,
  imgSrc,
  zoomValue,
  fake,
  fakeX,
  rotateValue,
  realNaturalWidth,
  realNaturalHeight,
  canvasHeight,
  canvasWidth,
  imageProperties,
  darkMode,
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
    fake,
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
  ]);

  // You can perform calculations or other operations here
};

export default ApplyCanvas;
