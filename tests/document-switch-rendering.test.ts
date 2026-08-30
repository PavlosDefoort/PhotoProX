import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("document switches flush canvas rendering immediately", () => {
  const source = readFileSync(
    resolve("src/components/editor/tasks/UpdateCanvas.tsx"),
    "utf8",
  );

  assert.ok(source.includes("const switchedDocument ="));
  assert.ok(source.includes("activeDocumentId !== prevActiveDocumentId.current"));
  assert.ok(source.includes("renderLayersMemo.flush();"));
  assert.ok(source.includes("compositeToRT(app.current.renderer, container);"));
  assert.ok(source.includes("useLayoutEffect(() => {"));
});

test("lasso tool clears temporary state on document switch", () => {
  const source = readFileSync(
    resolve(
      "src/components/editor/ui/components/bars/tool-bar/tools/lasso/LassoTool.tsx",
    ),
    "utf8",
  );

  assert.ok(source.includes("BEFORE_DOCUMENT_SWITCH_EVENT"));
  assert.ok(source.includes("setPath([]);"));
});

test("animation loop snaps container transform synchronously on document switch", () => {
  const source = readFileSync(
    resolve("src/components/editor/tasks/MovementLogic.tsx"),
    "utf8",
  );

  assert.ok(source.includes("pendingZoomSnap.current"));
  assert.ok(source.includes("container.scale.set(snap.zoom)"));
  assert.ok(source.includes("container.displaySprite.scale.set(snap.zoom)"));
});

test("PhotoEditor writes pendingZoomSnap on document view restore", () => {
  const source = readFileSync(
    resolve("src/components/editor/PhotoEditor.tsx"),
    "utf8",
  );

  assert.ok(source.includes("pendingZoomSnap.current = {"));
  assert.ok(source.includes("pendingZoomSnap,"));
  assert.ok(source.includes("useLayoutEffect(() => {"));
  assert.ok(source.includes("container.displaySprite.scale.set(snap.zoom)"));
});

test("document view restoration does not rerun for selection-only document updates", () => {
  const source = readFileSync(
    resolve("src/components/editor/PhotoEditor.tsx"),
    "utf8",
  );
  const start = source.indexOf("useLayoutEffect(() => {");
  const restoreEffect = source.slice(start, source.indexOf("useEffect(() => {", start));
  assert.ok(restoreEffect.includes("activeDocumentId,"));
  assert.equal(restoreEffect.includes("    activeDocument,"), false);
});

test("document view restoration does not reset position when the toolbar changes canvas height", () => {
  const source = readFileSync(resolve("src/components/editor/PhotoEditor.tsx"), "utf8");
  const effectStart = source.indexOf("const applyView = () => {");
  const effectEnd = source.indexOf("  useEffect", effectStart + 1);
  assert.ok(effectStart >= 0 && effectEnd > effectStart);
  const restoreEffect = source.slice(effectStart, effectEnd);
  const dependencyBlock = restoreEffect.slice(restoreEffect.lastIndexOf("  }, ["));
  assert.ok(!dependencyBlock.includes("windowHeight"));
  assert.ok(!dependencyBlock.includes("windowWidth"));
});

test("canvas resize preserves zoom when a tool options bar changes the viewport", () => {
  const source = readFileSync(
    resolve("src/components/editor/tasks/UpdateCanvas.tsx"),
    "utf8",
  );
  assert.equal(source.includes("getOptimalInitialZoom("), false);
  assert.equal(source.includes("setTargetZoom(newScale)"), false);
  assert.ok(source.includes("roundedWidth - previousWidth"));
  assert.ok(source.includes("roundedHeight - previousHeight"));
});

test("Ctrl/Cmd+D deselects from the editor-level keyboard handler", () => {
  const source = readFileSync(resolve("src/components/editor/PhotoEditor.tsx"), "utf8");
  assert.ok(source.includes('event.key.toLowerCase() !== "d"'));
  assert.ok(source.includes("delete draft.selections[layerManager.target]"));
});

test("the layout-effect editor is excluded from server rendering", () => {
  const source = readFileSync(resolve("src/pages/editor.tsx"), "utf8");

  assert.ok(source.includes('dynamic(() => import("@/components/editor/PhotoEditor"), {'));
  assert.ok(source.includes("ssr: false"));
});

test("syncContainerBM defers displaySprite texture swap to avoid blank-frame flash", () => {
  const source = readFileSync(resolve("src/utils/PixiUtils.ts"), "utf8");

  // staleRenderTexture is parked on the container (not destroyed immediately)
  assert.ok(source.includes("container.staleRenderTexture = container.renderTexture"));
  // compositeToRT swaps after new content is ready
  assert.ok(source.includes("container.displaySprite.texture = rt"));
  assert.ok(source.includes("container.staleRenderTexture.destroy(true)"));
  assert.ok(source.includes("container.staleRenderTexture = null"));
});

test("ContainerX tracks staleRenderTexture and destroys it on container destroy", () => {
  const source = readFileSync(
    resolve("src/models/pixi-extends/SpriteX.ts"),
    "utf8",
  );

  assert.ok(source.includes("staleRenderTexture: RenderTexture | null = null"));
  assert.ok(source.includes("this.staleRenderTexture.destroy(true)"));
});
