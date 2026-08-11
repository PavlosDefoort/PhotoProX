import { SelectionCombineMode, SelectionPath, SelectionPoint } from "@/interfaces/editor/EditDocument";

export const clampSelectionPoint = (point: SelectionPoint, width: number, height: number): SelectionPoint => ({
  x: Math.max(0, Math.min(width, point.x)), y: Math.max(0, Math.min(height, point.y)),
});

export const closeSelectionPath = (points: SelectionPoint[]) => {
  if (points.length < 3) return [];
  const first = points[0]; const last = points[points.length - 1];
  return first.x === last.x && first.y === last.y ? points : [...points, { ...first }];
};

export const sampleSelectionPoint = (points: SelectionPoint[], point: SelectionPoint, minimumDistance = 1.5) =>
  !points.length || Math.hypot(point.x - points[points.length - 1].x, point.y - points[points.length - 1].y) >= minimumDistance
    ? [...points, point] : points;

export const combineSelectionPaths = (existing: SelectionPath[] | undefined, next: SelectionPath, mode: SelectionCombineMode): SelectionPath[] => {
  if (mode === "new" || !existing?.length) return [{ ...next, mode: "new" }];
  return [...existing, { ...next, mode }];
};

const pointInPath = (point: SelectionPoint, path: SelectionPoint[]) => {
  let inside = false;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const a = path[i], b = path[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};
const distanceToSegment = (p: SelectionPoint, a: SelectionPoint, b: SelectionPoint) => {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
  const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};
const pathCoverage = (p: SelectionPoint, path: SelectionPath) => {
  const inside = pointInPath(p, path.points);
  if (!path.feather) return inside ? 1 : 0;
  let edge = Infinity;
  for (let i = 1; i < path.points.length; i++) edge = Math.min(edge, distanceToSegment(p, path.points[i - 1], path.points[i]));
  // A feather radius straddles the geometric edge: 0.5 at the boundary,
  // reaching fully selected/unselected one radius to either side.
  return Math.max(0, Math.min(1, 0.5 + (inside ? edge : -edge) / (2 * path.feather)));
};

/** Pixel-aligned source-image mask for future raster edits. */
export const rasterizeSelectionMask = (selection: { paths: SelectionPath[]; inverted?: boolean } | undefined, width: number, height: number): Float32Array => {
  const mask = new Float32Array(width * height);
  if (!selection?.paths.length) return mask;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = 0;
    for (const path of selection.paths) {
      const coverage = pathCoverage({ x: x + .5, y: y + .5 }, path);
      value = path.mode === "subtract" ? value * (1 - coverage) : path.mode === "intersect" ? value * coverage : Math.max(value, coverage);
    }
    mask[y * width + x] = selection.inverted ? 1 - value : value;
  }
  return mask;
};

export const createFullLayerSelection = (layerId: string, width: number, height: number) => ({ layerId, inverted: false, paths: [{ kind: "lasso" as const, mode: "new" as const, feather: 0, points: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }, { x: 0, y: 0 }] }] });

/** Converts a viewport/global point through an affine sprite transform to clamped source pixels. */
export const sourcePixelFromSpriteLocal = (localPoint: SelectionPoint, width: number, height: number) =>
  clampSelectionPoint({ x: localPoint.x + width / 2, y: localPoint.y + height / 2 }, width, height);

export const removeSelectionForDeletedLayer = <T extends Record<string, unknown>>(selections: T, layerId: keyof T): T => {
  const remaining = { ...selections };
  delete remaining[layerId];
  return remaining;
};
