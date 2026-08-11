import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAssistantProviderId,
  shouldUseFallbackInterpreter,
} from "../src/features/show-me/assistantRouting";
import { parseInterpretResult } from "../src/features/show-me/interpretFallback";
import { resolveUntrustedShowMeResponse } from "../src/features/show-me/createShowMePlan";

const imageContext = {
  selectedLayerKind: "image" as const,
  availableAdjustmentToolIds: [],
};

test("fallback interpreter only runs for ambiguous requests when local AI is allowed", () => {
  assert.equal(shouldUseFallbackInterpreter("ambiguous", "auto"), true);
  assert.equal(shouldUseFallbackInterpreter("ambiguous", "ollama-local"), true);
  assert.equal(shouldUseFallbackInterpreter("ambiguous", "deterministic"), false);
  assert.equal(shouldUseFallbackInterpreter("edit", "auto"), false);
  assert.equal(shouldUseFallbackInterpreter("analysis", "auto"), false);
  assert.equal(shouldUseFallbackInterpreter("learn", "auto"), false);
  assert.equal(shouldUseFallbackInterpreter("subjective", "auto"), false);
  // fallback never changes which provider deterministically owns a known intent
  assert.equal(resolveAssistantProviderId("edit", "auto"), "deterministic");
});

test("parseInterpretResult keeps edit steps but strips steps from other routes", () => {
  const edit = parseInterpretResult({
    mode: "interpret",
    route: "edit",
    steps: [{ toolId: "image.rotate.clockwise", parameters: { degrees: 33 } }],
  });
  assert.equal(edit.route, "edit");
  assert.equal(edit.steps.length, 1);

  const analysis = parseInterpretResult({
    route: "analysis",
    steps: [{ toolId: "image.rotate.clockwise", parameters: { degrees: 33 } }],
  });
  assert.equal(analysis.route, "analysis");
  assert.deepEqual(analysis.steps, []);

  const learn = parseInterpretResult({
    route: "learn",
    steps: [{ toolId: "adjustment.brightness", parameters: { value: 1.2 } }],
  });
  assert.equal(learn.route, "learn");
  assert.deepEqual(learn.steps, []);
});

test("parseInterpretResult defaults unknown or malformed output to none", () => {
  assert.deepEqual(parseInterpretResult({ route: "delete-everything" }), {
    route: "none",
    steps: [],
  });
  assert.deepEqual(parseInterpretResult("not json"), { route: "none", steps: [] });
  assert.deepEqual(parseInterpretResult(null), { route: "none", steps: [] });
});

test("edit-route steps still pass through the registry validation boundary", () => {
  const good = parseInterpretResult({
    route: "edit",
    steps: [{ toolId: "image.rotate.clockwise", parameters: { degrees: 33 } }],
  });
  const resolvedGood = resolveUntrustedShowMeResponse(
    "turn it a third of the way",
    { mode: "edit-plan", steps: good.steps },
    imageContext,
  );
  assert.equal(resolvedGood.ok, true);
  if (resolvedGood.ok) {
    assert.equal(resolvedGood.resolved.mode, "edit-plan");
  }

  const bad = parseInterpretResult({
    route: "edit",
    steps: [{ toolId: "image.magically-enhance", parameters: {} }],
  });
  const resolvedBad = resolveUntrustedShowMeResponse(
    "make it amazing",
    { mode: "edit-plan", steps: bad.steps },
    imageContext,
  );
  assert.equal(resolvedBad.ok, false);
});
