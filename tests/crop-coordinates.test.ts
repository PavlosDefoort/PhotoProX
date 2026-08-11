import assert from "node:assert/strict";
import test from "node:test";
import { texturePixelFromSpriteLocal } from "../src/utils/CropCoordinates";

test("crop resize maps sprite-local coordinates to texture pixels without display scale", () => {
  const textureWidth = 1200;
  const textureHeight = 800;

  // A 30px screen drag represents a different source-pixel delta at each
  // canvas zoom, but always renders as the same 30px movement of the edge.
  for (const zoom of [0.25, 1, 2, 4]) {
    const screenDelta = 30;
    const localDelta = screenDelta / zoom;
    const start = texturePixelFromSpriteLocal(
      { x: 0, y: 0 },
      textureWidth,
      textureHeight,
    );
    const end = texturePixelFromSpriteLocal(
      { x: localDelta, y: 0 },
      textureWidth,
      textureHeight,
    );

    assert.equal(end.x - start.x, localDelta);
    assert.equal((end.x - start.x) * zoom, screenDelta);
  }
});

test("crop pointer conversion does not divide resize deltas by sprite scale twice", () => {
  const textureWidth = 1000;
  const textureHeight = 500;
  const localDrag = 80;
  const start = texturePixelFromSpriteLocal(
    { x: -500, y: 0 },
    textureWidth,
    textureHeight,
  );
  const end = texturePixelFromSpriteLocal(
    { x: -500 + localDrag, y: 0 },
    textureWidth,
    textureHeight,
  );

  assert.equal(end.x - start.x, localDrag);
});
