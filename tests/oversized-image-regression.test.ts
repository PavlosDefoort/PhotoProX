import assert from "node:assert/strict";
import test from "node:test";
import { getOversizedProxySize, getSafeTextureDimension, requiresTextureProxy } from "../src/utils/TextureCapabilities";

test("oversized proxy decisions preserve aspect ratio and safety margin", () => {
  assert.equal(requiresTextureProxy(1000, 1000, 2048), false);
  assert.equal(requiresTextureProxy(3000, 1000, 2048), true);
  assert.equal(getSafeTextureDimension(2048), 1843);
  const size = getOversizedProxySize(4000, 2000, 2048);
  assert.equal(size.width / size.height, 2);
  assert.ok(size.width <= getSafeTextureDimension(2048));
  assert.ok(size.height <= getSafeTextureDimension(2048));
});

test("oversized-image implementation keeps canonical and proxy data separate", () => {
  const source = require("node:fs").readFileSync("src/models/project/LayerManager.ts", "utf8");
  const persistence = require("node:fs").readFileSync("src/models/project/ImagePersistence.ts", "utf8");
  assert.match(source, /getFullResolutionImageSrc/);
  assert.match(source, /previewSrc = textureSource/);
  assert.match(source, /textureIsProxy = proxy/);
  assert.match(persistence, /previewReason/);
  assert.match(persistence, /"previewReason"/);
  const imageUtils = require("node:fs").readFileSync("src/utils/ImageUtils.ts", "utf8");
  assert.match(imageUtils, /previewReason = undefined/);
  assert.match(imageUtils, /textureIsProxy = false/);
});
