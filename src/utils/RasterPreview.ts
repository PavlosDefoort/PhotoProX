import { ImageSelectionState } from "@/interfaces/editor/EditDocument";

export interface PreviewRaster {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

/**
 * Live adjustment previews only need enough pixels for the editor viewport.
 * A one-megapixel budget keeps a typical 2:1 photo near 1448x724 while moving:
 * sharp enough for the editor viewport without returning to multi-megapixel
 * work on every pointer event.
 */
export const MAX_LIVE_PREVIEW_PIXELS = 1024 * 1024;
export const MAX_SETTLED_PREVIEW_PIXELS = 1920 * 1080;

export const getLivePreviewSize = (
  width: number,
  height: number,
  maxPixels = MAX_LIVE_PREVIEW_PIXELS,
) => {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const scale = Math.min(
    1,
    Math.sqrt(maxPixels / (safeWidth * safeHeight)),
  );

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  };
};

export const createLivePreviewRaster = (
  sourceCanvas: HTMLCanvasElement,
  originalPixels: Uint8ClampedArray,
  maxPixels = MAX_LIVE_PREVIEW_PIXELS,
): PreviewRaster => {
  const size = getLivePreviewSize(
    sourceCanvas.width,
    sourceCanvas.height,
    maxPixels,
  );
  if (size.scale === 1) {
    return {
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      pixels: originalPixels,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return {
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      pixels: originalPixels,
    };
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sourceCanvas, 0, 0, size.width, size.height);
  return {
    width: size.width,
    height: size.height,
    pixels: new Uint8ClampedArray(
      context.getImageData(0, 0, size.width, size.height).data,
    ),
  };
};

export const scaleSelectionForPreview = (
  selection: ImageSelectionState | undefined,
  sourceWidth: number,
  sourceHeight: number,
  previewWidth: number,
  previewHeight: number,
): ImageSelectionState | undefined => {
  if (!selection) return undefined;
  if (sourceWidth === previewWidth && sourceHeight === previewHeight) {
    return structuredClone(selection);
  }

  const scaleX = previewWidth / sourceWidth;
  const scaleY = previewHeight / sourceHeight;
  const featherScale = Math.sqrt(scaleX * scaleY);
  return {
    ...selection,
    paths: selection.paths.map((path) => ({
      ...path,
      feather: path.feather * featherScale,
      points: path.points.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      })),
    })),
  };
};
