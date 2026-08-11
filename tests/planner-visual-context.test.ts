import assert from "node:assert/strict";
import test from "node:test";
import {
  getFreshPlannerVisualContext,
  parsePlannerVisualContext,
  parseVisualAnalysis,
  toPlannerVisualContext,
  VISUAL_ANALYSIS_VERSION,
} from "../src/features/show-me/visual-analysis";

const visualAnalysisFixture = parseVisualAnalysis({
  version: VISUAL_ANALYSIS_VERSION,
  target: {
    scope: "selected-image-source",
    selectedLayerId: "layer-1",
    imageLayerIds: ["layer-1"],
    adjustmentLayerIds: ["adjustment-1"],
    editorRevision: "rev-1",
  },
  snapshot: {
    originalWidth: 1000,
    originalHeight: 800,
    sampleWidth: 512,
    sampleHeight: 410,
    colorSpace: "srgb",
    alphaMode: "straight",
  },
  metrics: {
    luminance: {
      mean: 0.31,
      median: 0.3,
      p05: 0.08,
      p95: 0.66,
      shadowFraction: 0.3,
      midtoneFraction: 0.58,
      highlightFraction: 0.12,
    },
    clipping: {
      blackClippedFraction: 0.01,
      whiteClippedFraction: 0,
      nearBlackFraction: 0.09,
      nearWhiteFraction: 0.01,
    },
    contrast: {
      globalStdDev: 0.17,
      p95MinusP05: 0.29,
      flatnessScore: 0.72,
    },
    saturation: {
      mean: 0.21,
      median: 0.18,
      mutedFraction: 0.5,
      highSaturationFraction: 0.07,
    },
    colorBalance: {
      meanRed: 0.48,
      meanGreen: 0.44,
      meanBlue: 0.38,
      temperatureScore: 0.16,
      temperatureBias: "warm",
      tintScore: 0.03,
      tintBias: "neutral",
      dominantColors: [
        { hex: "#705030", share: 0.45 },
        { hex: "#403020", share: 0.33 },
        { hex: "#a08060", share: 0.1 },
        { hex: "#ffffff", share: 0.05 },
      ],
    },
  },
  observations: [
    {
      code: "low-exposure",
      severity: "warning",
      confidence: 0.83,
      summary: "The image is globally dark.",
    },
    {
      code: "low-contrast",
      severity: "warning",
      confidence: 0.77,
      summary: "The tonal separation looks restrained or flat.",
    },
    {
      code: "shadow-clipping-risk",
      severity: "warning",
      confidence: 0.61,
      summary: "Dark regions are close to clipping.",
    },
  ],
  limits: {
    missingCapabilities: [
      "No semantic scene understanding.",
      "No region-aware masking or subject detection.",
    ],
    warnings: [
      "Metrics are computed from a capped local snapshot, not the full-resolution original.",
    ],
  },
  provenance: {
    producer: "deterministic",
    runtime: "worker",
    durationMs: 6.4,
  },
});

test("converts validated visual analysis into a small planner visual context", () => {
  const context = toPlannerVisualContext(visualAnalysisFixture);

  assert.equal(context.analysisStatus, "ready");
  assert.equal(context.scope, "selected-image-source");
  assert.equal(context.exposure.level, "low");
  assert.equal(context.contrast.level, "low");
  assert.equal(context.clippingRisk.shadows, true);
  assert.equal(context.dominantColors.length, 3);
  assert.doesNotMatch(JSON.stringify(context), /sampleWidth|sampleHeight|selectedLayerId|editorRevision/);
});

test("returns fresh planner context only for matching layer and revision", () => {
  const fresh = getFreshPlannerVisualContext(visualAnalysisFixture, {
    selectedLayerId: "layer-1",
    editorRevision: "rev-1",
  });
  const stale = getFreshPlannerVisualContext(visualAnalysisFixture, {
    selectedLayerId: "layer-1",
    editorRevision: "rev-2",
  });
  const mismatched = getFreshPlannerVisualContext(visualAnalysisFixture, {
    selectedLayerId: "layer-2",
    editorRevision: "rev-1",
  });

  assert.ok(fresh);
  assert.equal(stale, null);
  assert.equal(mismatched, null);
});

test("planner visual context schema rejects malformed data", () => {
  const context = toPlannerVisualContext(visualAnalysisFixture);
  assert.throws(() =>
    parsePlannerVisualContext({
      ...context,
      dominantColors: [{ hex: "not-a-colour", share: 2 }],
    }),
  );
});
