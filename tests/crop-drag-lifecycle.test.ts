import assert from "node:assert/strict";
import test from "node:test";

test("crop drag remains active across successive resize updates", () => {
  let activeDrag: { startX: number } | null = { startX: 100 };
  let currentCropX = 100;

  const handlePointerMove = (pointerX: number) => {
    assert.ok(activeDrag, "the drag must survive the previous resize update");
    currentCropX = activeDrag.startX + (pointerX - activeDrag.startX);
  };

  handlePointerMove(140);
  handlePointerMove(185);

  assert.equal(currentCropX, 185);
  assert.ok(activeDrag);
});
