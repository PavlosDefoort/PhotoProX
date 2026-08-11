import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVisualAnalysis,
  VISUAL_ANALYSIS_VERSION,
} from "../src/features/show-me/visual-analysis/types";

const validAnalysis = {
  version: VISUAL_ANALYSIS_VERSION,
  target: {
    scope: "selected-image-source",
    selectedLayerId: "layer-1",
    imageLayerIds: ["layer-1"],
    adjustmentLayerIds: [],
    editorRevision: "revision-1",
  },
  snapshot: {
    originalWidth: 10,
    originalHeight: 10,
    sampleWidth: 10,
    sampleHeight: 10,
    colorSpace: "srgb",
    alphaMode: "straight",
  },
  metrics: {
    luminance: {
      mean: 0.4,
      median: 0.4,
      p05: 0.1,
      p95: 0.7,
      shadowFraction: 0.2,
      midtoneFraction: 0.6,
      highlightFraction: 0.2,
    },
    clipping: {
      blackClippedFraction: 0,
      whiteClippedFraction: 0,
      nearBlackFraction: 0.01,
      nearWhiteFraction: 0.02,
    },
    contrast: {
      globalStdDev: 0.2,
      p95MinusP05: 0.6,
      flatnessScore: 0.2,
    },
    saturation: {
      mean: 0.3,
      median: 0.3,
      mutedFraction: 0.2,
      highSaturationFraction: 0.1,
    },
    colorBalance: {
      meanRed: 0.4,
      meanGreen: 0.38,
      meanBlue: 0.35,
      temperatureScore: 0.1,
      temperatureBias: "warm",
      tintScore: 0,
      tintBias: "neutral",
      dominantColors: [{ hex: "#804020", share: 1 }],
    },
  },
  observations: [
    {
      code: "warm-cast",
      severity: "info",
      confidence: 0.8,
      summary: "The overall colour balance leans warm.",
    },
  ],
  limits: {
    missingCapabilities: ["No semantic scene understanding."],
    warnings: ["Metrics are computed from a capped local snapshot, not the full-resolution original."],
  },
  provenance: {
    producer: "deterministic",
    runtime: "main-thread",
    durationMs: 4,
  },
};

test("accepts a valid serializable visual analysis result", () => {
  const parsed = parseVisualAnalysis(validAnalysis);
  assert.equal(parsed.version, VISUAL_ANALYSIS_VERSION);
});

test("rejects malformed schema values", () => {
  assert.throws(() =>
    parseVisualAnalysis({
      ...validAnalysis,
      metrics: {
        ...validAnalysis.metrics,
        luminance: {
          ...validAnalysis.metrics.luminance,
          mean: 1.5,
        },
      },
    }),
  );
});
