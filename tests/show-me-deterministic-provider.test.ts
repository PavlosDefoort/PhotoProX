import assert from "node:assert/strict";
import test from "node:test";
import { resolveUntrustedShowMeResponse } from "../src/features/show-me/createShowMePlan";
import { toEditPlanToolManifest } from "../src/features/show-me/providers";
import { DeterministicEditPlanProvider } from "../src/features/show-me/providers/DeterministicEditPlanProvider";
import { getZynaloToolManifest } from "../src/features/show-me/tools/zynaloToolRegistry";
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
  supportedToolIds: getZynaloToolManifest({
    selectedLayerKind: "image" as const,
    availableAdjustmentToolIds: [],
  }).tools.map((tool) => tool.id),
};

const toolManifest = toEditPlanToolManifest(
  getZynaloToolManifest({
    selectedLayerKind: "image" as const,
    availableAdjustmentToolIds: [],
  }),
);

const visualAnalysisFixture = parseVisualAnalysis({
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
      mean: 0.55,
      median: 0.56,
      p05: 0.19,
      p95: 0.88,
      shadowFraction: 0.16,
      midtoneFraction: 0.55,
      highlightFraction: 0.29,
    },
    clipping: {
      blackClippedFraction: 0,
      whiteClippedFraction: 0.01,
      nearBlackFraction: 0.02,
      nearWhiteFraction: 0.06,
    },
    contrast: {
      globalStdDev: 0.22,
      p95MinusP05: 0.44,
      flatnessScore: 0.18,
    },
    saturation: {
      mean: 0.74,
      median: 0.72,
      mutedFraction: 0.08,
      highSaturationFraction: 0.58,
    },
    colorBalance: {
      meanRed: 0.57,
      meanGreen: 0.46,
      meanBlue: 0.39,
      temperatureScore: 0.22,
      temperatureBias: "warm",
      tintScore: 0.02,
      tintBias: "neutral",
      dominantColors: [{ hex: "#b87333", share: 0.41 }],
    },
  },
  observations: [
    {
      code: "high-saturation",
      severity: "warning",
      confidence: 0.88,
      summary: "Colours appear globally intense.",
    },
  ],
  limits: {
    missingCapabilities: ["No semantic scene understanding."],
    warnings: ["Global snapshot only."],
  },
  provenance: {
    producer: "deterministic",
    runtime: "main-thread",
    durationMs: 2.4,
  },
});

const darkFlatFixture = parseVisualAnalysis({
  version: VISUAL_ANALYSIS_VERSION,
  target: {
    scope: "selected-image-source",
    selectedLayerId: "layer-2",
    imageLayerIds: ["layer-2"],
    adjustmentLayerIds: [],
    editorRevision: "revision-2",
  },
  snapshot: {
    originalWidth: 1600,
    originalHeight: 900,
    sampleWidth: 512,
    sampleHeight: 288,
    colorSpace: "srgb",
    alphaMode: "straight",
  },
  metrics: {
    luminance: {
      mean: 0.24,
      median: 0.23,
      p05: 0.03,
      p95: 0.39,
      shadowFraction: 0.42,
      midtoneFraction: 0.53,
      highlightFraction: 0.05,
    },
    clipping: {
      blackClippedFraction: 0.03,
      whiteClippedFraction: 0,
      nearBlackFraction: 0.12,
      nearWhiteFraction: 0.01,
    },
    contrast: {
      globalStdDev: 0.12,
      p95MinusP05: 0.22,
      flatnessScore: 0.72,
    },
    saturation: {
      mean: 0.2,
      median: 0.18,
      mutedFraction: 0.51,
      highSaturationFraction: 0.06,
    },
    colorBalance: {
      meanRed: 0.42,
      meanGreen: 0.42,
      meanBlue: 0.43,
      temperatureScore: -0.02,
      temperatureBias: "neutral",
      tintScore: -0.01,
      tintBias: "neutral",
      dominantColors: [{ hex: "#4f4f55", share: 0.38 }],
    },
  },
  observations: [
    {
      code: "low-exposure",
      severity: "warning",
      confidence: 0.86,
      summary: "The image is globally dark.",
    },
    {
      code: "low-contrast",
      severity: "warning",
      confidence: 0.81,
      summary: "The tonal separation looks restrained or flat.",
    },
    {
      code: "shadow-clipping-risk",
      severity: "warning",
      confidence: 0.74,
      summary: "Shadow detail may be clipped.",
    },
  ],
  limits: {
    missingCapabilities: ["No semantic scene understanding."],
    warnings: ["Global snapshot only."],
  },
  provenance: {
    producer: "deterministic",
    runtime: "main-thread",
    durationMs: 2.8,
  },
});

