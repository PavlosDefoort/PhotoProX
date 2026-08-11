import { analyseEverything } from "../../../utils/CalcUtils";
import {
  AnalyzeVisualSnapshotInput,
  parseVisualAnalysis,
  VisualAnalysis,
  VisualAnalysisObservation,
  VisualAnalysisObservationCode,
  VISUAL_ANALYSIS_VERSION,
} from "./types";

const BYTE_MAX = 255;
const SHADOW_THRESHOLD = 63;
const HIGHLIGHT_THRESHOLD = 191;
const NEAR_BLACK_THRESHOLD = 10;
const NEAR_WHITE_THRESHOLD = 245;
const BLACK_CLIPPED_THRESHOLD = 2;
const WHITE_CLIPPED_THRESHOLD = 253;
const MUTED_SATURATION_THRESHOLD = 0.18;
const HIGH_SATURATION_THRESHOLD = 0.72;
const DOMINANT_COLOR_BIN_MASK = 0xf0;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const roundMetric = (value: number) => Math.round(value * 10000) / 10000;

const createHistogram = (values: Uint8Array) => {
  const histogram = new Uint32Array(BYTE_MAX + 1);
  for (const value of values) {
    histogram[value] += 1;
  }
  return histogram;
};

const histogramQuantile = (histogram: Uint32Array, total: number, q: number) => {
  const clampedQ = clamp01(q);
  const threshold = total * clampedQ;
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= threshold) {
      return value / BYTE_MAX;
    }
  }
  return 1;
};

const histogramFractionBetween = (
  histogram: Uint32Array,
  total: number,
  minimumInclusive: number,
  maximumInclusive: number,
) => {
  let count = 0;
  for (let value = minimumInclusive; value <= maximumInclusive; value += 1) {
    count += histogram[value];
  }
  return total > 0 ? count / total : 0;
};

const rgbToHslSaturationByte = (red: number, green: number, blue: number) => {
  const r = red / BYTE_MAX;
  const g = green / BYTE_MAX;
  const b = blue / BYTE_MAX;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) {
    return 0;
  }
  const lightness = (max + min) / 2;
  const saturation =
    lightness === 0 || lightness === 1
      ? 0
      : delta / (1 - Math.abs(2 * lightness - 1));
  return Math.round(clamp01(saturation) * BYTE_MAX);
};

