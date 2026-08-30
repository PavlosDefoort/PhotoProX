import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("document layers are not viewport-culled during offscreen compositing", () => {
  const source = fs.readFileSync(path.join(root, "src/components/editor/tasks/RenderLayers.tsx"), "utf8");
  assert.match(source, /imageSprite\.cullable = false/);
});

test("offscreen compositing applies z-index ordering before rendering", () => {
  const source = fs.readFileSync(path.join(root, "src/utils/PixiUtils.ts"), "utf8");
  const composite = source.slice(source.indexOf("export function compositeToRT"), source.indexOf("export function createProjectApp"));
  assert.ok(composite.indexOf("container.sortChildren()") < composite.indexOf("renderer.render({ container, target: rt"));
});
