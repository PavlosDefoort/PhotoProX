import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getVisibleDocumentBounds,
  documentLineToScreen,
  HIGH_ZOOM_PRESETS,
  MAX_EDITOR_ZOOM,
  physicalPixelLineWidth,
  documentPixelFromPointer,
  shouldShowPixelGrid,
  shouldUseNearestPreview,
} from "../src/utils/PixelInspection";

test("high zoom presets and thresholds match inspection behavior", () => {
  assert.equal(MAX_EDITOR_ZOOM, 128);
  assert.deepEqual([...HIGH_ZOOM_PRESETS], [8, 16, 32, 64, 128]);
  assert.equal(shouldUseNearestPreview(7.99), false);
  assert.equal(shouldUseNearestPreview(8), true);
  assert.equal(shouldShowPixelGrid(false, 32), false);
  assert.equal(shouldShowPixelGrid(true, 8), true);
});

test("visible grid bounds clamp to the document", () => {
  const bounds = getVisibleDocumentBounds({
    viewportWidth: 800,
    viewportHeight: 600,
    documentWidth: 100,
    documentHeight: 80,
    zoom: 8,
    positionX: 400,
    positionY: 300,
    pivotX: 50,
    pivotY: 40,
  });
  assert.deepEqual(bounds, { minX: 0, minY: 3, maxX: 100, maxY: 77 });
  assert.equal(physicalPixelLineWidth(2), 0.5);
  assert.equal(documentPixelFromPointer(96, 32, 32), 2);
  assert.equal(documentLineToScreen(10, 5, 0.2, 8, 2), 40);
});

test("grid stays outside document compositing and export", () => {
  const overlay = readFileSync("src/components/editor/tasks/PixelGridOverlay.tsx", "utf8");
  const exportSource = readFileSync("src/utils/PixiUtils.ts", "utf8");
  assert.match(overlay, /app\.current\.stage\.addChild\(graphics\)/);
  assert.doesNotMatch(overlay, /container\.addChild\(graphics\)/);
  assert.doesNotMatch(exportSource, /PixelGridOverlay|pixelGridEnabled/);
  const movement = readFileSync("src/components/editor/tasks/MovementLogic.tsx", "utf8");
  assert.match(movement, /scaleMode = shouldUseNearestPreview/);
  assert.match(movement, /\? "nearest" : "linear"/);
  const zoom = readFileSync("src/components/editor/ui/components/bars/top-bar/navigation/zoom-dropdown/ZoomDropDown.tsx", "utf8");
  assert.match(zoom, /Proxy preview/);
  assert.match(zoom, /Nearest preview/);
  assert.match(zoom, /Pixel Grid/);
  assert.match(overlay, /graphics\.visible = visible/);
  const editor = readFileSync("src/components/editor/PhotoEditor.tsx", "utf8");
  assert.match(editor, /useState\(true\)/);
});
