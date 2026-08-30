import assert from "node:assert/strict";
import test from "node:test";
import { applySelectionAwareRasterOperation, brightnessContrastOperation, extractSelectedPixels, translateSelectedPixels } from "../src/utils/RasterOperations";
import { EditorStateCommand } from "../src/models/commands/editor/EditorStateCommand";
import { ImageSelectionState, SelectionPath } from "../src/interfaces/editor/EditDocument";

test("direct raster operation preserves alpha and always derives preview from source", () => {
  const source = new Uint8ClampedArray([100,100,100,255, 100,100,100,0]);
  const operation = brightnessContrastOperation(.1, 0);
  const previewA = applySelectionAwareRasterOperation(source, 2, 1, undefined, operation);
  const previewB = applySelectionAwareRasterOperation(source, 2, 1, undefined, operation);
  assert.deepEqual([...previewA], [...previewB]); assert.equal(previewA[3], 255); assert.equal(previewA[7], 0);
});

const rectangle = (mode: SelectionPath["mode"], x: number, width: number, feather = 0): SelectionPath => ({ kind: "lasso", mode, feather, points: [{x,y:0},{x:x+width,y:0},{x:x+width,y:1},{x,y:1},{x,y:0}] });
const selection = (paths: SelectionPath[], inverted = false): ImageSelectionState => ({ layerId: "layer", paths, inverted });
const brighten = brightnessContrastOperation(.2, 0);

test("whole-layer and hard selections constrain direct adjustments", () => {
  const source = new Uint8ClampedArray([50,50,50,255, 50,50,50,255]);
  const whole = applySelectionAwareRasterOperation(source, 2, 1, undefined, brighten);
  assert.ok(whole[0] > 50 && whole[4] > 50);
  const hard = applySelectionAwareRasterOperation(source, 2, 1, selection([rectangle("new",0,1)]), brighten);
  assert.ok(hard[0] > 50); assert.equal(hard[4], 50);
});

test("feather, inversion, and boolean combinations blend correctly", () => {
  const source = new Uint8ClampedArray([50,50,50,255, 50,50,50,255, 50,50,50,255]);
  const feathered = applySelectionAwareRasterOperation(source, 3, 1, selection([rectangle("new",1,1,1)]), brighten);
  assert.ok(feathered[0] > 50 && feathered[0] < feathered[4]);
  const inverted = applySelectionAwareRasterOperation(source, 3, 1, selection([rectangle("new",0,1)], true), brighten);
  assert.equal(inverted[0], 50); assert.ok(inverted[4] > 50);
  const combined = applySelectionAwareRasterOperation(source, 3, 1, selection([rectangle("new",0,3),rectangle("subtract",1,1)]), brighten);
  assert.ok(combined[0] > 50); assert.equal(combined[4], 50); assert.ok(combined[8] > 50);
});

test("preview cancellation and one-command apply/undo/redo retain exact snapshots", () => {
  const before = new Uint8ClampedArray([80,80,80,127]);
  const preview = applySelectionAwareRasterOperation(before,1,1,undefined,brightnessContrastOperation(.1,0));
  const changedPreview = applySelectionAwareRasterOperation(before,1,1,undefined,brightnessContrastOperation(.3,0));
  assert.notDeepEqual([...preview], [...changedPreview]); assert.deepEqual([...before], [80,80,80,127]);
  let current = before;
  const command = new EditorStateCommand("Brightness/Contrast", before, changedPreview, state => { current = state; });
  command.execute(); assert.deepEqual([...current], [...changedPreview]);
  command.undo(); assert.deepEqual([...current], [...before]);
  command.redo(); assert.deepEqual([...current], [...changedPreview]);
  const laterSelection = selection([rectangle("new",0,1)], true); laterSelection.inverted = false;
  assert.deepEqual([...current], [...changedPreview]);
});
test("moving selected pixels cuts the source and composites at the destination", () => {
  const pixels = new Uint8ClampedArray([
    255,0,0,255, 0,255,0,255, 0,0,255,255,
  ]);
  const selection = { layerId: "layer", inverted: false, paths: [{ kind: "lasso" as const, mode: "new" as const, feather: 0, points: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1},{x:0,y:0}] }] };
  const moved = translateSelectedPixels(pixels, 3, 1, selection, 1, 0);
  assert.equal(moved[3], 0);
  assert.deepEqual([...moved.slice(4, 8)], [255,0,0,255]);
  assert.deepEqual([...moved.slice(8, 12)], [0,0,255,255]);
});

test("selection extraction makes unselected pixels transparent", () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255,
  ]);
  const extracted = extractSelectedPixels(
    pixels,
    2,
    1,
    selection([rectangle("new", 0, 1)]),
  );
  assert.deepEqual([...extracted.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...extracted.slice(4, 8)], [0, 0, 0, 0]);
});
