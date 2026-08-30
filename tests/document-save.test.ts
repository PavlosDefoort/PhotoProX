import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DocumentSaveTarget,
  ZynaloFileHandle,
} from "../src/interfaces/editor/EditorWorkspace";
import {
  createProjectBlob,
  createOpenedProjectSaveTarget,
  getCtrlSSaveAction,
  saveToTarget,
  supportsFileSystemAccess,
} from "../src/utils/DocumentSave";
import {
  createWorkspaceDocument,
  serializeWorkspaceDocument,
} from "../src/models/editor/EditorWorkspace";

const createHandle = (options?: { permission?: PermissionState; failWrite?: boolean }) => {
  const writes: Blob[] = [];
  let createWritableCalls = 0;
  const handle: ZynaloFileHandle = {
    kind: "file",
    name: "photo.png",
    getFile: async () => new File([], "photo.png"),
    queryPermission: async () => options?.permission ?? "granted",
    requestPermission: async () => options?.permission ?? "granted",
    createWritable: async () => {
      createWritableCalls += 1;
      return {
        write: async (data) => {
          if (options?.failWrite) throw new Error("disk full");
          assert.ok(data instanceof Blob);
          writes.push(data);
        },
        close: async () => undefined,
      };
    },
  };
  return { handle, writes, createWritableCalls: () => createWritableCalls };
};

const imageTarget = (
  handle: ZynaloFileHandle,
  format: "png" | "jpeg",
): DocumentSaveTarget => ({
  kind: "source-image",
  handle,
  format,
  fileName: format === "png" ? "photo.png" : "photo.jpg",
});

for (const format of ["png", "jpeg"] as const) {
  test(`opened ${format.toUpperCase()} saves the prepared flattened image to its source handle`, async () => {
    const mock = createHandle();
    let clean = false;
    const result = await saveToTarget(
      imageTarget(mock.handle, format),
      () => new Blob([format], { type: `image/${format}` }),
      () => { clean = true; },
    );
    assert.equal(result.status, "saved");
    assert.equal(mock.writes.length, 1);
    assert.equal(mock.writes[0].type, `image/${format}`);
    assert.equal(clean, true);
  });
}

test("permission is requested before encoding and denial changes neither target nor dirty state", async () => {
  const mock = createHandle({ permission: "denied" });
  const target = imageTarget(mock.handle, "png");
  let encoded = false;
  let clean = false;
  const result = await saveToTarget(
    target,
    () => { encoded = true; return new Blob(); },
    () => { clean = true; },
  );
  assert.equal(result.status, "permission-denied");
  assert.equal(encoded, false);
  assert.equal(clean, false);
  assert.equal(mock.createWritableCalls(), 0);
  assert.equal(target.kind, "source-image");
});

test("failed writes never invoke the clean-state commit", async () => {
  const mock = createHandle({ failWrite: true });
  let clean = false;
  await assert.rejects(() => saveToTarget(
    imageTarget(mock.handle, "png"),
    () => new Blob(["encoded"]),
    () => { clean = true; },
  ), /disk full/);
  assert.equal(clean, false);
});

test("a selected source or project target makes later Ctrl+S skip the choice dialog", () => {
  const source = createHandle().handle;
  const document = createWorkspaceDocument({ sourceFileName: "photo.png" });
  assert.deepEqual(getCtrlSSaveAction(document), {
    kind: "choose",
    mode: "opened-image",
  });

  document.saveTarget = imageTarget(source, "png");
  assert.equal(getCtrlSSaveAction(document).kind, "save");

  document.saveTarget = {
    kind: "zyn-project",
    handle: source,
    fileName: "photo.zyn",
  };
  assert.equal(getCtrlSSaveAction(document).kind, "save");
});

test("later Ctrl+S writes directly to the already-selected source target", async () => {
  const mock = createHandle();
  const target = imageTarget(mock.handle, "png");
  await saveToTarget(target, () => new Blob(["first"]), () => undefined);
  await saveToTarget(target, () => new Blob(["second"]), () => undefined);
  assert.equal(mock.writes.length, 2);
});

test("new documents receive the first-save choice", () => {
  const document = createWorkspaceDocument();
  document.isDirty = true;
  assert.deepEqual(getCtrlSSaveAction(document), {
    kind: "choose",
    mode: "new-document",
  });
  // Cancelling the UI performs no document mutation.
  assert.equal(document.isDirty, true);
  assert.equal(document.saveTarget, null);
});

test("opened Zynalo projects immediately target their existing handle", () => {
  const handle = createHandle().handle;
  const direct = createOpenedProjectSaveTarget("photo.zyn", handle);
  assert.equal(direct.kind, "zyn-project");
  assert.equal(getCtrlSSaveAction({ saveTarget: direct, sourceFileName: "photo.zyn" }).kind, "save");

  const fallback = createOpenedProjectSaveTarget("photo.zyn");
  assert.deepEqual(fallback, {
    kind: "download-fallback",
    format: "zyn",
    fileName: "photo.zyn",
  });
});

test("Zynalo serialization preserves editable state but excludes runtime file handles", async () => {
  const mock = createHandle();
  const document = createWorkspaceDocument({
    fileName: "photo.zyn",
    sourceFileHandle: mock.handle,
    saveTarget: {
      kind: "zyn-project",
      handle: mock.handle,
      fileName: "photo.zyn",
    },
  });
  document.editDocument.selections.layer = {
    layerId: "layer",
    inverted: false,
    paths: [{ kind: "lasso", feather: 0, mode: "new", points: [{ x: 4, y: 8 }] }],
  };
  const serialized = serializeWorkspaceDocument(document);
  const blobText = await createProjectBlob(document).text();
  assert.equal(JSON.parse(serialized).editDocument.selections.layer.paths[0].points[0].x, 4);
  assert.equal(blobText, serialized);
  assert.equal(serialized.includes("sourceFileHandle"), false);
  assert.equal(serialized.includes("saveTarget"), false);
});

test("unsupported browsers are detected for the explicit download fallback", () => {
  assert.equal(supportsFileSystemAccess({} as Window), false);
  assert.equal(supportsFileSystemAccess({
    showOpenFilePicker: async () => [],
    showSaveFilePicker: async () => createHandle().handle,
  } as unknown as Window), true);
});

test("fallback input opening supplies no writable handle and Export As does not replace Ctrl+S targets", () => {
  const imageInput = readFileSync(join(process.cwd(), "src/components/editor/ui/components/input/ImageInput.tsx"), "utf8");
  const exportDialog = readFileSync(join(process.cwd(), "src/components/editor/ui/components/bars/top-bar/navigation/menu/file/Export.tsx"), "utf8");
  const documentSave = readFileSync(join(process.cwd(), "src/utils/DocumentSave.ts"), "utf8");
  assert.match(imageInput, /openImageFile\(file\)/);
  assert.match(imageInput, /\.zyn/);
  assert.match(imageInput, /openProjectFile\(selectedFile\)/);
  assert.equal(exportDialog.includes("saveTarget"), false);
  assert.equal(exportDialog.includes("markDocumentSaved"), false);
  assert.match(documentSave, /types:\s*\[OPEN_DOCUMENT_PICKER_TYPE\]/);
  assert.match(documentSave, /description: "Images and Zynalo projects"/);
});
