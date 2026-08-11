import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("application menu exposes Image adjustment in File Edit Image Filter order", () => {
  const source = readFileSync(join(process.cwd(), "src/components/editor/ui/components/bars/top-bar/navigation/menu/MenuNavigation.tsx"), "utf8");
  const firstTrigger = source.indexOf("<MenubarTrigger");
  const positions = [
    source.indexOf("File", firstTrigger),
    source.indexOf(">Edit<", firstTrigger),
    source.indexOf(">Image<", firstTrigger),
    source.indexOf(">Filter<", firstTrigger),
  ];
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a,b) => a-b), positions);
  assert.ok(source.includes("Brightness/Contrast…"));
  assert.ok(source.includes("disabled={!hasEditableImage}"));
});

test("brightness contrast dialog exposes complete preview workflow", () => {
  const source = readFileSync(join(process.cwd(), "src/components/editor/ui/components/bars/top-bar/navigation/menu/image/BrightnessContrastDialog.tsx"), "utf8");
  for (const label of ["Brightness", "Contrast", "Preview", "Reset", "Cancel", "Apply"]) assert.ok(source.includes(label));
  assert.ok(source.includes("applySelectionAwareRasterOperation"));
  assert.ok(source.includes("EditorStateCommand"));
});
