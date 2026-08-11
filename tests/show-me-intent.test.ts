import assert from "node:assert/strict";
import test from "node:test";
import { classifyShowMeIntent } from "../src/features/show-me/classifyShowMeIntent";
import {
  resolveAssistantProviderId,
  resolveAssistantProvenance,
} from "../src/features/show-me/assistantRouting";
import { DeterministicEditPlanProvider } from "../src/features/show-me/providers/DeterministicEditPlanProvider";
import { toEditPlanToolManifest } from "../src/features/show-me/providers";
import { resolveUntrustedShowMeResponse, validateExecutableShowMePlan } from "../src/features/show-me/createShowMePlan";
import { parseShowMeRequest } from "../src/features/show-me/parseShowMeRequest";
import { getPhotoProxToolManifest } from "../src/features/show-me/tools/photoProxToolRegistry";
import {
  parseVisualAnalysis,
  toPlannerVisualContext,
  VISUAL_ANALYSIS_VERSION,
} from "../src/features/show-me/visual-analysis";

const imageContext = {
  selectedLayerKind: "image" as const,
  availableAdjustmentToolIds: [],
  imageDimensions: { width: 1920, height: 1080 },
  currentAdjustmentValues: {},
  supportedToolIds: getPhotoProxToolManifest({
    selectedLayerKind: "image" as const,
    availableAdjustmentToolIds: [],
  }).tools.map((tool) => tool.id),
};

const toolManifest = toEditPlanToolManifest(
  getPhotoProxToolManifest({
    selectedLayerKind: "image" as const,
    availableAdjustmentToolIds: [],
  }),
);

const visualContext = toPlannerVisualContext(
  parseVisualAnalysis({
    version: VISUAL_ANALYSIS_VERSION,
    target: {
      scope: "selected-image-source",
      selectedLayerId: "layer-1",
      imageLayerIds: ["layer-1"],
      adjustmentLayerIds: [],
      editorRevision: "revision-1",
    },
    snapshot: {
      originalWidth: 1920,
      originalHeight: 1080,
      sampleWidth: 512,
      sampleHeight: 288,
      colorSpace: "srgb",
      alphaMode: "straight",
    },
    metrics: {
      luminance: {
        mean: 0.74,
        median: 0.75,
        p05: 0.4,
        p95: 0.95,
        shadowFraction: 0.08,
        midtoneFraction: 0.54,
        highlightFraction: 0.38,
      },
      clipping: {
        blackClippedFraction: 0,
        whiteClippedFraction: 0.01,
        nearBlackFraction: 0.02,
        nearWhiteFraction: 0.08,
      },
      contrast: {
        globalStdDev: 0.16,
        p95MinusP05: 0.33,
        flatnessScore: 0.61,
      },
      saturation: {
        mean: 0.32,
        median: 0.31,
        mutedFraction: 0.28,
        highSaturationFraction: 0.12,
      },
      colorBalance: {
        meanRed: 0.52,
        meanGreen: 0.48,
        meanBlue: 0.44,
        temperatureScore: 0.11,
        temperatureBias: "warm",
        tintScore: 0,
        tintBias: "neutral",
        dominantColors: [{ hex: "#c8b080", share: 0.4 }],
      },
    },
    observations: [
      {
        code: "high-exposure",
        severity: "warning",
        confidence: 0.81,
        summary: "The image is globally bright.",
      },
      {
        code: "low-contrast",
        severity: "warning",
        confidence: 0.75,
        summary: "The image looks somewhat flat.",
      },
    ],
    limits: {
      missingCapabilities: ["No semantic scene understanding."],
      warnings: ["Global snapshot only."],
    },
    provenance: {
      producer: "deterministic",
      runtime: "main-thread",
      durationMs: 2.1,
    },
  }),
);

test("classifies obvious analysis, learning, and edit requests deterministically", () => {
  assert.equal(classifyShowMeIntent("Is this image bright?", imageContext).intent, "analysis");
  assert.equal(
    classifyShowMeIntent("Why is brightness important?", imageContext).intent,
    "learn",
  );
  assert.equal(
    classifyShowMeIntent("What does contrast do?", imageContext).intent,
    "learn",
  );
  assert.equal(
    classifyShowMeIntent("Make this brighter.", imageContext).intent,
    "edit",
  );
  assert.equal(
    classifyShowMeIntent("Make this feel professional but still warm and candid.", imageContext).intent,
    "subjective",
  );
});

test("asks for clarification on ambiguous tool-only requests", () => {
  const result = classifyShowMeIntent("contrast?", imageContext);
  assert.equal(result.intent, "ambiguous");
  assert.match(result.clarificationQuestion || "", /explanation|editable/i);
});

