import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkspaceDocument, PROJECT_SCHEMA_VERSION } from "../src/models/editor/WorkspaceDeserialization";

const valid = () => ({
  schemaVersion: PROJECT_SCHEMA_VERSION,
  documentId: "document-1",
  preferredImageType: "png",
  project: { settings: { canvasSettings: { width: 800, height: 600 } } },
  layers: [],
  layerManager: { target: "" },
  editDocument: {},
});

test("validates a supported project before workspace replacement", () => {
  assert.equal(parseWorkspaceDocument(JSON.stringify(valid())).documentId, "document-1");
});

test("distinguishes a newer schema from corrupt data", () => {
  const project = valid();
  project.schemaVersion = PROJECT_SCHEMA_VERSION + 1;
  assert.throws(() => parseWorkspaceDocument(JSON.stringify(project)), /^Error: Unsupported Zynalo project:/);
  assert.throws(() => parseWorkspaceDocument("not json"), /^Error: Invalid Zynalo project:/);
});

test("rejects invalid dimensions, duplicate IDs, and dangling targets", () => {
  const dimensions = valid();
  dimensions.project.settings.canvasSettings.width = 0;
  assert.throws(() => parseWorkspaceDocument(JSON.stringify(dimensions)), /canvas dimensions/);

  const duplicate = valid() as any;
  duplicate.layers = [
    { id: "same", kind: "background", name: "A", visible: true, opacity: 1, zIndex: 0 },
    { id: "same", kind: "background", name: "B", visible: true, opacity: 1, zIndex: 1 },
  ];
  assert.throws(() => parseWorkspaceDocument(JSON.stringify(duplicate)), /unique/);

  const dangling = valid();
  dangling.layerManager.target = "missing";
  assert.throws(() => parseWorkspaceDocument(JSON.stringify(dangling)), /target layer ID/);
});
