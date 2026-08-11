import assert from "node:assert/strict";
import test from "node:test";
import {
  LatestVisualAnalysisRunner,
  VisualAnalysisRunResult,
} from "../src/features/show-me/visual-analysis/runner";
import {
  parseVisualAnalysis,
  VISUAL_ANALYSIS_VERSION,
} from "../src/features/show-me/visual-analysis/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createAnalysis = (revision: string) =>
  parseVisualAnalysis({
    version: VISUAL_ANALYSIS_VERSION,
    target: {
      scope: "selected-image-source",
      selectedLayerId: "layer-1",
      imageLayerIds: ["layer-1"],
      adjustmentLayerIds: [],
      editorRevision: revision,
    },
    snapshot: {
      originalWidth: 8,
      originalHeight: 8,
      sampleWidth: 8,
      sampleHeight: 8,
      colorSpace: "srgb",
      alphaMode: "straight",
    },
    metrics: {
      luminance: {
        mean: 0.5,
        median: 0.5,
        p05: 0.2,
        p95: 0.8,
        shadowFraction: 0.2,
        midtoneFraction: 0.6,
        highlightFraction: 0.2,
      },
      clipping: {
        blackClippedFraction: 0,
        whiteClippedFraction: 0,
        nearBlackFraction: 0,
        nearWhiteFraction: 0,
      },
      contrast: {
        globalStdDev: 0.2,
        p95MinusP05: 0.6,
        flatnessScore: 0.1,
      },
      saturation: {
        mean: 0.2,
        median: 0.2,
        mutedFraction: 0.2,
        highSaturationFraction: 0.1,
      },
      colorBalance: {
        meanRed: 0.5,
        meanGreen: 0.5,
        meanBlue: 0.5,
        temperatureScore: 0,
        temperatureBias: "neutral",
        tintScore: 0,
        tintBias: "neutral",
        dominantColors: [{ hex: "#808080", share: 1 }],
      },
    },
    observations: [],
    limits: {
      missingCapabilities: ["No semantic scene understanding."],
      warnings: [],
    },
    provenance: {
      producer: "deterministic",
      runtime: "main-thread",
      durationMs: 1,
    },
  });

test("marks earlier requests as stale when a newer image analysis starts", async () => {
  const runner = new LatestVisualAnalysisRunner({
    loadSnapshot: async (_src, _maxEdge, signal) => {
      await delay(20);
      if (signal?.aborted) {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }
      return {
        originalWidth: 8,
        originalHeight: 8,
        sampleWidth: 8,
        sampleHeight: 8,
        imageData: new Uint8ClampedArray(8 * 8 * 4),
      };
    },
    analyzeSnapshot: async (input) => {
      await delay(input.editorRevision === "first" ? 30 : 1);
      return createAnalysis(input.editorRevision);
    },
  });

  const first = runner.run({
    selectedLayerId: "layer-1",
    imageLayerId: "layer-1",
    adjustmentLayerIds: [],
    editorRevision: "first",
    imageSource: "data:image/png;base64,first",
    originalWidth: 8,
    originalHeight: 8,
  });
  const second = runner.run({
    selectedLayerId: "layer-1",
    imageLayerId: "layer-1",
    adjustmentLayerIds: [],
    editorRevision: "second",
    imageSource: "data:image/png;base64,second",
    originalWidth: 8,
    originalHeight: 8,
  });

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(firstResult, {
    ok: false,
    reason: "stale",
    error: "Image analysis result is stale.",
  });
  assert.equal(secondResult.ok, true);
  if (secondResult.ok) {
    assert.equal(secondResult.analysis.target.editorRevision, "second");
  }
});

test("does not expose image bytes outside the analyzer result boundary", async () => {
  const source = "data:image/png;base64,PRIVATE_IMAGE_BYTES";
  const runner = new LatestVisualAnalysisRunner({
    loadSnapshot: async () => ({
      originalWidth: 8,
      originalHeight: 8,
      sampleWidth: 8,
      sampleHeight: 8,
      imageData: new Uint8ClampedArray(8 * 8 * 4),
    }),
    analyzeSnapshot: async (input) => createAnalysis(input.editorRevision),
  });

  const result: VisualAnalysisRunResult = await runner.run({
    selectedLayerId: "layer-1",
    imageLayerId: "layer-1",
    adjustmentLayerIds: [],
    editorRevision: "boundary-test",
    imageSource: source,
    originalWidth: 8,
    originalHeight: 8,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const serialized = JSON.stringify(result.analysis);
  assert.doesNotMatch(serialized, /data:image\//);
  assert.doesNotMatch(serialized, /PRIVATE_IMAGE_BYTES/);
});
