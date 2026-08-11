import { z } from "zod";
import {
  parseVisualAnalysis,
  VisualAnalysis,
  visualAnalysisObservationCodeSchema,
} from "./types";

export const PLANNER_VISUAL_CONTEXT_VERSION = 1 as const;

const boundedNumber = z.number().min(-1).max(1);
const boundedUnitNumber = z.number().min(0).max(1);

export const plannerVisualContextSchema = z.object({
  version: z.literal(PLANNER_VISUAL_CONTEXT_VERSION),
  analysisStatus: z.literal("ready"),
  scope: z.literal("selected-image-source"),
  exposure: z.object({
    level: z.enum(["low", "balanced", "high"]),
    meanLuminance: boundedUnitNumber,
  }),
  contrast: z.object({
    level: z.enum(["low", "balanced", "high"]),
    flatnessScore: boundedUnitNumber,
  }),
  saturation: z.object({
    level: z.enum(["muted", "balanced", "high"]),
    meanSaturation: boundedUnitNumber,
  }),
  colorBalance: z.object({
    temperatureBias: z.enum(["cool", "neutral", "warm"]),
    temperatureScore: boundedNumber,
    tintBias: z.enum(["green", "neutral", "magenta"]),
    tintScore: boundedNumber,
  }),
  clippingRisk: z.object({
    highlights: z.boolean(),
    shadows: z.boolean(),
  }),
  observations: z.array(
    z.object({
      code: visualAnalysisObservationCodeSchema,
      severity: z.enum(["info", "warning"]),
      confidence: boundedUnitNumber,
    }),
  ),
  dominantColors: z.array(
    z.object({
      hex: z.string().regex(/^#[0-9a-f]{6}$/i),
      share: boundedUnitNumber,
    }),
  ),
  limitations: z.array(z.string().min(1).max(120)).max(6),
});

export type PlannerVisualContext = z.infer<typeof plannerVisualContextSchema>;

const roundMetric = (value: number) => Math.round(value * 1000) / 1000;

const normalizeUnit = (value: number) => roundMetric(Math.max(0, Math.min(1, value)));

const normalizeSigned = (value: number) =>
  roundMetric(Math.max(-1, Math.min(1, value)));

const deriveExposureLevel = (analysis: VisualAnalysis) => {
  if (analysis.observations.some((observation) => observation.code === "low-exposure")) {
    return "low" as const;
  }
  if (analysis.observations.some((observation) => observation.code === "high-exposure")) {
    return "high" as const;
  }
  return "balanced" as const;
};

const deriveContrastLevel = (analysis: VisualAnalysis) => {
  if (analysis.observations.some((observation) => observation.code === "low-contrast")) {
    return "low" as const;
  }
  if (analysis.metrics.contrast.p95MinusP05 > 0.78) {
    return "high" as const;
  }
  return "balanced" as const;
};

const deriveSaturationLevel = (analysis: VisualAnalysis) => {
  if (analysis.observations.some((observation) => observation.code === "muted-colour")) {
    return "muted" as const;
  }
  if (analysis.observations.some((observation) => observation.code === "high-saturation")) {
    return "high" as const;
  }
  return "balanced" as const;
};

export const toPlannerVisualContext = (
  visualAnalysis: unknown,
): PlannerVisualContext => {
  const analysis = parseVisualAnalysis(visualAnalysis);

  return plannerVisualContextSchema.parse({
    version: PLANNER_VISUAL_CONTEXT_VERSION,
    analysisStatus: "ready",
    scope: analysis.target.scope,
    exposure: {
      level: deriveExposureLevel(analysis),
      meanLuminance: normalizeUnit(analysis.metrics.luminance.mean),
    },
    contrast: {
      level: deriveContrastLevel(analysis),
      flatnessScore: normalizeUnit(analysis.metrics.contrast.flatnessScore),
    },
    saturation: {
      level: deriveSaturationLevel(analysis),
      meanSaturation: normalizeUnit(analysis.metrics.saturation.mean),
    },
    colorBalance: {
      temperatureBias: analysis.metrics.colorBalance.temperatureBias,
      temperatureScore: normalizeSigned(
        analysis.metrics.colorBalance.temperatureScore,
      ),
      tintBias: analysis.metrics.colorBalance.tintBias,
      tintScore: normalizeSigned(analysis.metrics.colorBalance.tintScore),
    },
    clippingRisk: {
      highlights: analysis.observations.some(
        (observation) => observation.code === "highlight-clipping-risk",
      ),
      shadows: analysis.observations.some(
        (observation) => observation.code === "shadow-clipping-risk",
      ),
    },
    observations: analysis.observations.slice(0, 6).map((observation) => ({
      code: observation.code,
      severity: observation.severity,
      confidence: normalizeUnit(observation.confidence),
    })),
    dominantColors: analysis.metrics.colorBalance.dominantColors
      .slice(0, 3)
      .map((color) => ({
        hex: color.hex,
        share: normalizeUnit(color.share),
      })),
    limitations: [
      ...analysis.limits.missingCapabilities,
      ...analysis.limits.warnings,
    ].slice(0, 6),
  });
};

export const getFreshPlannerVisualContext = (
  visualAnalysis: VisualAnalysis | null,
  expected:
    | {
        selectedLayerId: string;
        editorRevision: string;
      }
    | null,
): PlannerVisualContext | null => {
  if (!visualAnalysis || !expected) {
    return null;
  }
  if (visualAnalysis.target.scope !== "selected-image-source") {
    return null;
  }
  if (visualAnalysis.target.selectedLayerId !== expected.selectedLayerId) {
    return null;
  }
  if (visualAnalysis.target.editorRevision !== expected.editorRevision) {
    return null;
  }
  return toPlannerVisualContext(visualAnalysis);
};

export const parsePlannerVisualContext = (value: unknown): PlannerVisualContext =>
  plannerVisualContextSchema.parse(value);