test("built-in provider can answer saturation questions from planner visual context", async () => {
  const provider = new DeterministicEditPlanProvider();
  const result = await provider.createPlan({
    request: "is the saturation on this image high?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    "is the saturation on this image high?",
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;

  assert.equal(resolved.resolved.mode, "analysis-answer");
  assert.match(resolved.resolved.answer.answer, /saturation is high/i);
  assert.match(resolved.resolved.answer.followUp || "", /editable saturation suggestion/i);
});

test("built-in provider answers dark and flat binary questions from planner visual context", async () => {
  const provider = new DeterministicEditPlanProvider();
  const visualContext = toPlannerVisualContext(darkFlatFixture);

  const darkResult = await provider.createPlan({
    request: "is this image dark?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext,
  });
  assert.equal(darkResult.ok, true);
  if (!darkResult.ok) return;

  const darkResolved = resolveUntrustedShowMeResponse(
    "is this image dark?",
    darkResult.response,
    imageContext,
  );
  assert.equal(darkResolved.ok, true);
  if (!darkResolved.ok) return;
  assert.equal(darkResolved.resolved.mode, "analysis-answer");
  assert.match(darkResolved.resolved.answer.answer, /globally dark/i);

  const flatResult = await provider.createPlan({
    request: "does this image look flat?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext,
  });
  assert.equal(flatResult.ok, true);
  if (!flatResult.ok) return;

  const flatResolved = resolveUntrustedShowMeResponse(
    "does this image look flat?",
    flatResult.response,
    imageContext,
  );
  assert.equal(flatResolved.ok, true);
  if (!flatResolved.ok) return;
  assert.equal(flatResolved.resolved.mode, "analysis-answer");
  assert.match(flatResolved.resolved.answer.answer, /looks flat/i);
});

test("built-in provider answers colour-balance and clipping questions from planner visual context", async () => {
  const provider = new DeterministicEditPlanProvider();

  const warmResult = await provider.createPlan({
    request: "is this image warm?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });
  assert.equal(warmResult.ok, true);
  if (!warmResult.ok) return;

  const warmResolved = resolveUntrustedShowMeResponse(
    "is this image warm?",
    warmResult.response,
    imageContext,
  );
  assert.equal(warmResolved.ok, true);
  if (!warmResolved.ok) return;
  assert.equal(warmResolved.resolved.mode, "analysis-answer");
  assert.match(warmResolved.resolved.answer.answer, /warm overall colour balance/i);

  const clippingResult = await provider.createPlan({
    request: "are the shadows clipped?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext: toPlannerVisualContext(darkFlatFixture),
  });
  assert.equal(clippingResult.ok, true);
  if (!clippingResult.ok) return;

  const clippingResolved = resolveUntrustedShowMeResponse(
    "are the shadows clipped?",
    clippingResult.response,
    imageContext,
  );
  assert.equal(clippingResolved.ok, true);
  if (!clippingResolved.ok) return;
  assert.equal(clippingResolved.resolved.mode, "analysis-answer");
  assert.match(clippingResolved.resolved.answer.answer, /shadow clipping risk/i);
});

test("built-in provider answers dominant colour analysis without creating a plan", async () => {
  const provider = new DeterministicEditPlanProvider();
  const result = await provider.createPlan({
    request: "what colours are dominant in this image?",
    interactionMode: "analysis-answer",
    toolManifest,
    context: imageContext,
    visualContext: toPlannerVisualContext(visualAnalysisFixture),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    "what colours are dominant in this image?",
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.resolved.mode, "analysis-answer");
  assert.ok(
    resolved.resolved.answer.evidence.some((entry) => /#b87333/i.test(entry)),
  );
});

test("built-in provider answers learning requests from trusted tool education", async () => {
  const provider = new DeterministicEditPlanProvider();
  const result = await provider.createPlan({
    request: "what does contrast do?",
    interactionMode: "learn-answer",
    toolManifest,
    context: imageContext,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const resolved = resolveUntrustedShowMeResponse(
    "what does contrast do?",
    result.response,
    imageContext,
  );
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.resolved.mode, "learning-answer");
  assert.match(resolved.resolved.answer.answer, /contrast/i);
  assert.deepEqual(resolved.resolved.answer.relatedTools, ["adjustment.contrast"]);
});
