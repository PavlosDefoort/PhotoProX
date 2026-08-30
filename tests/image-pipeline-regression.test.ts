import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { hydrateImageData, serializeImageData } from "../src/models/project/ImagePersistence";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

test("lossless import does not compress or change the selected file", () => {
  const input = read("src/components/editor/ui/components/input/ImageInput.tsx");
  const settings = read("src/interfaces/FirebaseInterfaces.ts");
  const editor = read("src/pages/editor.tsx");

  assert.match(input, /await setPhoto\(imageFile\)/);
  assert.doesNotMatch(input, /imageCompression\(/);
  assert.match(settings, /useCompression: false/);
  assert.match(editor, /originalBlob: file/);
  assert.match(editor, /originalMimeType: file\.type/);
});

test("preview sources cannot replace the full-resolution source", () => {
  const imageUtils = read("src/utils/ImageUtils.ts");
  assert.match(imageUtils, /fullResolutionSrc \?\? imageData\.src/);
  assert.match(imageUtils, /previewSrc = undefined/);
  assert.match(imageUtils, /fullResolutionSrc = src/);
});

test("production operations use the shared working-source setter", () => {
  const productionFiles = [
    "src/components/editor/ui/components/bars/tool-bar/tools/crop/CropTool.tsx",
    "src/components/editor/ui/components/bars/tool-bar/tools/artificial-intelligence/BackgroundRemover.tsx",
    "src/components/editor/ui/components/bars/tool-bar/tools/artificial-intelligence/Inpaint.tsx",
    "src/components/editor/ui/components/bars/top-bar/navigation/menu/image/BrightnessContrastDialog.tsx",
    "src/components/editor/ui/components/bars/top-bar/navigation/menu/image/CurvesDialog.tsx",
  ];
  for (const file of productionFiles) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /(?:\w+\.)?imageData\.src\s*=/,
      `${file} contains an unauthorized direct working-source write`,
    );
    assert.match(source, /setFullResolutionWorkingSource/);
  }
});

test("export does not apply a redundant compression pass", () => {
  const pixiUtils = read("src/utils/PixiUtils.ts");
  assert.doesNotMatch(pixiUtils, /imageCompression\(/);
  assert.match(pixiUtils, /renderer\.extract\.base64/);
});

test("normal textures avoid mipmap-induced softness", () => {
  const imageUtils = read("src/utils/ImageUtils.ts");
  assert.doesNotMatch(imageUtils, /mipmapFilter/);
  assert.match(imageUtils, /scaleMode: "linear"/);
});

test("project image persistence deduplicates shared sources and preserves divergent sources", () => {
  const shared = {
    src: "data:image/png;base64,shared",
    imageWidth: 2,
    imageHeight: 2,
    name: "shared.png",
    originalSourceSrc: "data:image/png;base64,shared",
    originalMimeType: "image/png",
    originalWidth: 2,
    originalHeight: 2,
  };
  const sharedJson = JSON.stringify(serializeImageData(shared));
  assert.equal(sharedJson.split(shared.src).length - 1, 1);

  const divergent = serializeImageData({
    ...shared,
    src: "data:image/png;base64,working",
    fullResolutionSrc: "data:image/png;base64,working",
    workingMimeType: "image/png",
  });
  const divergentJson = JSON.stringify(divergent);
  assert.equal(divergentJson.split(shared.originalSourceSrc).length - 1, 1);
  assert.equal(divergentJson.split("data:image/png;base64,working").length - 1, 1);
  const hydrated = hydrateImageData(divergent);
  assert.equal(hydrated?.originalSourceSrc, shared.originalSourceSrc);
  assert.equal(hydrated?.src, "data:image/png;base64,working");

  assert.equal(hydrateImageData({
    schemaVersion: 2,
    name: "bad",
    originalSource: { kind: "shared", width: 2, height: 2 },
  }), null);
  assert.equal(hydrateImageData({
    schemaVersion: 2,
    name: "bad",
    originalSource: { kind: "separate", src: "data:x", width: 2, height: 2 },
  }), null);
  assert.equal(hydrateImageData({
    schemaVersion: 99,
    name: "future",
    src: "data:x",
    imageWidth: 2,
    imageHeight: 2,
  } as any), null);

  const source = read("src/models/project/ImagePersistence.ts");
  const workspace = read("src/models/editor/EditorWorkspace.ts");
  assert.match(source, /dataUrlMime/);
  assert.match(source, /hydrateImageData/);
  assert.match(workspace, /serializeImageData\(layer\.imageData\)/);
  assert.doesNotMatch(workspace, /originalBlob/);
});

test("restoring from persisted original is an explicit working-source operation", () => {
  const source = read("src/utils/ImageUtils.ts");
  assert.match(source, /restoreWorkingSourceFromOriginal/);
  assert.match(source, /originalSourceSrc/);
  assert.match(source, /setFullResolutionWorkingSource\(/);
  assert.match(source, /previewSrc = undefined/);
});

test("workspace deserialization is versioned, transactional, and hydrates image data", () => {
  const source = read("src/models/editor/WorkspaceDeserialization.ts");
  const workspace = read("src/models/editor/EditorWorkspace.ts");
  assert.match(source, /parseWorkspaceDocument/);
  assert.match(source, /hydrateImageData\(raw\.imageData\)/);
  assert.match(source, /layerManager\.createImageLayer/);
  assert.match(source, /ids\.has\(item\.id\)/);
  assert.match(source, /schema version.*unsupported/);
  assert.match(source, /JSON\.parse/);
  assert.match(source, /texture\.destroy\(true\)/);
  assert.match(workspace, /schemaVersion: 2/);
});

test("project opening is exposed as a guarded file workflow", () => {
  const menu = read("src/components/editor/ui/components/bars/top-bar/navigation/menu/MenuNavigation.tsx");
  const editor = read("src/pages/editor.tsx");
  assert.match(menu, /Open Project/);
  assert.match(menu, /\.json,\.zyn/);
  assert.match(menu, /event\.target\.value = ""/);
  assert.match(menu, /openProjectFile\(file\)/);
  assert.match(editor, /deserializeWorkspaceDocument\(json\)/);
  assert.match(editor, /projectLoadToken/);
  assert.match(editor, /unsaved changes/);
  assert.match(editor, /draft\.openDocuments = \[document as any\]/);
});

test("100% inspection uses exact scale and DPR alignment helpers", () => {
  const source = read("src/utils/ViewportInspection.ts");
  const zoom = read("src/components/editor/ui/components/bars/top-bar/navigation/zoom-dropdown/ZoomDropDown.tsx");
  assert.match(source, /Math\.round\(cssCoordinate \* dpr\) \/ dpr/);
  assert.match(source, /backingWidth: canvas\.width/);
  assert.match(source, /zoomIs100: args\.zoom === 1/);
  assert.match(zoom, /setTargetZoom\(1\)/);
  assert.match(zoom, /100% \(Pixel inspection\)/);
  assert.match(zoom, /full-resolution.*proxy/);
});
