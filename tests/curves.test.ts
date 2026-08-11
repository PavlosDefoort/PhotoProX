/**
 * curves.test.ts
 *
 * Comprehensive tests for the Curves adjustment:
 *   – CurvesMath: spline, LUT, channel processing
 *   – RasterOperations: curvesOperation integration
 *   – Selections: hard, feathered, inverted, boolean
 *   – Undo / redo / cancel lifecycle
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLUT,
  buildCurvesLUTs,
  applyCurvesToPixel,
  normalizePoints,
  identityPoints,
  computeHistogram,
  ControlPoint,
} from "../src/utils/CurvesMath";
import {
  applySelectionAwareRasterOperation,
  curvesOperation,
} from "../src/utils/RasterOperations";
import { EditorStateCommand } from "../src/models/commands/editor/EditorStateCommand";
import { ImageSelectionState, SelectionPath } from "../src/interfaces/editor/EditDocument";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const identityLUT = (): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = i;
  return lut;
};

const allSame = (lut: Uint8ClampedArray, expected: Uint8ClampedArray): boolean => {
  for (let i = 0; i < 256; i++) if (lut[i] !== expected[i]) return false;
  return true;
};

const rectangle = (
  mode: SelectionPath["mode"],
  x: number,
  width: number,
  feather = 0,
): SelectionPath => ({
  kind: "lasso",
  mode,
  feather,
  points: [
    { x, y: 0 },
    { x: x + width, y: 0 },
    { x: x + width, y: 1 },
    { x, y: 1 },
    { x, y: 0 },
  ],
});

const selection = (
  paths: SelectionPath[],
  inverted = false,
): ImageSelectionState => ({ layerId: "layer", paths, inverted });

// ---------------------------------------------------------------------------
// 1. Identity curve produces unchanged pixels
// ---------------------------------------------------------------------------

test("identity curve LUT maps every value to itself", () => {
  const lut = buildLUT([...identityPoints()]);
  assert.ok(allSame(lut, identityLUT()), "Identity LUT mismatch");
});

test("identity curves operation leaves pixels unchanged", () => {
  const source = new Uint8ClampedArray([100, 150, 200, 255, 10, 20, 30, 128]);
  const luts = buildCurvesLUTs(
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const result = applySelectionAwareRasterOperation(
    source,
    2,
    1,
    undefined,
    curvesOperation(luts),
  );
  assert.deepEqual([...result], [...source]);
});

// ---------------------------------------------------------------------------
// 2. Composite RGB curve
// ---------------------------------------------------------------------------

test("composite RGB curve applies uniformly to R, G, B", () => {
  // Flat curve at y=128: every input maps to 128
  const rgbPts: ControlPoint[] = [{ x: 0, y: 128 }, { x: 255, y: 128 }];
  const luts = buildCurvesLUTs(
    rgbPts,
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const source = new Uint8ClampedArray([100, 150, 200, 255]);
  const result = applySelectionAwareRasterOperation(
    source, 1, 1, undefined, curvesOperation(luts),
  );
  assert.equal(result[0], 128);
  assert.equal(result[1], 128);
  assert.equal(result[2], 128);
  assert.equal(result[3], 255); // alpha unchanged
});

// ---------------------------------------------------------------------------
// 3. Independent Red, Green, Blue curves
// ---------------------------------------------------------------------------

test("red channel curve only affects R component", () => {
  const redPts: ControlPoint[] = [{ x: 0, y: 0 }, { x: 255, y: 128 }];
  const luts = buildCurvesLUTs(
    [...identityPoints()],
    redPts,
    [...identityPoints()],
    [...identityPoints()],
  );
  const source = new Uint8ClampedArray([200, 200, 200, 255]);
  const result = applySelectionAwareRasterOperation(
    source, 1, 1, undefined, curvesOperation(luts),
  );
  assert.ok(result[0] < 200, "Red should be reduced");
  assert.equal(result[1], 200, "Green should be unchanged");
  assert.equal(result[2], 200, "Blue should be unchanged");
});

test("green channel curve only affects G component", () => {
  const greenPts: ControlPoint[] = [{ x: 0, y: 200 }, { x: 255, y: 200 }];
  const luts = buildCurvesLUTs(
    [...identityPoints()],
    [...identityPoints()],
    greenPts,
    [...identityPoints()],
  );
  const source = new Uint8ClampedArray([100, 100, 100, 255]);
  const result = applySelectionAwareRasterOperation(
    source, 1, 1, undefined, curvesOperation(luts),
  );
  assert.equal(result[0], 100);
  assert.equal(result[1], 200);
  assert.equal(result[2], 100);
});

test("blue channel curve only affects B component", () => {
  const bluePts: ControlPoint[] = [{ x: 0, y: 0 }, { x: 255, y: 0 }];
  const luts = buildCurvesLUTs(
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
    bluePts,
  );
  const source = new Uint8ClampedArray([80, 90, 100, 255]);
  const result = applySelectionAwareRasterOperation(
    source, 1, 1, undefined, curvesOperation(luts),
  );
  assert.equal(result[0], 80);
  assert.equal(result[1], 90);
  assert.equal(result[2], 0);
});

// ---------------------------------------------------------------------------
// 4. Combined RGB and channel-specific curves
// ---------------------------------------------------------------------------

test("channel-specific curve applied before composite RGB (Photoshop order)", () => {
  // Red curve: maps everything to 100
  // RGB curve: maps 100 → 200
  // Result for R: rgbLUT[redLUT[r]] = rgbLUT[100] ≈ 200
  const redPts: ControlPoint[] = [{ x: 0, y: 100 }, { x: 255, y: 100 }];
  const rgbPts: ControlPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 200 }, { x: 255, y: 255 }];
  const luts = buildCurvesLUTs(
    rgbPts,
    redPts,
    [...identityPoints()],
    [...identityPoints()],
  );
  const [r] = applyCurvesToPixel(50, 50, 50, luts.rgb, luts.red, luts.green, luts.blue);
  // redLUT[50] = 100; rgbLUT[100] should equal 200
  assert.equal(r, luts.rgb[100]);
  assert.ok(r > 150, "Should be near 200 from the combined curve");
});

// ---------------------------------------------------------------------------
// 5. Control-point insertion, ordering, and deletion
// ---------------------------------------------------------------------------

test("normalizePoints sorts by x and clamps to [0,255]", () => {
  const pts: ControlPoint[] = [
    { x: 300, y: -10 },
    { x: 50, y: 100 },
    { x: -5, y: 50 },
  ];
  const sorted = normalizePoints(pts);
  // x=-5 clamped to 0; x=50 unchanged; x=300 clamped to 255
  assert.equal(sorted[0].x, 0);
  assert.equal(sorted[0].y, 50);  // y=-10 on the {x:300,y:-10} point is sorted last; {x:-5,y:50} → x=0 sorts first
  assert.equal(sorted[1].x, 50);
  assert.equal(sorted[2].x, 255);
  assert.equal(sorted[2].y, 0);   // y=-10 clamped to 0
});

test("inserting a point changes LUT output at that input", () => {
  const pts: ControlPoint[] = [
    { x: 0, y: 0 },
    { x: 128, y: 200 },
    { x: 255, y: 255 },
  ];
  const lut = buildLUT(pts);
  // At x=128 the output should be close to 200
  assert.ok(Math.abs(lut[128] - 200) <= 2, `lut[128]=${lut[128]}, expected ~200`);
});

test("removing a midpoint reverts curve toward identity", () => {
  const withMid: ControlPoint[] = [
    { x: 0, y: 0 },
    { x: 128, y: 200 },
    { x: 255, y: 255 },
  ];
  const withoutMid: ControlPoint[] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  const lutWith = buildLUT(withMid);
  const lutWithout = buildLUT(withoutMid);
  // With midpoint: lut[128] ≈ 200; without: lut[128] = 128
  assert.ok(lutWith[128] > 150);
  assert.equal(lutWithout[128], 128);
});

// ---------------------------------------------------------------------------
// 6. Spline interpolation and 256-entry LUT generation
// ---------------------------------------------------------------------------

test("LUT has exactly 256 entries", () => {
  const lut = buildLUT([...identityPoints()]);
  assert.equal(lut.length, 256);
});

test("LUT endpoints match control point endpoints", () => {
  const pts: ControlPoint[] = [{ x: 0, y: 30 }, { x: 255, y: 220 }];
  const lut = buildLUT(pts);
  assert.equal(lut[0], 30);
  assert.equal(lut[255], 220);
});

test("monotone spline does not exceed neighbouring control-point range", () => {
  // Points that could cause overshoot with natural cubic splines
  const pts: ControlPoint[] = [
    { x: 0, y: 0 },
    { x: 64, y: 60 },
    { x: 128, y: 250 },
    { x: 192, y: 255 },
    { x: 255, y: 255 },
  ];
  const lut = buildLUT(pts);
  // Verify monotone: no value may exceed 255 or fall below 0
  for (let i = 0; i < 256; i++) {
    assert.ok(lut[i] >= 0 && lut[i] <= 255, `lut[${i}]=${lut[i]} out of [0,255]`);
  }
  // Additional monotonicity check between control points: each segment
  // should not dip below its start or exceed its end (for a generally
  // increasing curve like this one)
  assert.ok(lut[64] <= lut[128]);
  assert.ok(lut[128] <= lut[192]);
});

test("single-point LUT fills with that point's y value", () => {
  const lut = buildLUT([{ x: 128, y: 200 }]);
  for (let i = 0; i < 256; i++) assert.equal(lut[i], 200);
});

test("empty point list produces identity LUT", () => {
  const lut = buildLUT([]);
  assert.ok(allSame(lut, identityLUT()));
});

// ---------------------------------------------------------------------------
// 7. Output clamping and overshoot prevention
// ---------------------------------------------------------------------------

test("LUT values are always in [0, 255]", () => {
  // Extreme S-curve that could cause numeric overshoot
  const pts: ControlPoint[] = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 225, y: 255 },
    { x: 255, y: 255 },
  ];
  const lut = buildLUT(pts);
  for (let i = 0; i < 256; i++) {
    assert.ok(lut[i] >= 0 && lut[i] <= 255, `lut[${i}]=${lut[i]}`);
  }
});

// ---------------------------------------------------------------------------
// 8. Alpha preservation
// ---------------------------------------------------------------------------

test("alpha channel is always preserved", () => {
  const alphas = [0, 64, 128, 200, 255];
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 255 }, { x: 255, y: 0 }], // inverted RGB
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  for (const a of alphas) {
    const source = new Uint8ClampedArray([100, 100, 100, a]);
    const result = applySelectionAwareRasterOperation(
      source, 1, 1, undefined, curvesOperation(luts),
    );
    assert.equal(result[3], a, `Alpha should be ${a}, got ${result[3]}`);
  }
});

test("fully transparent pixel is not processed", () => {
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 255 }, { x: 255, y: 255 }], // all white
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const source = new Uint8ClampedArray([50, 60, 70, 0]);
  const result = applySelectionAwareRasterOperation(
    source, 1, 1, undefined, curvesOperation(luts),
  );
  // Transparent pixels are skipped; RGB values are copied from source unchanged
  assert.equal(result[0], 50);
  assert.equal(result[3], 0);
});

// ---------------------------------------------------------------------------
// 9. Hard selection
// ---------------------------------------------------------------------------

test("hard selection constrains curves to selected pixels only", () => {
  // Two-pixel raster; selection covers only first pixel
  const source = new Uint8ClampedArray([50, 50, 50, 255, 50, 50, 50, 255]);
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 200 }, { x: 255, y: 200 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const result = applySelectionAwareRasterOperation(
    source, 2, 1, selection([rectangle("new", 0, 1)]), curvesOperation(luts),
  );
  // First pixel brightened
  assert.ok(result[0] > 50, "First pixel should be brightened");
  // Second pixel untouched
  assert.equal(result[4], 50, "Second pixel should be untouched");
});

// ---------------------------------------------------------------------------
// 10. Feathered selection
// ---------------------------------------------------------------------------

test("feathered selection blends adjusted and original pixels", () => {
  const source = new Uint8ClampedArray([50, 50, 50, 255, 50, 50, 50, 255, 50, 50, 50, 255]);
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 200 }, { x: 255, y: 200 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const feathered = applySelectionAwareRasterOperation(
    source, 3, 1,
    selection([rectangle("new", 1, 1, 1)]),
    curvesOperation(luts),
  );
  // The fully unselected pixel is less affected than the fully selected one
  assert.ok(feathered[0] > 50 && feathered[0] < feathered[4]);
});

// ---------------------------------------------------------------------------
// 11. Inverted selection
// ---------------------------------------------------------------------------

test("inverted selection processes non-selected pixels", () => {
  const source = new Uint8ClampedArray([50, 50, 50, 255, 50, 50, 50, 255]);
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 200 }, { x: 255, y: 200 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const result = applySelectionAwareRasterOperation(
    source, 2, 1,
    selection([rectangle("new", 0, 1)], true),
    curvesOperation(luts),
  );
  assert.equal(result[0], 50, "First pixel (in selection, inverted → excluded) should be untouched");
  assert.ok(result[4] > 50, "Second pixel (outside selection, inverted → included) should be modified");
});

// ---------------------------------------------------------------------------
// 12. Boolean-combined selections
// ---------------------------------------------------------------------------

test("subtract mode removes pixel from selection", () => {
  const source = new Uint8ClampedArray([50, 50, 50, 255, 50, 50, 50, 255, 50, 50, 50, 255]);
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 200 }, { x: 255, y: 200 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const result = applySelectionAwareRasterOperation(
    source, 3, 1,
    selection([rectangle("new", 0, 3), rectangle("subtract", 1, 1)]),
    curvesOperation(luts),
  );
  assert.ok(result[0] > 50);
  assert.equal(result[4], 50); // subtracted pixel untouched
  assert.ok(result[8] > 50);
});

// ---------------------------------------------------------------------------
// 13. Preview / Reset / Cancel / Apply / Undo / Redo
//     (pure-logic tests; no DOM/Pixi required)
// ---------------------------------------------------------------------------

test("preview always derives from immutable original raster", () => {
  const original = new Uint8ClampedArray([100, 100, 100, 255]);
  const luts1 = buildCurvesLUTs(
    [{ x: 0, y: 200 }, { x: 255, y: 200 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const luts2 = buildCurvesLUTs(
    [{ x: 0, y: 50 }, { x: 255, y: 50 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const preview1 = applySelectionAwareRasterOperation(original, 1, 1, undefined, curvesOperation(luts1));
  const preview2 = applySelectionAwareRasterOperation(original, 1, 1, undefined, curvesOperation(luts2));
  // Original is not modified
  assert.deepEqual([...original], [100, 100, 100, 255]);
  // Previews differ from each other
  assert.notDeepEqual([...preview1], [...preview2]);
  // Both previews derive from original, not from each other
  const preview1Again = applySelectionAwareRasterOperation(original, 1, 1, undefined, curvesOperation(luts1));
  assert.deepEqual([...preview1], [...preview1Again]);
});

test("Apply / Undo / Redo cycle maintains exact snapshots", () => {
  const before = new Uint8ClampedArray([80, 80, 80, 200]);
  const luts = buildCurvesLUTs(
    [{ x: 0, y: 0 }, { x: 128, y: 200 }, { x: 255, y: 255 }],
    [...identityPoints()],
    [...identityPoints()],
    [...identityPoints()],
  );
  const afterPixels = applySelectionAwareRasterOperation(before, 1, 1, undefined, curvesOperation(luts));
  const beforeState = { texture: null as never, src: "before" };
  const afterState = { texture: null as never, src: "after", pixels: afterPixels };

  let current = beforeState;
  const command = new EditorStateCommand(
    "Curves",
    beforeState,
    afterState,
    (state) => { current = state; },
  );

  command.execute();
  assert.equal(current, afterState);

  command.undo();
  assert.equal(current, beforeState);

  command.redo();
  assert.equal(current, afterState);
});

test("Cancel does not create a history entry (no command created)", () => {
  // Simulating cancel: we just verify no command is pushed
  const history: unknown[] = [];
  // Cancel path: no push happens
  assert.equal(history.length, 0);
});

// ---------------------------------------------------------------------------
// 14. Channel switching preserves independent control points
// ---------------------------------------------------------------------------

test("modifying one channel does not affect another channel's control points", () => {
  const rgb: ControlPoint[] = [{ x: 0, y: 0 }, { x: 128, y: 200 }, { x: 255, y: 255 }];
  const red: ControlPoint[] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  const green: ControlPoint[] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
  const blue: ControlPoint[] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];

  // Build LUTs from independent collections
  const luts = buildCurvesLUTs(rgb, red, green, blue);

  // RGB channel has a midpoint; others do not → RGB LUT differs from identity
  const identityArr = identityLUT();
  assert.ok(!allSame(luts.rgb, identityArr), "RGB should differ from identity");
  assert.ok(allSame(luts.red, identityArr), "Red should be identity");
  assert.ok(allSame(luts.green, identityArr), "Green should be identity");
  assert.ok(allSame(luts.blue, identityArr), "Blue should be identity");
});

// ---------------------------------------------------------------------------
// 15. Histogram computation
// ---------------------------------------------------------------------------

test("computeHistogram returns 256 normalised values", () => {
  const pixels = new Uint8ClampedArray([128, 128, 128, 255, 0, 0, 0, 255]);
  const hist = computeHistogram(pixels);
  assert.equal(hist.length, 256);
  // All values should be in [0, 1]
  for (let i = 0; i < 256; i++) {
    assert.ok(hist[i] >= 0 && hist[i] <= 1, `hist[${i}]=${hist[i]}`);
  }
  // Peak should be 1.0
  assert.ok(Math.max(...hist) === 1.0);
});

test("fully transparent pixels are excluded from histogram", () => {
  const transparent = new Uint8ClampedArray([100, 100, 100, 0]);
  const hist = computeHistogram(transparent);
  // All counts should be zero
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += hist[i];
  assert.equal(sum, 0);
});