test("resolves clarification-style learning replies directly", () => {
  assert.equal(classifyShowMeIntent("explanation", imageContext).intent, "learn");
  assert.equal(classifyShowMeIntent("explain", imageContext).intent, "learn");
});

test("routes obvious commands away from local AI and keeps subjective requests on local AI", () => {
  assert.equal(resolveAssistantProviderId("edit", "auto"), "deterministic");
  assert.equal(resolveAssistantProviderId("analysis", "ollama-local"), "deterministic");
  assert.equal(resolveAssistantProviderId("learn", "ollama-local"), "deterministic");
  assert.equal(resolveAssistantProviderId("subjective", "auto"), "ollama-local");
  assert.equal(resolveAssistantProviderId("subjective", "deterministic"), "deterministic");
  assert.equal(resolveAssistantProvenance("analysis", "deterministic"), "Image analysis");
  assert.equal(resolveAssistantProvenance("learn", "deterministic"), "Photo guide");
});

test('analysis requests like "Is this image bright?" cannot create an executable plan', async () => {
  const provider = new DeterministicEditPlanProvider();
  const result = await provider.createPlan({
    request: "Is this image bright?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    "Is this image bright?",
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.resolved.mode, "analysis-answer");
  if (resolved.resolved.mode === "analysis-answer") {
    assert.equal(
      validateExecutableShowMePlan(resolved.resolved as unknown, imageContext).ok,
      false,
    );
  }
});

// Phase 2 regression tests — these define the correct behavior before the
// code changes that enforce it.

test('"Why is this image dark?" routes to analysis, never to edit', () => {
  assert.equal(
    classifyShowMeIntent("Why is this image dark?", imageContext).intent,
    "analysis",
  );
  // And the parser must not produce an edit plan from it either.
  const parsed = parseShowMeRequest("Why is this image dark?", imageContext);
  // After Phase 2: this must NOT produce a brightness edit.
  // It may currently produce one; the test locks the desired final behaviour.
  if (parsed.ok) {
    // No step should be a brightness edit triggered solely by a "why" question.
    assert.equal(
      parsed.plan.steps.some((s) => s.toolId === "adjustment.brightness"),
      false,
      "parseShowMeRequest must not map 'why' analysis phrasing to a brightness edit",
    );
  }
});

test('"What does contrast do?" routes to learn with Photo guide provenance', () => {
  assert.equal(
    classifyShowMeIntent("What does contrast do?", imageContext).intent,
    "learn",
  );
  assert.equal(
    resolveAssistantProvenance("learn", "deterministic"),
    "Photo guide",
  );
});

test("explicit supported commands remain deterministic with Instant provenance", () => {
  assert.equal(
    classifyShowMeIntent("Rotate this 90 degrees clockwise", imageContext).intent,
    "edit",
  );
  assert.equal(
    classifyShowMeIntent("Make this brighter.", imageContext).intent,
    "edit",
  );
  assert.equal(resolveAssistantProvenance("edit", "deterministic"), "Instant");
  const parsed = parseShowMeRequest("rotate 90 degrees clockwise", imageContext);
  assert.equal(parsed.ok, true);
});

test('"scale by a third" is directionally ambiguous and must not parse to a plan', () => {
  // "Scale by a third" is ambiguous: reduce by ⅓ (→ ~67%) or scale to ⅓ (→ 33%).
  // The parser must not resolve this to a specific percentage.
  const parsed = parseShowMeRequest("scale by a third", imageContext);
  assert.equal(
    parsed.ok,
    false,
    "Directionally ambiguous scale commands must not resolve to an edit plan",
  );
});

test('"scale this to 33%" is unambiguous and parses correctly', () => {
  const parsed = parseShowMeRequest("scale this to 33%", imageContext);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.plan.steps[0].toolId, "image.scale.percent");
  assert.deepEqual(parsed.plan.steps[0].parameters, { percent: 33 });
});

test("no model-generated response bypasses registry validation", () => {
  // Even if a model returns a plausible-looking edit plan, every toolId and
  // parameter set must pass the registry boundary.
  const modelOutputWithUnknownTool = {
    mode: "edit-plan",
    steps: [{ toolId: "image.magic-enhance", parameters: {} }],
  };
  const resolved = resolveUntrustedShowMeResponse(
    "make it perfect",
    modelOutputWithUnknownTool,
    imageContext,
  );
  assert.equal(resolved.ok, false);
  if (!resolved.ok) {
    assert.match(resolved.error, /Unknown PhotoProx tool/i);
  }

  const modelOutputOutOfRange = {
    mode: "edit-plan",
    steps: [{ toolId: "adjustment.brightness", parameters: { value: 999 } }],
  };
  const resolved2 = resolveUntrustedShowMeResponse(
    "maximum brightness",
    modelOutputOutOfRange,
    imageContext,
  );
  assert.equal(resolved2.ok, false);
});
