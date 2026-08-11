import { z } from "zod";

export const VISUAL_ANALYSIS_VERSION = 1 as const;
export const VISUAL_ANALYSIS_MAX_SNAPSHOT_EDGE = 512;

export const visualAnalysisObservationCodeSchema = z.enum([
  "low-exposure",
  "high-exposure",
  "low-contrast",
  "muted-colour",
  "high-saturation",
  "warm-cast",
  "cool-cast",
  "green-cast",
  "magenta-cast",
  "highlight-clipping-risk",
  "shadow-clipping-risk",
]);

export const visualAnalysisObservationSeveritySchema = z.enum([
  "info",
  "warning",
]);

export const visualAnalysisObservationSchema = z.object({
  code: visualAnalysisObservationCodeSchema,
  severity: visualAnalysisObservationSeveritySchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(160),
});

export const visualAnalysisDominantColorSchema = z.object({
  hex: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Dominant colours must be serialized as #RRGGBB."),
  share: z.number().min(0).max(1),
});

export const visualAnalysisTargetSchema = z.object({
  scope: z.literal("selected-image-source"),
  selectedLayerId: z.string().min(1),
  imageLayerIds: z.array(z.string().min(1)).min(1),
  adjustmentLayerIds: z.array(z.string().min(1)),
  editorRevision: z.string().min(1),
});

export const visualAnalysisSnapshotSchema = z.object({
  originalWidth: z.number().int().positive(),
  originalHeight: z.number().int().positive(),
  sampleWidth: z.number().int().positive(),
  sampleHeight: z.number().int().positive(),
  colorSpace: z.literal("srgb"),
  alphaMode: z.literal("straight"),
});

export const visualAnalysisMetricsSchema = z.object({
  luminance: z.object({
    mean: z.number().min(0).max(1),
    median: z.number().min(0).max(1),
    p05: z.number().min(0).max(1),
    p95: z.number().min(0).max(1),
    shadowFraction: z.number().min(0).max(1),
    midtoneFraction: z.number().min(0).max(1),
    highlightFraction: z.number().min(0).max(1),
  }),
  clipping: z.object({
    blackClippedFraction: z.number().min(0).max(1),
    whiteClippedFraction: z.number().min(0).max(1),
    nearBlackFraction: z.number().min(0).max(1),
    nearWhiteFraction: z.number().min(0).max(1),
  }),
  contrast: z.object({
    globalStdDev: z.number().min(0).max(1),
    p95MinusP05: z.number().min(0).max(1),
    flatnessScore: z.number().min(0).max(1),
  }),
  saturation: z.object({
    mean: z.number().min(0).max(1),
    median: z.number().min(0).max(1),
    mutedFraction: z.number().min(0).max(1),
    highSaturationFraction: z.number().min(0).max(1),
  }),
  colorBalance: z.object({
    meanRed: z.number().min(0).max(1),
    meanGreen: z.number().min(0).max(1),
    meanBlue: z.number().min(0).max(1),
    temperatureScore: z.number().min(-1).max(1),
    temperatureBias: z.enum(["cool", "neutral", "warm"]),
    tintScore: z.number().min(-1).max(1),
    tintBias: z.enum(["green", "neutral", "magenta"]),
    dominantColors: z.array(visualAnalysisDominantColorSchema).max(5),
  }),
});

export const visualAnalysisLimitsSchema = z.object({
  missingCapabilities: z.array(z.string().min(1)),
  warnings: z.array(z.string().min(1)),
});

export const visualAnalysisProvenanceSchema = z.object({
  producer: z.literal("deterministic"),
  runtime: z.enum(["main-thread", "worker"]),
  durationMs: z.number().min(0),
});

export const visualAnalysisSchema = z.object({
  version: z.literal(VISUAL_ANALYSIS_VERSION),
  target: visualAnalysisTargetSchema,
  snapshot: visualAnalysisSnapshotSchema,
  metrics: visualAnalysisMetricsSchema,
  observations: z.array(visualAnalysisObservationSchema),
  limits: visualAnalysisLimitsSchema,
  provenance: visualAnalysisProvenanceSchema,
});

export type VisualAnalysisObservationCode = z.infer<
  typeof visualAnalysisObservationCodeSchema
>;
export type VisualAnalysisObservationSeverity = z.infer<
  typeof visualAnalysisObservationSeveritySchema
>;
export type VisualAnalysisObservation = z.infer<
  typeof visualAnalysisObservationSchema
>;
export type VisualAnalysis = z.infer<typeof visualAnalysisSchema>;

export interface AnalyzeVisualSnapshotInput {
  selectedLayerId: string;
  imageLayerIds: string[];
  adjustmentLayerIds: string[];
  editorRevision: string;
  originalWidth: number;
  originalHeight: number;
  sampleWidth: number;
  sampleHeight: number;
  imageData: Uint8ClampedArray;
  runtime?: "main-thread" | "worker";
}

export interface ImageSnapshot {
  originalWidth: number;
  originalHeight: number;
  sampleWidth: number;
  sampleHeight: number;
  imageData: Uint8ClampedArray;
}

export interface AnalyzeSelectedImageSourceInput {
  selectedLayerId: string;
  imageLayerId: string;
  adjustmentLayerIds: string[];
  editorRevision: string;
  imageSource: string;
  originalWidth: number;
  originalHeight: number;
  maxSnapshotEdge?: number;
}

export const parseVisualAnalysis = (value: unknown): VisualAnalysis =>
  visualAnalysisSchema.parse(value);
