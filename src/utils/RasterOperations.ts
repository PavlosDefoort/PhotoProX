import { rasterizeSelectionMask } from "@/utils/SelectionGeometry";
import { ImageSelectionState } from "@/interfaces/editor/EditDocument";
import { CurvesLUTs, applyCurvesToPixel } from "@/utils/CurvesMath";

export type RasterOperation = (r: number, g: number, b: number) => [number, number, number];
const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export const brightnessContrastOperation = (brightness: number, contrast: number): RasterOperation => {
  const offset = brightness * 255;
  const factor = (contrast + 1) / Math.max(.0001, 1 - contrast);
  return (r, g, b) => [clamp((r - 128) * factor + 128 + offset), clamp((g - 128) * factor + 128 + offset), clamp((b - 128) * factor + 128 + offset)];
};

/** Applies an operation to an immutable raster using the committed selection mask. */
export const applySelectionAwareRasterOperation = (source: Uint8ClampedArray, width: number, height: number, selection: ImageSelectionState | undefined, operation: RasterOperation) => {
  const output = new Uint8ClampedArray(source);
  const mask = selection ? rasterizeSelectionMask(selection, width, height) : undefined;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const offset = pixel * 4, weight = mask ? mask[pixel] : 1;
    if (!weight || source[offset + 3] === 0) continue;
    const [r, g, b] = operation(source[offset], source[offset + 1], source[offset + 2]);
    output[offset] = clamp(source[offset] + (r - source[offset]) * weight);
    output[offset + 1] = clamp(source[offset + 1] + (g - source[offset + 1]) * weight);
    output[offset + 2] = clamp(source[offset + 2] + (b - source[offset + 2]) * weight);
  }
  return output;
};

/** Cuts the weighted selection and composites it at an integer pixel offset. */
export const translateSelectedPixels = (source: Uint8ClampedArray, width: number, height: number, selection: ImageSelectionState, dx: number, dy: number) => {
  const offsetX = Math.round(dx), offsetY = Math.round(dy);
  if (!offsetX && !offsetY) return new Uint8ClampedArray(source);
  const mask = rasterizeSelectionMask(selection, width, height);
  const output = new Uint8ClampedArray(source.length);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const alpha = source[pixel * 4 + 3] / 255;
    const keptAlpha = alpha * (1 - mask[pixel]);
    output[pixel * 4] = source[pixel * 4]; output[pixel * 4 + 1] = source[pixel * 4 + 1]; output[pixel * 4 + 2] = source[pixel * 4 + 2];
    output[pixel * 4 + 3] = Math.round(keptAlpha * 255);
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const destinationX = x + offsetX, destinationY = y + offsetY;
    if (destinationX < 0 || destinationY < 0 || destinationX >= width || destinationY >= height) continue;
    const sourcePixel = y * width + x, weight = mask[sourcePixel];
    if (!weight) continue;
    const sourceOffset = sourcePixel * 4, destinationOffset = (destinationY * width + destinationX) * 4;
    const sourceAlpha = source[sourceOffset + 3] / 255 * weight;
    const destinationAlpha = output[destinationOffset + 3] / 255;
    const resultAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    for (let channel = 0; channel < 3; channel++) {
      const premultiplied = source[sourceOffset + channel] * sourceAlpha + output[destinationOffset + channel] * destinationAlpha * (1 - sourceAlpha);
      output[destinationOffset + channel] = resultAlpha ? Math.round(premultiplied / resultAlpha) : 0;
    }
    output[destinationOffset + 3] = Math.round(resultAlpha * 255);
  }
  return output;
};

/** Copies only selected pixels into a transparent raster, preserving feathered coverage in alpha. */
export const extractSelectedPixels = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  selection: ImageSelectionState,
) => {
  const mask = rasterizeSelectionMask(selection, width, height);
  const output = new Uint8ClampedArray(source.length);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const weight = mask[pixel];
    if (!weight) continue;
    const offset = pixel * 4;
    output[offset] = source[offset];
    output[offset + 1] = source[offset + 1];
    output[offset + 2] = source[offset + 2];
    output[offset + 3] = Math.round(source[offset + 3] * weight);
  }
  return output;
};

/**
 * Returns a RasterOperation that applies four-channel Curves LUTs to each pixel.
 *
 * Processing order (Photoshop-compatible):
 *   channel-specific LUT first, then composite RGB LUT.
 */
export const curvesOperation = (luts: CurvesLUTs): RasterOperation =>
  (r, g, b) => applyCurvesToPixel(r, g, b, luts.rgb, luts.red, luts.green, luts.blue);
