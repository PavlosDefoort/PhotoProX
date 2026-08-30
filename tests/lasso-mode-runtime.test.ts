import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("lasso toolbar and canvas commit share one authoritative mode", () => {
  const editor = readFileSync(resolve("src/components/editor/PhotoEditor.tsx"), "utf8");
  const lasso = readFileSync(
    resolve("src/components/editor/ui/components/bars/tool-bar/tools/lasso/LassoTool.tsx"),
    "utf8",
  );

  assert.ok(editor.includes('useState<SelectionCombineMode>("new")'));
  assert.ok(editor.includes("mode={lassoMode}"));
  assert.ok(editor.includes("setMode={setLassoMode}"));
  assert.ok(lasso.includes("onClick={() => setMode(option)}"));
  assert.ok(lasso.includes("commit(mode)"));
  assert.ok(lasso.includes("commitSelectionOperand(d.selections[target.id]"));
  assert.equal(lasso.includes('const [mode, setMode] = useState'), false);
});

test("committed overlay is derived from the composed raster mask", () => {
  const lasso = readFileSync(
    resolve("src/components/editor/ui/components/bars/tool-bar/tools/lasso/LassoTool.tsx"),
    "utf8",
  );

  assert.ok(lasso.includes("rasterizeSelectionMask("));
  assert.ok(lasso.includes("traceSelectionMaskBoundary(mask, width, height)"));
  assert.ok(lasso.includes("selection.paths.length === 1"));
  assert.ok(lasso.includes("contours: [sampled.map"));
  assert.ok(lasso.includes("128 / Math.max(sourceWidth, sourceHeight)"));
  assert.equal(lasso.includes("paths.forEach(path => render(path.points))"), false);
});

test("marching ants animate in Pixi and clean up without rerasterizing", () => {
  const lasso = readFileSync(
    resolve("src/components/editor/ui/components/bars/tool-bar/tools/lasso/LassoTool.tsx"),
    "utf8",
  );
  assert.ok(lasso.includes("application.ticker.add(animate)"));
  assert.ok(lasso.includes("application.ticker.remove(animate)"));
  assert.ok(lasso.includes("phase = (phase + application.ticker.deltaMS"));
  assert.ok(lasso.includes("color: 0x000000"));
  assert.ok(lasso.includes("color: 0xffffff"));
  assert.ok(lasso.includes("g.destroy()"));
  assert.ok(lasso.includes('editMode !== "lasso" && editMode !== "move"'));
  assert.equal(lasso.includes("rasterizeSelectionMask(simplified, width, height),"), false);
});

test("lasso drags selection geometry while move tool translates selected pixels", () => {
  const lasso = readFileSync(resolve("src/components/editor/ui/components/bars/tool-bar/tools/lasso/LassoTool.tsx"), "utf8");
  const move = readFileSync(resolve("src/components/editor/ui/components/bars/tool-bar/tools/move/MoveTool.tsx"), "utf8");
  assert.ok(lasso.includes('mode === "new" && selection && sampleSelectionCoverage(selection, p) >= .5'));
  assert.ok(lasso.includes("translateSelection(selection, dx, dy)"));
  assert.ok(move.includes("sampleSelectionCoverage(selection, sourcePoint) >= .5"));
  assert.ok(move.includes("translateSelectedPixels("));
  assert.ok(move.includes("translateSelection(selection, dx, dy)"));
  assert.ok(move.includes("structuredClone(selection)"));
  assert.ok(move.includes("selectionMoveRef.current = null"));
  assert.ok(move.includes("requestAnimationFrame"));
  assert.ok(lasso.includes("zynalo:selection-move-preview"));
  assert.ok(lasso.includes("selectionPreviewOffset.current = { x: 0, y: 0 }"));
  assert.ok(move.includes("move.dx - move.previewBaseX"));
  assert.ok(move.includes("previewBaseX: baseOffsetX"));
});

test("lasso pointer capture uses Pixi logical screen coordinates", () => {
  const source = readFileSync(resolve("src/components/editor/ui/components/bars/tool-bar/tools/lasso/LassoTool.tsx"), "utf8");
  assert.ok(source.includes("const screen = app.current.renderer.screen"));
  assert.ok(source.includes("screen.width"));
  assert.ok(source.includes("screen.height"));
  assert.equal(source.includes("app.current.renderer.width, y: (event.clientY"), false);
});