const quantizeColorHex = (red: number, green: number, blue: number) => {
  const quantizedRed = red & DOMINANT_COLOR_BIN_MASK;
  const quantizedGreen = green & DOMINANT_COLOR_BIN_MASK;
  const quantizedBlue = blue & DOMINANT_COLOR_BIN_MASK;
  return `#${[quantizedRed, quantizedGreen, quantizedBlue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
};

const observationSummary: Record<VisualAnalysisObservationCode, string> = {
  "low-exposure": "The image is globally dark.",
  "high-exposure": "The image is globally bright.",
  "low-contrast": "The tonal separation looks restrained or flat.",
  "muted-colour": "Colour intensity is generally subdued.",
  "high-saturation": "Colour intensity is globally strong.",
  "warm-cast": "The overall colour balance leans warm.",
  "cool-cast": "The overall colour balance leans cool.",
  "green-cast": "The overall tint leans green.",
  "magenta-cast": "The overall tint leans magenta.",
  "highlight-clipping-risk": "Bright regions are close to clipping.",
  "shadow-clipping-risk": "Dark regions are close to clipping.",
};

const addObservation = (
  observations: VisualAnalysisObservation[],
  code: VisualAnalysisObservationCode,
  severity: VisualAnalysisObservation["severity"],
  confidence: number,
) => {
  observations.push({
    code,
    severity,
    confidence: roundMetric(clamp01(confidence)),
    summary: observationSummary[code],
  });
};

export const analyzeVisualSnapshot = (
  input: AnalyzeVisualSnapshotInput,
): VisualAnalysis => {
  const startedAt = performance.now();
  const analysis = analyseEverything(Uint8Array.from(input.imageData));
  const pixelCount = analysis.luminance.length;
  if (pixelCount === 0) {
    throw new Error("Visual analysis requires at least one pixel.");
  }

  const luminanceHistogram = createHistogram(analysis.luminance);
  const saturationHistogram = new Uint32Array(BYTE_MAX + 1);
  const dominantColorCounts = new Map<string, number>();
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let mutedPixels = 0;
  let highSaturationPixels = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const luminance = analysis.luminance[index];
    const red = analysis.red[index];
    const green = analysis.green[index];
    const blue = analysis.blue[index];

    luminanceSum += luminance;
    luminanceSquaredSum += luminance * luminance;
    redSum += red;
    greenSum += green;
    blueSum += blue;

    const saturationByte = rgbToHslSaturationByte(red, green, blue);
    saturationHistogram[saturationByte] += 1;
    if (saturationByte / BYTE_MAX <= MUTED_SATURATION_THRESHOLD) {
      mutedPixels += 1;
    }
    if (saturationByte / BYTE_MAX >= HIGH_SATURATION_THRESHOLD) {
      highSaturationPixels += 1;
    }

    const quantizedHex = quantizeColorHex(red, green, blue);
    dominantColorCounts.set(
      quantizedHex,
      (dominantColorCounts.get(quantizedHex) || 0) + 1,
    );
  }

  const luminanceMean = luminanceSum / pixelCount / BYTE_MAX;
  const luminanceVariance = Math.max(
    0,
    luminanceSquaredSum / pixelCount / (BYTE_MAX * BYTE_MAX) -
      luminanceMean * luminanceMean,
  );
  const globalStdDev = Math.sqrt(luminanceVariance);
  const luminanceMedian = histogramQuantile(luminanceHistogram, pixelCount, 0.5);
  const luminanceP05 = histogramQuantile(luminanceHistogram, pixelCount, 0.05);
  const luminanceP95 = histogramQuantile(luminanceHistogram, pixelCount, 0.95);
  const p95MinusP05 = luminanceP95 - luminanceP05;
  const flatnessScore = clamp01(1 - p95MinusP05 / 0.55);

  let saturationSum = 0;
  for (let value = 0; value < saturationHistogram.length; value += 1) {
    saturationSum += value * saturationHistogram[value];
  }
  const saturationMean = saturationSum / pixelCount / BYTE_MAX;
  const saturationMedian = histogramQuantile(
    saturationHistogram,
    pixelCount,
    0.5,
  );

  const meanRed = redSum / pixelCount / BYTE_MAX;
  const meanGreen = greenSum / pixelCount / BYTE_MAX;
  const meanBlue = blueSum / pixelCount / BYTE_MAX;
  const temperatureScore = clamp01((meanRed - meanBlue + 1) / 2) * 2 - 1;
  const tintScore =
    clamp01((meanGreen - (meanRed + meanBlue) / 2 + 1) / 2) * 2 - 1;

  const dominantColors = Array.from(dominantColorCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([hex, count]) => ({
      hex,
      share: roundMetric(count / pixelCount),
    }));

  const nearBlackFraction = histogramFractionBetween(
    luminanceHistogram,
    pixelCount,
    0,
    NEAR_BLACK_THRESHOLD,
  );
  const nearWhiteFraction = histogramFractionBetween(
    luminanceHistogram,
    pixelCount,
    NEAR_WHITE_THRESHOLD,
    BYTE_MAX,
  );
  const blackClippedFraction = histogramFractionBetween(
    luminanceHistogram,
    pixelCount,
    0,
    BLACK_CLIPPED_THRESHOLD,
  );
  const whiteClippedFraction = histogramFractionBetween(
    luminanceHistogram,
    pixelCount,
    WHITE_CLIPPED_THRESHOLD,
    BYTE_MAX,
  );

  const observations: VisualAnalysisObservation[] = [];
  if (luminanceMean < 0.34 && luminanceP95 < 0.82) {
    addObservation(
      observations,
      "low-exposure",
      "warning",
      (0.34 - luminanceMean) / 0.16,
    );
  }
  if (luminanceMean > 0.68 && luminanceP05 > 0.08) {
    addObservation(
      observations,
      "high-exposure",
      "warning",
      (luminanceMean - 0.68) / 0.16,
    );
  }
  if (p95MinusP05 < 0.34 || globalStdDev < 0.18) {
    addObservation(
      observations,
      "low-contrast",
      "warning",
      Math.max((0.34 - p95MinusP05) / 0.18, (0.18 - globalStdDev) / 0.1),
    );
  }
  if (saturationMean < 0.22 && mutedPixels / pixelCount > 0.45) {
    addObservation(
      observations,
      "muted-colour",
      "info",
      Math.max((0.22 - saturationMean) / 0.14, mutedPixels / pixelCount - 0.45),
    );
  }
  if (saturationMean > 0.5 || highSaturationPixels / pixelCount > 0.2) {
    addObservation(
      observations,
      "high-saturation",
      "info",
      Math.max(
        (saturationMean - 0.5) / 0.2,
        (highSaturationPixels / pixelCount - 0.2) / 0.25,
      ),
    );
  }
  if (temperatureScore > 0.1) {
    addObservation(
      observations,
      "warm-cast",
      "info",
      (temperatureScore - 0.1) / 0.25,
    );
  } else if (temperatureScore < -0.1) {
    addObservation(
      observations,
      "cool-cast",
      "info",
      (-0.1 - temperatureScore) / 0.25,
    );
  }
  if (tintScore > 0.08) {
    addObservation(
      observations,
      "green-cast",
      "info",
      (tintScore - 0.08) / 0.2,
    );
  } else if (tintScore < -0.08) {
    addObservation(
      observations,
      "magenta-cast",
      "info",
      (-0.08 - tintScore) / 0.2,
    );
  }
  if (nearWhiteFraction > 0.05 || whiteClippedFraction > 0.005) {
    addObservation(
      observations,
      "highlight-clipping-risk",
      "warning",
      Math.max(
        (nearWhiteFraction - 0.05) / 0.1,
        (whiteClippedFraction - 0.005) / 0.02,
      ),
    );
  }
  if (nearBlackFraction > 0.08 || blackClippedFraction > 0.01) {
    addObservation(
      observations,
      "shadow-clipping-risk",
      "warning",
      Math.max(
        (nearBlackFraction - 0.08) / 0.14,
        (blackClippedFraction - 0.01) / 0.04,
      ),
    );
  }

  const result = parseVisualAnalysis({
    version: VISUAL_ANALYSIS_VERSION,
    target: {
      scope: "selected-image-source",
      selectedLayerId: input.selectedLayerId,
      imageLayerIds: input.imageLayerIds,
      adjustmentLayerIds: input.adjustmentLayerIds,
      editorRevision: input.editorRevision,
    },
    snapshot: {
      originalWidth: input.originalWidth,
      originalHeight: input.originalHeight,
      sampleWidth: input.sampleWidth,
      sampleHeight: input.sampleHeight,
      colorSpace: "srgb",
      alphaMode: "straight",
    },
    metrics: {
      luminance: {
        mean: roundMetric(luminanceMean),
        median: roundMetric(luminanceMedian),
        p05: roundMetric(luminanceP05),
        p95: roundMetric(luminanceP95),
        shadowFraction: roundMetric(
          histogramFractionBetween(
            luminanceHistogram,
            pixelCount,
            0,
            SHADOW_THRESHOLD,
          ),
        ),
        midtoneFraction: roundMetric(
          histogramFractionBetween(
            luminanceHistogram,
            pixelCount,
            SHADOW_THRESHOLD + 1,
            HIGHLIGHT_THRESHOLD - 1,
          ),
        ),
        highlightFraction: roundMetric(
          histogramFractionBetween(
            luminanceHistogram,
            pixelCount,
            HIGHLIGHT_THRESHOLD,
            BYTE_MAX,
          ),
        ),
      },
      clipping: {
        blackClippedFraction: roundMetric(blackClippedFraction),
        whiteClippedFraction: roundMetric(whiteClippedFraction),
        nearBlackFraction: roundMetric(nearBlackFraction),
        nearWhiteFraction: roundMetric(nearWhiteFraction),
      },
      contrast: {
        globalStdDev: roundMetric(globalStdDev),
        p95MinusP05: roundMetric(p95MinusP05),
        flatnessScore: roundMetric(flatnessScore),
      },
      saturation: {
        mean: roundMetric(saturationMean),
        median: roundMetric(saturationMedian),
        mutedFraction: roundMetric(mutedPixels / pixelCount),
        highSaturationFraction: roundMetric(highSaturationPixels / pixelCount),
      },
      colorBalance: {
        meanRed: roundMetric(meanRed),
        meanGreen: roundMetric(meanGreen),
        meanBlue: roundMetric(meanBlue),
        temperatureScore: roundMetric(temperatureScore),
        temperatureBias:
          temperatureScore > 0.1
            ? "warm"
            : temperatureScore < -0.1
              ? "cool"
              : "neutral",
        tintScore: roundMetric(tintScore),
        tintBias:
          tintScore > 0.08
            ? "green"
            : tintScore < -0.08
              ? "magenta"
              : "neutral",
        dominantColors,
      },
    },
    observations,
    limits: {
      missingCapabilities: [
        "No semantic scene understanding.",
        "No region-aware masking or subject detection.",
        "Source-image only; current adjustment stack is not analysed yet.",
      ],
      warnings: [
        "Metrics are computed from a capped local snapshot, not the full-resolution original.",
      ],
    },
    provenance: {
      producer: "deterministic",
      runtime: input.runtime || "main-thread",
      durationMs: roundMetric(performance.now() - startedAt),
    },
  });

  return result;
};
