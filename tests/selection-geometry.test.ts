import assert from "node:assert/strict";
import test from "node:test";
import { clampSelectionPoint, closeSelectionPath, combineSelectionPaths, createFullLayerSelection, rasterizeSelectionMask, removeSelectionForDeletedLayer, sampleSelectionPoint, sourcePixelFromSpriteLocal } from "../src/utils/SelectionGeometry";

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
