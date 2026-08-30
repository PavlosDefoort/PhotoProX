import assert from "node:assert/strict";
import test from "node:test";
import {
  createShowMePlanStepFromUnknown,
  validateExecutableShowMePlan,
} from "../src/features/show-me/createShowMePlan";
import { parseShowMeRequest } from "../src/features/show-me/parseShowMeRequest";
import { getZynaloToolManifest } from "../src/features/show-me/tools/zynaloToolRegistry";

const imageContext = { selectedLayerKind: "image" as const };

test("parses the existing supported requests through registered tools", () => {
  const cases = [
    ["rotate 90 degrees clockwise", ["image.rotate.clockwise"]],
    [
      "rotate 90 degrees counterclockwise",
      ["image.rotate.counterclockwise"],
    ],
    ["resize to 50%", ["image.scale.percent"]],
    ["scale down by 1.5", ["image.scale.percent"]],
    ["make this brighter without washing it out", ["adjustment.brightness"]],
    ["make the colours more vivid", ["adjustment.saturation"]],
    ["reduce saturation", ["adjustment.saturation"]],
    [
      "rotate 90 degrees clockwise, then resize to 50%",
      ["image.rotate.clockwise", "image.scale.percent"],
    ],
  ] as const;

  for (const [request, expectedTools] of cases) {
    const result = parseShowMeRequest(request, imageContext);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(
        result.plan.steps.map((step) => step.toolId),
        expectedTools,
      );
    }
  }
});

test("analysis why-phrases do not parse to edits after Phase 2", () => {
  // These used to silently map analysis phrasing to edits. They must not do so
  // anymore; the intent classifier routes them to analysis instead.
  const analysisPhrases = [
    "why does this image look flat?",
    "why does this image look dark?",
    "why do the colours look muted?",
    "why is the color intensity strong",
  ];
  for (const phrase of analysisPhrases) {
    const result = parseShowMeRequest(phrase, imageContext);
    assert.equal(
      result.ok,
      false,
      `"${phrase}" must not parse to an edit plan — route to analysis instead`,
    );
  }
});

test("rejects an unknown tool before it can create actions", () => {
  const result = createShowMePlanStepFromUnknown(
    "invented-step",
    "image.magically-enhance",
    {},
    imageContext,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /Unknown Zynalo tool/);
  }
});

test("exports a data-only manifest for the current selection", () => {
  const manifest = getZynaloToolManifest(imageContext);
  assert.deepEqual(
    manifest.tools.map((tool) => tool.id),
    [
      "image.rotate.clockwise",
      "image.rotate.counterclockwise",
      "image.scale.percent",
      "adjustment.brightness",
      "adjustment.contrast",
      "adjustment.saturation",
    ],
  );
  assert.doesNotMatch(JSON.stringify(manifest), /createActions|supports/);
});

test("rejects unsafe scale parameters before they can create actions", () => {
  for (const percent of [0, -10, 401, Number.NaN]) {
    const result = createShowMePlanStepFromUnknown(
      "invalid-scale",
      "image.scale.percent",
      { percent },
      imageContext,
    );
    assert.equal(result.ok, false);
  }
});

test("rejects out-of-range adjustment parameters at the registry boundary", () => {
  const result = createShowMePlanStepFromUnknown(
    "unsafe-brightness",
    "adjustment.brightness",
    { value: 2.1 },
    { selectedLayerKind: "brightness-adjustment" },
  );

  assert.equal(result.ok, false);
});

test("rejects valid tools when the selected layer is unsupported", () => {
  const result = createShowMePlanStepFromUnknown(
    "rotate-background",
    "image.rotate.clockwise",
    { degrees: 90 },
    { selectedLayerKind: "other" },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /not supported for the selected layer/);
  }
});

test("revalidates untrusted plan data before execution", () => {
  const result = validateExecutableShowMePlan(
    {
      request: "resize far beyond the safe range",
      steps: [
        {
          id: "unsafe-scale",
          toolId: "image.scale.percent",
          parameters: { percent: 1000 },
          actions: [{ type: "image.resizeToPercent", percent: 50 }],
        },
      ],
    },
    imageContext,
  );

  assert.equal(result.ok, false);
});

test("document-backed adjustment tools create validated actions", () => {
  const result = createShowMePlanStepFromUnknown(
    "brightness",
    "adjustment.brightness",
    { value: 1.2 },
    { selectedLayerKind: "brightness-adjustment" },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.step.actions, [
      { type: "adjustment.setBrightness", value: 1.2 },
    ]);
  }
});

test("combined plans regenerate registered actions in atomic order", () => {
  const parsed = parseShowMeRequest(
    "rotate 90 degrees clockwise, then scale down by 1.5",
    imageContext,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const executable = validateExecutableShowMePlan(
    parsed.plan,
    imageContext,
  );
  assert.equal(executable.ok, true);
  if (executable.ok) {
    assert.deepEqual(executable.actions, [
      { type: "image.rotateBy", degrees: 90 },
      {
        type: "image.resizeToPercent",
        percent: 100 / 1.5,
      },
    ]);
  }
});

test("counterclockwise plans produce a negative rotation action", () => {
  const parsed = parseShowMeRequest(
    "rotate 90 degrees counterclockwise",
    imageContext,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const executable = validateExecutableShowMePlan(
    parsed.plan,
    imageContext,
  );
  assert.deepEqual(executable, {
    ok: true,
    actions: [{ type: "image.rotateBy", degrees: -90 }],
  });
});
