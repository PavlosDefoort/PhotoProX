import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("GPU adjustment preview supports WebGL and WebGPU", () => {
  const source = readFileSync(
    resolve("src/utils/GpuAdjustmentPreview.ts"),
    "utf8",
  );

  assert.ok(source.includes("GlProgram.from"));
  assert.ok(source.includes("GpuProgram.from"));
  assert.ok(source.includes("uRedLut"));
  assert.ok(source.includes('type: "vec4<f32>"'));
  assert.ok(source.includes("size: 64"));
  assert.ok(!source.includes("uLutTexture"));
  assert.ok(source.includes("uMaskTexture"));
  assert.ok(source.includes("uMaskSampler"));
  assert.ok(
    source.indexOf("textureSample(uMaskTexture") <
      source.lastIndexOf("if (source.a <= 0.0)"),
  );
});

test("dialog previews update GPU LUTs and retain full-resolution apply", () => {
  const directory =
    "src/components/editor/ui/components/bars/top-bar/navigation/menu/image";
  const brightness = readFileSync(
    resolve(directory, "BrightnessContrastDialog.tsx"),
    "utf8",
  );
  const curves = readFileSync(resolve(directory, "CurvesDialog.tsx"), "utf8");

  assert.ok(brightness.includes("previewFilter.setBrightnessContrast"));
  assert.ok(curves.includes("previewFilter.setCurves"));
  for (const source of [brightness, curves]) {
    assert.ok(source.includes("original.raster.pixels"));
    assert.ok(!source.includes("previewRaster.pixels"));
  }
});
