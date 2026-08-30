import type { ImageSelectionState, SelectionCombineMode, SelectionPath, SelectionPathKind, SelectionPoint } from "@/interfaces/editor/EditDocument";

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

/** The single commit boundary used by lasso tools and integration tests. */
export const commitSelectionOperand = (
  existingSelection: ImageSelectionState | undefined,
  layerId: string,
  kind: SelectionPathKind,
  points: SelectionPoint[],
  requestedMode: SelectionCombineMode,
  feather: number,
): ImageSelectionState => {
  const effectiveMode: SelectionCombineMode = existingSelection?.paths.length
    ? requestedMode
    : "new";
  const operand: SelectionPath = {
    kind,
    points,
    mode: effectiveMode,
    feather: Number.isFinite(feather) ? Math.max(0, feather) : 0,
  };

  return {
    layerId,
    inverted: existingSelection?.inverted ?? false,
    paths:
      effectiveMode === "new"
        ? [operand]
        : [...existingSelection!.paths, operand],
  };
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
  const feather = Number.isFinite(path.feather) ? Math.max(0, path.feather) : 0;
  if (!feather) return inside ? 1 : 0;
  let edge = Infinity;
  for (let i = 1; i < path.points.length; i++) edge = Math.min(edge, distanceToSegment(p, path.points[i - 1], path.points[i]));
  // A feather radius straddles the geometric edge: 0.5 at the boundary,
  // reaching fully selected/unselected one radius to either side.
  const value = 0.5 + (inside ? edge : -edge) / (2 * feather);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : (inside ? 1 : 0);
};

export const sampleSelectionCoverage = (
  selection: { paths: SelectionPath[]; inverted?: boolean } | undefined,
  point: SelectionPoint,
) => {
  if (!selection?.paths.length) return 0;
  let value = 0;
  for (const path of selection.paths) {
    const coverage = pathCoverage(point, path);
    value = path.mode === "subtract" ? value * (1 - coverage) : path.mode === "intersect" ? value * coverage : Math.max(value, coverage);
  }
  const result = selection.inverted ? 1 - value : value;
  return Number.isFinite(result) ? Math.max(0, Math.min(1, result)) : 0;
};

export const translateSelection = <T extends ImageSelectionState>(selection: T, dx: number, dy: number): T => ({
  ...selection,
  paths: selection.paths.map(path => ({
    ...path,
    points: path.points.map(point => ({ x: point.x + dx, y: point.y + dy })),
  })),
});

/** Pixel-aligned source-image mask for future raster edits. */
export const rasterizeSelectionMask = (selection: { paths: SelectionPath[]; inverted?: boolean } | undefined, width: number, height: number): Float32Array => {
  const mask = new Float32Array(width * height);
  if (!selection?.paths.length) return mask;
  for (const path of selection.paths) {
    const operand = new Float32Array(width * height);
    const feather = Number.isFinite(path.feather) ? Math.max(0, path.feather) : 0;
    if (!feather) {
      for (let y = 0; y < height; y++) {
        const scanY = y + .5;
        const intersections: number[] = [];
        for (let index = 0, previous = path.points.length - 1; index < path.points.length; previous = index++) {
          const a = path.points[index], b = path.points[previous];
          if ((a.y > scanY) !== (b.y > scanY)) intersections.push(((b.x - a.x) * (scanY - a.y)) / (b.y - a.y) + a.x);
        }
        intersections.sort((a, b) => a - b);
        for (let index = 0; index + 1 < intersections.length; index += 2) {
          const start = Math.max(0, Math.ceil(intersections[index] - .5));
          const end = Math.min(width, Math.ceil(intersections[index + 1] - .5));
          operand.fill(1, y * width + start, y * width + end);
        }
      }
    } else if (path.points.length) {
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const point of path.points) { left = Math.min(left, point.x); right = Math.max(right, point.x); top = Math.min(top, point.y); bottom = Math.max(bottom, point.y); }
      const minX = Math.max(0, Math.floor(left - feather));
      const maxX = Math.min(width, Math.ceil(right + feather));
      const minY = Math.max(0, Math.floor(top - feather));
      const maxY = Math.min(height, Math.ceil(bottom + feather));
      for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) operand[y * width + x] = pathCoverage({ x: x + .5, y: y + .5 }, path);
    }
    for (let pixel = 0; pixel < mask.length; pixel++) {
      const coverage = operand[pixel];
      mask[pixel] = path.mode === "subtract" ? mask[pixel] * (1 - coverage) : path.mode === "intersect" ? mask[pixel] * coverage : Math.max(mask[pixel], coverage);
    }
  }
  if (selection.inverted) for (let pixel = 0; pixel < mask.length; pixel++) mask[pixel] = 1 - mask[pixel];
  return mask;
};

/** Traces ordered outer and inner contours from a normalized selection mask. */
export const traceSelectionMaskBoundary = (
  mask: ArrayLike<number>,
  width: number,
  height: number,
  threshold = .5,
): SelectionPoint[][] => {
  if (width < 1 || height < 1 || mask.length < width * height) return [];
  const selected = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && Number(mask[y * width + x]) >= threshold;
  type Edge = [SelectionPoint, SelectionPoint];
  const outgoing = new Map<string, Edge[]>();
  const key = (point: SelectionPoint) => `${point.x},${point.y}`;
  const add = (from: SelectionPoint, to: SelectionPoint) => {
    const edges = outgoing.get(key(from));
    if (edges) edges.push([from, to]); else outgoing.set(key(from), [[from, to]]);
  };

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (selected(x, y)) {
    if (!selected(x, y - 1)) add({ x, y }, { x: x + 1, y });
    if (!selected(x + 1, y)) add({ x: x + 1, y }, { x: x + 1, y: y + 1 });
    if (!selected(x, y + 1)) add({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
    if (!selected(x - 1, y)) add({ x, y: y + 1 }, { x, y });
  }

  const contours: SelectionPoint[][] = [];
  while (outgoing.size) {
    const firstEntry = outgoing.entries().next().value as [string, Edge[]] | undefined;
    if (!firstEntry) break;
    const [startKey, startEdges] = firstEntry;
    const first = startEdges.pop()!;
    if (!startEdges.length) outgoing.delete(startKey);
    const contour = [first[0], first[1]];
    let current = first[1];
    const maximumEdges = width * height * 4 + 1;
    while (key(current) !== startKey && contour.length <= maximumEdges) {
      const currentKey = key(current);
      const edges = outgoing.get(currentKey);
      if (!edges?.length) break;
      const edge = edges.pop()!;
      if (!edges.length) outgoing.delete(currentKey);
      current = edge[1];
      contour.push(current);
    }
    if (contour.length > 2) contours.push(contour);
  }
  return contours;
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
