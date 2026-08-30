import { CanvasSource, Texture } from "pixi.js";
import type { ImageLayer } from "@/models/project/Layers/Layers";

/** Returns the committed, full-resolution working source (never a preview). */
export const getFullResolutionImageSrc = (imageData: {
  src: string;
  fullResolutionSrc?: string;
}) => imageData.fullResolutionSrc ?? imageData.src;

/** Updates the working raster while preserving the untouched original source. */
export const setFullResolutionWorkingSource = (
  layer: ImageLayer,
  src: string,
  width: number,
  height: number,
  mimeType = layer.imageData.workingMimeType ?? "image/png",
) => {
  layer.imageData.src = src;
  layer.imageData.fullResolutionSrc = src;
  layer.imageData.imageWidth = width;
  layer.imageData.imageHeight = height;
  layer.imageData.fullResolutionWidth = width;
  layer.imageData.fullResolutionHeight = height;
  layer.imageData.workingMimeType = mimeType;
  layer.imageData.previewSrc = undefined;
  layer.imageData.previewWidth = undefined;
  layer.imageData.previewHeight = undefined;
  layer.imageData.previewReason = undefined;
  layer.textureIsProxy = false;
};

/** Restores the working representation from persisted original encoded bytes. */
export const restoreWorkingSourceFromOriginal = (layer: ImageLayer) => {
  const original = layer.imageData.originalSourceSrc;
  if (!original) return false;
  setFullResolutionWorkingSource(
    layer,
    original,
    layer.imageData.originalWidth ?? layer.imageData.imageWidth,
    layer.imageData.originalHeight ?? layer.imageData.imageHeight,
    layer.imageData.originalMimeType,
  );
  return true;
};

/** Reconstructs the runtime-only original Blob after JSON project loading. */
export const originalSourceToBlob = async (layer: ImageLayer) => {
  const src = layer.imageData.originalSourceSrc;
  if (!src) return null;
  const response = await fetch(src);
  return response.blob();
};

export const revokeObjectUrl = (url: string | null | undefined) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

export const convertBytesToString = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const convertedValue = bytes / Math.pow(k, i);

  // Optional: round to 2 decimal places
  const roundedValue = Math.round(convertedValue * 100) / 100;

  return `${roundedValue} ${sizes[i]}`;
};

export const base64StringToTexture = async (
  base64String: string
): Promise<Texture> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Create a canvas element and draw the image onto it
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(image, 0, 0);
        const canvasSource = new CanvasSource({
          resource: canvas,
          width: image.width,
          height: image.height,
          antialias: true,
          scaleMode: "linear",
          autoDensity: false,
        });
        const imageTexture = new Texture(canvasSource);

        // imageTexture.source.scaleMode = "linear";
        // // imageTexture.source.autoGenerateMipmaps = true;
        // imageTexture.source.resolution = window.devicePixelRatio;

        resolve(imageTexture);
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };

    image.onerror = (error) => {
      reject(error);
    };

    image.src = base64String;
  });
};
