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

/**
 * Returns a RasterOperation that applies four-channel Curves LUTs to each pixel.
 *
 * Processing order (Photoshop-compatible):
 *   channel-specific LUT first, then composite RGB LUT.
 */
export const curvesOperation = (luts: CurvesLUTs): RasterOperation =>
  (r, g, b) => applyCurvesToPixel(r, g, b, luts.rgb, luts.red, luts.green, luts.blue);
