import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("landing image selector provides a glowing drop state and opens dropped files", () => {
  const source = readFileSync(
    "src/components/editor/tasks/ImageSelector.tsx",
    "utf8",
  );
  assert.match(source, /onDragEnter=\{handleDragOver\}/);
  assert.match(source, /shadow-\[0_0_0_6px/);
  assert.match(source, /e\.dataTransfer\.files\[0\]/);
  assert.match(source, /openDroppedFile\(file\)/);
  assert.match(source, /Release to open/);
});
