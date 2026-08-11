import assert from "node:assert/strict";
import test from "node:test";
import { analyzeVisualSnapshot } from "../src/features/show-me/visual-analysis/core";

const createImage = (
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = fill(x, y);
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }
  return data;
};

const analyze = (imageData: Uint8ClampedArray) =>
  analyzeVisualSnapshot({
    selectedLayerId: "layer-1",
    imageLayerIds: ["layer-1"],
    adjustmentLayerIds: [],
    editorRevision: "fixture-thresholds",
    originalWidth: 10,
    originalHeight: 10,
    sampleWidth: 10,
    sampleHeight: 10,
    imageData,
    runtime: "main-thread",
  });

test("flags shadow clipping risk on mostly near-black pixels", () => {
  const analysis = analyze(
    createImage(10, 10, (x) => (x < 8 ? [2, 2, 2] : [20, 20, 20])),
  );
  assert.ok(
    analysis.observations.some(
      (observation) => observation.code === "shadow-clipping-risk",
    ),
  );
});

test("flags low contrast on compressed tonal range", () => {
  const analysis = analyze(
    createImage(10, 10, (x, y) => {
      const value = 96 + ((x + y) % 4);
      return [value, value, value];
    }),
  );
  assert.ok(
    analysis.observations.some(
      (observation) => observation.code === "low-contrast",
    ),
  );
  assert.ok(analysis.metrics.contrast.flatnessScore > 0.8);
});

test("flags high exposure on bright non-black image", () => {
  const analysis = analyze(
    createImage(10, 10, () => [236, 232, 228]),
  );
  assert.ok(
    analysis.observations.some(
      (observation) => observation.code === "high-exposure",
    ),
  );
});
