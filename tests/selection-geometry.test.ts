import assert from "node:assert/strict";
import test from "node:test";
import { clampSelectionPoint, closeSelectionPath, combineSelectionPaths, commitSelectionOperand, createFullLayerSelection, rasterizeSelectionMask, removeSelectionForDeletedLayer, sampleSelectionCoverage, sampleSelectionPoint, sourcePixelFromSpriteLocal, traceSelectionMaskBoundary, translateSelection } from "../src/utils/SelectionGeometry";

test("selection paths clamp, sample, and close in image-local pixels", () => {
  assert.deepEqual(clampSelectionPoint({ x: -2, y: 900 }, 100, 80), { x: 0, y: 80 });
  const points = [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 5 }];
  assert.deepEqual(closeSelectionPath(points).at(-1), { x: 1, y: 1 });
  assert.equal(sampleSelectionPoint(points, { x: 5.2, y: 5.1 }).length, 3);
});
const square = (mode: "new" | "add" | "subtract" | "intersect", feather = 0, x = 1, y = 1, size = 2) => ({ kind: "lasso" as const, mode, feather, points: [{x,y},{x:x+size,y},{x:x+size,y:y+size},{x,y:y+size},{x,y}] });
test("rasterizes hard, combined, inverted, and full-layer masks", () => {
  const hard = rasterizeSelectionMask({ paths: [square("new")] }, 5, 5);
  assert.equal(hard[1 * 5 + 1], 1); assert.equal(hard[0], 0);
  const subtracted = rasterizeSelectionMask({ paths: [square("new",0,0,0,5), square("subtract",0,1,1,2)] }, 5, 5);
  assert.equal(subtracted[1 * 5 + 1], 0); assert.equal(subtracted[0], 1);
  const intersected = rasterizeSelectionMask({ paths: [square("new",0,0,0,3), square("intersect",0,2,0,3)] }, 5, 5);
  assert.equal(intersected[0 * 5 + 2], 1); assert.equal(intersected[0], 0);
  assert.equal(rasterizeSelectionMask({ paths: [square("new")], inverted: true }, 5, 5)[0], 1);
  assert.deepEqual([...rasterizeSelectionMask(createFullLayerSelection("layer", 3, 2), 3, 2)], [1,1,1,1,1,1]);
});
test("feather creates fractional pixel mask values", () => {
  const mask = rasterizeSelectionMask({ paths: [square("new", 2)] }, 6, 6);
  assert.ok(mask[0 * 6 + 1] > 0 && mask[0 * 6 + 1] < 1);
});
test("the Lasso sprite-local conversion clamps transformed-boundary coordinates", () => {
  // Pixi toLocal is responsible for undoing viewport/layer affine transforms.
  assert.deepEqual(sourcePixelFromSpriteLocal({ x: 20, y: 10 }, 100, 80), { x: 70, y: 50 });
  assert.deepEqual(sourcePixelFromSpriteLocal({ x: -999, y: 999 }, 100, 80), { x: 0, y: 80 });
});
test("selection state serializes independently for switched layers", () => {
  const state = { selections: { a: createFullLayerSelection("a", 2, 2), b: { ...createFullLayerSelection("b", 3, 1), inverted: true } } };
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(restored.selections.a.layerId, "a"); assert.equal(restored.selections.b.inverted, true);
  delete restored.selections.a;
  assert.ok(restored.selections.b);
});
test("deleting a layer removes only its associated committed selection", () => {
  const selections = { selected: createFullLayerSelection("selected", 2, 2), other: createFullLayerSelection("other", 2, 2) };
  const remaining = removeSelectionForDeletedLayer(selections, "selected");
  assert.equal(remaining.selected, undefined); assert.equal(remaining.other.layerId, "other");
});
test("selection combination retains non-destructive boolean operands", () => {
  const path = { kind: "lasso" as const, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 0 }], feather: 2, mode: "new" as const };
  assert.equal(combineSelectionPaths([path], path, "add")[1].mode, "add");
  assert.equal(combineSelectionPaths([path], path, "subtract")[1].mode, "subtract");
  assert.equal(combineSelectionPaths([path], path, "intersect")[1].mode, "intersect");
});
test("selection composition preserves fractional feather coverage", () => {
  const existing = square("new", 2, 0, 0, 4);
  const operand = square("add", 2, 2, 0, 4);
  const add = rasterizeSelectionMask({ paths: [existing, operand] }, 6, 6);
  assert.ok(add.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(add[1] > 0 && add[1] < 1);

  const subtract = rasterizeSelectionMask({ paths: [existing, { ...operand, mode: "subtract" }] }, 6, 6);
  assert.ok(subtract[1] < add[1]);

  const intersect = rasterizeSelectionMask({ paths: [existing, { ...operand, mode: "intersect" }] }, 6, 6);
  assert.ok(intersect[1] <= add[1]);
});
test("invalid feather values never produce invalid mask values", () => {
  const mask = rasterizeSelectionMask({ paths: [square("new", Number.NaN), { ...square("add", Infinity), feather: -10 }] }, 5, 5);
  assert.ok([...mask].every(value => Number.isFinite(value) && value >= 0 && value <= 1));
});
test("new mode discards prior operands and missing non-new operands start predictably", () => {
  const old = square("new", 0, 0, 0, 1);
  const next = square("new", 0, 2, 2, 1);
  assert.equal(combineSelectionPaths([old], next, "new").length, 1);
  assert.equal(combineSelectionPaths(undefined, { ...next, mode: "subtract" }, "subtract")[0].mode, "new");
});
test("real lasso commit path preserves ordered modes and composes their masks", () => {
  const points = (x: number, y: number, width: number, height: number) => [
    { x, y }, { x: x + width, y }, { x: x + width, y: y + height },
    { x, y: y + height }, { x, y },
  ];
  let selection = commitSelectionOperand(undefined, "layer", "lasso", points(0, 0, 2, 2), "new", 0);
  selection = commitSelectionOperand(selection, "layer", "polygonal", points(4, 0, 2, 2), "add", 0);
  assert.deepEqual(selection.paths.map(path => path.mode), ["new", "add"]);
  let mask = rasterizeSelectionMask(selection, 7, 4);
  assert.equal(mask[0], 1);
  assert.equal(mask[4], 1);
  assert.equal(mask[2], 0);

  selection = commitSelectionOperand(selection, "layer", "magnetic", points(0, 0, 1, 1), "subtract", 0);
  assert.deepEqual(selection.paths.map(path => path.mode), ["new", "add", "subtract"]);
  mask = rasterizeSelectionMask(selection, 7, 4);
  assert.equal(mask[0], 0);
  assert.equal(mask[1], 1);
  assert.equal(mask[4], 1);

  selection = commitSelectionOperand(selection, "layer", "lasso", points(1, 0, 4, 2), "intersect", 0);
  assert.deepEqual(selection.paths.map(path => path.mode), ["new", "add", "subtract", "intersect"]);
  mask = rasterizeSelectionMask(selection, 7, 4);
  assert.equal(mask[0], 0);
  assert.equal(mask[1], 1);
  assert.equal(mask[4], 1);
  assert.equal(mask[5], 0);
});
test("toolbar-selected modes reach repeated commits unchanged", () => {
  const triangle = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 0 }];
  let selection = commitSelectionOperand(undefined, "layer", "lasso", triangle, "add", 0);
  assert.deepEqual(selection.paths.map(path => path.mode), ["new"]);
  for (const mode of ["add", "add", "subtract", "subtract", "intersect", "intersect"] as const) {
    selection = commitSelectionOperand(selection, "layer", "lasso", triangle, mode, 0);
  }
  assert.deepEqual(selection.paths.map(path => path.mode), ["new", "add", "add", "subtract", "subtract", "intersect", "intersect"]);
});
test("boundary tracing includes outer edges, subtraction holes, and disconnected additions", () => {
  const outerWithHole = rasterizeSelectionMask({ paths: [square("new", 0, 0, 0, 5), square("subtract", 0, 2, 2, 1)] }, 5, 5);
  assert.equal(traceSelectionMaskBoundary(outerWithHole, 5, 5).length, 2);

  const disconnected = rasterizeSelectionMask({ paths: [square("new", 0, 0, 0, 1), square("add", 0, 3, 3, 1)] }, 5, 5);
  assert.equal(traceSelectionMaskBoundary(disconnected, 5, 5).length, 2);
});
test("boundary tracing follows intersected and feathered masks at the 50 percent threshold", () => {
  const intersection = rasterizeSelectionMask({ paths: [square("new", 0, 0, 0, 4), square("intersect", 0, 2, 0, 3)] }, 5, 5);
  assert.equal(traceSelectionMaskBoundary(intersection, 5, 5).length, 1);

  const feathered = rasterizeSelectionMask({ paths: [square("new", 2, 1, 1, 2)] }, 5, 5);
  const contours = traceSelectionMaskBoundary(feathered, 5, 5);
  assert.equal(contours.length, 1);
  assert.ok(contours[0].every(point => Number.isInteger(point.x) && Number.isInteger(point.y)));
});
test("boundary tracing returns no resources for an empty or deselected mask", () => {
  assert.deepEqual(traceSelectionMaskBoundary(new Float32Array(16), 4, 4), []);
});
test("selection hit testing and translation preserve operand metadata", () => {
  const selection = { ...createFullLayerSelection("layer", 4, 4), paths: [square("new", 2, 0, 0, 2)] };
  assert.ok(sampleSelectionCoverage(selection, { x: 1, y: 1 }) >= .5);
  assert.equal(sampleSelectionCoverage(selection, { x: 4, y: 4 }), 0);
  const moved = translateSelection(selection, 3, -1);
  assert.equal(moved.paths[0].points[0].x, selection.paths[0].points[0].x + 3);
  assert.equal(moved.paths[0].points[0].y, selection.paths[0].points[0].y - 1);
  assert.equal(moved.paths[0].mode, "new");
  assert.equal(moved.paths[0].feather, 2);
});
