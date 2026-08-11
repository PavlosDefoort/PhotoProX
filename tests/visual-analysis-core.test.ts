import assert from "node:assert/strict";
import test from "node:test";
import { analyzeVisualSnapshot } from "../src/features/show-me/visual-analysis/core";

const createSolidImage = (
  width: number,
  height: number,
  red: number,
  green: number,
  blue: number,
) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
    data[index + 3] = 255;
  }
  return data;
};

const createHalfAndHalfImage = (
  width: number,
  height: number,
  left: [number, number, number],
  right: [number, number, number],
) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const source = x < width / 2 ? left : right;
      data[offset] = source[0];
      data[offset + 1] = source[1];
      data[offset + 2] = source[2];
      data[offset + 3] = 255;
    }
  }
  return data;
};

const analyzeFixture = (imageData: Uint8ClampedArray) =>
  analyzeVisualSnapshot({
    selectedLayerId: "layer-1",
    imageLayerIds: ["layer-1"],
    adjustmentLayerIds: [],
    editorRevision: "fixture-1",
    originalWidth: 8,
    originalHeight: 8,
    sampleWidth: 8,
    sampleHeight: 8,
    imageData,
    runtime: "main-thread",
  });

test("detects a dark flat muted fixture image", () => {
  const analysis = analyzeFixture(createSolidImage(8, 8, 26, 26, 26));
  const codes = analysis.observations.map((observation) => observation.code);

  assert.ok(codes.includes("low-exposure"));
  assert.ok(codes.includes("low-contrast"));
  assert.ok(codes.includes("muted-colour"));
  assert.equal(analysis.metrics.colorBalance.temperatureBias, "neutral");
  assert.equal(analysis.metrics.colorBalance.tintBias, "neutral");
  assert.equal(analysis.metrics.colorBalance.dominantColors[0]?.hex, "#101010");
});

test("detects warm highlight pressure and preserved dominant colours", () => {
  const analysis = analyzeFixture(
    createHalfAndHalfImage(8, 8, [255, 255, 240], [232, 168, 110]),
  );
  const codes = analysis.observations.map((observation) => observation.code);

  assert.ok(codes.includes("warm-cast"));
  assert.ok(codes.includes("highlight-clipping-risk"));
  assert.equal(analysis.metrics.colorBalance.temperatureBias, "warm");
  assert.equal(analysis.metrics.colorBalance.dominantColors.length, 2);
  assert.ok(analysis.metrics.clipping.nearWhiteFraction > 0);
});

test("detects cool high-saturation images without semantic claims", () => {
  const analysis = analyzeFixture(createSolidImage(8, 8, 40, 90, 250));
  const codes = analysis.observations.map((observation) => observation.code);

  assert.ok(codes.includes("cool-cast"));
  assert.ok(codes.includes("high-saturation"));
  assert.equal(analysis.metrics.colorBalance.temperatureBias, "cool");
  assert.equal(
    analysis.limits.missingCapabilities.includes(
      "No semantic scene understanding.",
    ),
    true,
  );
});
