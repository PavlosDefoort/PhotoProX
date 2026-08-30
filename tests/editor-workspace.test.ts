import assert from "node:assert/strict";
import test from "node:test";
import { LayerX } from "../src/models/project/Layers/Layers";
import { Project } from "../src/models/project/Project";
import {
  addWorkspaceDocument,
  applyCloseDocumentDecision,
  closeWorkspaceDocument,
  createEditorWorkspace,
  createWorkspaceDocument,
  cycleWorkspaceDocument,
  getDocumentCloseRequirement,
  markDocumentSaved,
  reorderWorkspaceDocument,
  syncDocumentDirtyState,
} from "../src/models/editor/EditorWorkspace";

const createDocument = (fileName: string | null) => {
  const document = createWorkspaceDocument({ fileName });
  document.layerManager.layers.push(new LayerX(0, fileName ?? "Untitled"));
  document.layerManager.target = document.layerManager.layers[0].id;
  markDocumentSaved(document);
  return document;
};

test("opening multiple documents keeps stable active document ids", () => {
  const workspace = createEditorWorkspace();
  const first = createDocument("first.png");
  const second = createDocument("second.png");
  addWorkspaceDocument(workspace, first);
  addWorkspaceDocument(workspace, second);

  assert.deepEqual(
    workspace.openDocuments.map((document) => document.id),
    [first.id, second.id],
  );
  assert.equal(workspace.activeDocumentId, second.id);
});

test("switching documents preserves independent layer and selection state", () => {
  const workspace = createEditorWorkspace();
  const first = createDocument("first.png");
  const second = createDocument("second.png");

  first.editDocument.selections[first.layerManager.target] = {
    layerId: first.layerManager.target,
    inverted: false,
    paths: [{ kind: "lasso", feather: 0, mode: "new", points: [{ x: 1, y: 1 }] }],
  };
  second.editDocument.selections["other-layer"] = {
    layerId: "other-layer",
    inverted: true,
    paths: [{ kind: "polygonal", feather: 4, mode: "add", points: [{ x: 2, y: 3 }] }],
  };
  syncDocumentDirtyState(first);
  syncDocumentDirtyState(second);

  addWorkspaceDocument(workspace, first);
  addWorkspaceDocument(workspace, second);
  workspace.activeDocumentId = first.id;

  assert.equal(
    workspace.openDocuments.find((document) => document.id === first.id)?.editDocument
      .selections[first.layerManager.target]?.paths[0].points[0].x,
    1,
  );
  assert.equal(
    workspace.openDocuments.find((document) => document.id === second.id)?.editDocument
      .selections["other-layer"]?.inverted,
    true,
  );
});

test("undo-backed dirty state clears when a document returns to its saved snapshot", () => {
  const document = createDocument("saved.png");
  document.editDocument.selections[document.layerManager.target] = {
    layerId: document.layerManager.target,
    inverted: false,
    paths: [{ kind: "lasso", feather: 0, mode: "new", points: [{ x: 9, y: 9 }] }],
  };
  syncDocumentDirtyState(document);
  assert.equal(document.isDirty, true);

  delete document.editDocument.selections[document.layerManager.target];
  syncDocumentDirtyState(document);
  assert.equal(document.isDirty, false);
});

test("selected-layer changes alone do not dirty a document", () => {
  const document = createDocument("select.png");
  const secondLayer = new LayerX(1, "Second");
  document.layerManager.layers.push(secondLayer);
  markDocumentSaved(document);

  document.layerManager.target = secondLayer.id;
  syncDocumentDirtyState(document);

  assert.equal(document.isDirty, false);
});

test("dirty close handling supports save, discard, and cancel", () => {
  const workspace = createEditorWorkspace();
  const document = createDocument("close-me.png");
  document.editDocument.selections[document.layerManager.target] = {
    layerId: document.layerManager.target,
    inverted: false,
    paths: [{ kind: "lasso", feather: 0, mode: "new", points: [{ x: 5, y: 5 }] }],
  };
  syncDocumentDirtyState(document);
  addWorkspaceDocument(workspace, document);

  assert.equal(getDocumentCloseRequirement(document), "confirm");
  assert.deepEqual(applyCloseDocumentDecision(workspace, document.id, "cancel"), {
    outcome: "cancelled",
  });
  assert.deepEqual(applyCloseDocumentDecision(workspace, document.id, "save"), {
    outcome: "save",
  });
  assert.deepEqual(applyCloseDocumentDecision(workspace, document.id, "discard"), {
    outcome: "closed",
  });
  assert.equal(workspace.openDocuments.length, 0);
});

test("reordering tabs keeps stable document identity after closure", () => {
  const workspace = createEditorWorkspace();
  const first = createDocument("first.png");
  const second = createDocument("second.png");
  const third = createDocument("third.png");
  addWorkspaceDocument(workspace, first);
  addWorkspaceDocument(workspace, second);
  addWorkspaceDocument(workspace, third);

  reorderWorkspaceDocument(workspace, 0, 2);
  assert.deepEqual(
    workspace.openDocuments.map((document) => document.fileName),
    ["second.png", "third.png", "first.png"],
  );

  closeWorkspaceDocument(workspace, third.id);
  assert.deepEqual(
    workspace.openDocuments.map((document) => document.id),
    [second.id, first.id],
  );
});

test("cycling tabs moves forward and backward across the open set", () => {
  const workspace = createEditorWorkspace();
  const first = createDocument("first.png");
  const second = createDocument("second.png");
  const third = createDocument("third.png");
  addWorkspaceDocument(workspace, first);
  addWorkspaceDocument(workspace, second);
  addWorkspaceDocument(workspace, third);
  workspace.activeDocumentId = first.id;

  cycleWorkspaceDocument(workspace, 1);
  assert.equal(workspace.activeDocumentId, second.id);
  cycleWorkspaceDocument(workspace, -1);
  assert.equal(workspace.activeDocumentId, first.id);
});

test("new Project instances do not share frozen settings objects", () => {
  const first = new Project();
  const second = new Project();

  first.settings.canvasSettings.width = 640;
  second.settings.canvasSettings.width = 1024;

  assert.equal(first.settings.canvasSettings.width, 640);
  assert.equal(second.settings.canvasSettings.width, 1024);
  assert.notEqual(first.settings, second.settings);
  assert.notEqual(first.settings.canvasSettings, second.settings.canvasSettings);
});
