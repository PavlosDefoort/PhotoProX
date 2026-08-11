import assert from "node:assert/strict";
import test from "node:test";
import {
  AdjustmentEditState,
  EditDocument,
} from "../src/interfaces/editor/EditDocument";
import { EditorStateCommand } from "../src/models/commands/editor/EditorStateCommand";
import {
  applyImageAdjustmentAction,
  createEditDocument,
} from "../src/models/editor/EditDocument";
import { parseShowMeRequest } from "../src/features/show-me/parseShowMeRequest";
import { validateExecutableShowMePlan } from "../src/features/show-me/createShowMePlan";

const brightnessState: AdjustmentEditState = {
  id: "brightness-layer",
  type: "adjustment",
  kind: "brightness-contrast",
  values: { brightness: 1, contrast: 1, saturation: 1 },
};

test("adjustment actions produce serializable document state", () => {
  const document = createEditDocument();
  document.adjustmentLayers[brightnessState.id] =
    applyImageAdjustmentAction(brightnessState, {
      type: "adjustment.setBrightness",
      value: 1.25,
    });

  const serialized = JSON.stringify(document);
  const restored = JSON.parse(serialized) as EditDocument;
  assert.equal(
    restored.adjustmentLayers[brightnessState.id].values.brightness,
    1.25,
  );
});

test("one completed slider transaction is one undoable command", () => {
  const preview = applyImageAdjustmentAction(brightnessState, {
    type: "adjustment.setBrightness",
    value: 1.1,
  });
  const committed = applyImageAdjustmentAction(brightnessState, {
    type: "adjustment.setBrightness",
    value: 1.4,
  });
  let runtimeState = preview;
  const history: EditorStateCommand<AdjustmentEditState>[] = [];
  const command = new EditorStateCommand(
    "Set brightness",
    brightnessState,
    committed,
    (state) => {
      runtimeState = state;
    },
  );

  command.execute();
  history.push(command);
  assert.equal(history.length, 1);
  assert.equal(runtimeState.values.brightness, 1.4);

  history.pop()?.undo();
  assert.equal(runtimeState.values.brightness, 1);
});

test("adjustment actions reject out-of-range values", () => {
  for (const value of [-0.01, 2.01, Number.NaN]) {
    assert.throws(
      () =>
        applyImageAdjustmentAction(brightnessState, {
          type: "adjustment.setContrast",
          value,
        }),
      /between 0 and 2/,
    );
  }
});

test("Show Me resolves adjustment and transform actions atomically", () => {
  const context = {
    selectedLayerKind: "image" as const,
  };
  const parsed = parseShowMeRequest(
    "rotate 45 degrees clockwise and make this brighter",
    context,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const executable = validateExecutableShowMePlan(parsed.plan, context);
  assert.deepEqual(executable, {
    ok: true,
    actions: [
      { type: "image.rotateBy", degrees: 45 },
      { type: "adjustment.setBrightness", value: 1.1 },
    ],
  });
});

test("Show Me parses arbitrary rotation degrees", () => {
  const parsed = parseShowMeRequest("Rotate this 45 degrees clockwise", {
    selectedLayerKind: "image",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.plan.steps[0].toolId, "image.rotate.clockwise");
  assert.deepEqual(parsed.plan.steps[0].parameters, { degrees: 45 });
});

test("Show Me defaults bare rotation degrees to clockwise", () => {
  const parsed = parseShowMeRequest("Rotate this image 33 degrees", {
    selectedLayerKind: "image",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.plan.steps[0].toolId, "image.rotate.clockwise");
  assert.deepEqual(parsed.plan.steps[0].parameters, { degrees: 33 });
});

test("Show Me parses the supported grounded adjustment phrases", () => {
  const context = {
    selectedLayerKind: "image" as const,
  };
  const requests = [
    ["make this brighter", "adjustment.brightness", 1.1],
    ["increase contrast", "adjustment.contrast", 1.1],
    ["make the colours more vivid", "adjustment.saturation", 1.2],
    ["set brightness to 20", "adjustment.brightness", 1.2],
  ] as const;

  for (const [request, toolId, value] of requests) {
    const parsed = parseShowMeRequest(request, context);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) continue;
    assert.equal(parsed.plan.steps[0].toolId, toolId);
    assert.deepEqual(parsed.plan.steps[0].parameters, { value });
  }
});

test("contrast planning is allowed from a plain selected image", () => {
  const parsed = parseShowMeRequest("increase contrast", {
    selectedLayerKind: "image",
  });
  assert.equal(parsed.ok, true);
});
