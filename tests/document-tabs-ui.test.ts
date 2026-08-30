import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("photo editor wires document tabs and close confirmation into the workspace", () => {
  const source = readFileSync(
    resolve("src/components/editor/PhotoEditor.tsx"),
    "utf8",
  );

  assert.ok(source.includes("<DocumentTabs"));
  assert.ok(source.includes("<CloseDocumentDialog"));
  assert.ok(source.includes("Ctrl/Cmd+W") === false);
  assert.ok(source.includes("event.key === \"Tab\""));
  assert.ok(source.includes("closeDocument(pendingCloseDocument.id)"));
  assert.equal(source.includes("ToolBar key={activeDocumentId"), false);
  assert.equal(source.includes("MoveTool key={`move-"), false);
});

test("tab component exposes dirty indicators and close buttons", () => {
  const source = readFileSync(
    resolve("src/components/editor/ui/components/document-tabs/DocumentTabs.tsx"),
    "utf8",
  );

  assert.ok(source.includes("document.isDirty"));
  assert.ok(source.includes("Close ${title}"));
  assert.ok(source.includes("onReorder(result.source.index, result.destination.index)"));
});

test("menu navigation exposes new, save, and save as entries", () => {
  const source = readFileSync(
    resolve(
      "src/components/editor/ui/components/bars/top-bar/navigation/menu/MenuNavigation.tsx",
    ),
    "utf8",
  );

  for (const label of ["New", "Save", "Save As…"]) {
    assert.ok(source.includes(label));
  }
  assert.ok(source.includes("markDocumentSaved(activeDocument.id)"));
  assert.equal(source.includes("saveDocumentFromCanvas"), false);
});
