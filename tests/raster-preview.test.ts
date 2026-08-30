import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_LIVE_PREVIEW_PIXELS,
  MAX_SETTLED_PREVIEW_PIXELS,
  getLivePreviewSize,
  scaleSelectionForPreview,
} from "../src/utils/RasterPreview";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("large live previews are bounded while preserving aspect ratio", () => {
  const size = getLivePreviewSize(8000, 4000);
  assert.ok(size.width * size.height <= MAX_LIVE_PREVIEW_PIXELS + size.width);
  assert.ok(Math.abs(size.width / size.height - 2) < 0.01);
  assert.ok(size.width >= 1400);
  assert.ok(size.scale < 1);
});

test("small live previews retain their source resolution", () => {
  assert.deepEqual(getLivePreviewSize(320, 200), {
    width: 320,
    height: 200,
    scale: 1,
  });
});

test("settled previews retain screen-resolution detail", () => {
  const size = getLivePreviewSize(8000, 4000, MAX_SETTLED_PREVIEW_PIXELS);
  assert.ok(size.width >= 1900);
  assert.ok(size.width * size.height <= MAX_SETTLED_PREVIEW_PIXELS + size.width);
});

test("selection geometry follows the preview scale", () => {
  const scaled = scaleSelectionForPreview(
    {
      layerId: "image",
      inverted: false,
      paths: [
        {
          kind: "lasso",
          mode: "new",
          feather: 20,
          points: [{ x: 400, y: 200 }],
        },
      ],
    },
    800,
    400,
    400,
    200,
  );

  assert.deepEqual(scaled?.paths[0].points[0], { x: 200, y: 100 });
  assert.equal(scaled?.paths[0].feather, 10);
});

test("adjustment dialogs use direct viewport rendering for live previews", () => {
  for (const file of ["BrightnessContrastDialog.tsx", "CurvesDialog.tsx"]) {
    const source = readFileSync(
      resolve(
        "src/components/editor/ui/components/bars/top-bar/navigation/menu/image",
        file,
      ),
      "utf8",
    );
    assert.ok(source.includes("useDirectCanvasPreview(container, open)"));
    assert.ok(source.includes("GpuAdjustmentPreviewFilter"));
    assert.ok(source.includes("previewFilter"));
  }
});

test("adjustment commits keep selection coordinates in the output texture space", () => {
  for (const file of ["BrightnessContrastDialog.tsx", "CurvesDialog.tsx"]) {
    const source = readFileSync(
      resolve(
        "src/components/editor/ui/components/bars/top-bar/navigation/menu/image",
        file,
      ),
      "utf8",
    );
    assert.ok(source.includes("setFullResolutionWorkingSource(layer, state.src, state.texture.width, state.texture.height)"));
    assert.ok(source.includes("autoDensity: false"));
  }
});

test("GPU adjustment masks preserve image-pixel dimensions", () => {
  const source = readFileSync(resolve("src/utils/GpuAdjustmentPreview.ts"), "utf8");
  assert.ok(source.includes("autoDensity: false"));
});

test("GPU adjustment preview maps the mask through the image sprite transform", () => {
  const source = readFileSync(resolve("src/utils/GpuAdjustmentPreview.ts"), "utf8");
  assert.ok(source.includes("calculateSpriteMatrix"));
  assert.ok(source.includes("uFilterMatrix"));
  assert.ok(source.includes("texture(uMaskTexture, vMaskCoord)"));
  assert.ok(source.includes("maskUv: vec2<f32>"));
  assert.ok(source.includes("textureSample(uMaskTexture, uMaskSampler, maskUv)"));
  assert.equal(source.includes("texture(uMaskTexture, vTextureCoord)"), false);
});
