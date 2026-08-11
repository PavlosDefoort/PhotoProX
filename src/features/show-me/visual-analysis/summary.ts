import { VisualAnalysis } from "./types";
import { PlannerVisualContext } from "./plannerContext";

export const visualObservationLabel: Record<string, string> = {
  "low-exposure": "dark overall",
  "high-exposure": "bright overall",
  "low-contrast": "flat contrast",
  "muted-colour": "muted colour",
  "high-saturation": "strong colour",
  "warm-cast": "warm colour balance",
  "cool-cast": "cool colour balance",
  "green-cast": "green tint bias",
  "magenta-cast": "magenta tint bias",
  "highlight-clipping-risk": "limited highlight headroom",
  "shadow-clipping-risk": "limited shadow headroom",
};

const joinLabels = (labels: string[]) => {
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
};

export const buildVisualAnalysisSummary = (analysis: VisualAnalysis) => {
  const prioritized = analysis.observations
    .slice()
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
    .map((observation) => visualObservationLabel[observation.code])
    .filter(Boolean);

  if (prioritized.length > 0) {
    return `Local audit suggests ${joinLabels(prioritized)}.`;
  }

  const temperature = analysis.metrics.colorBalance.temperatureBias;
  const tint = analysis.metrics.colorBalance.tintBias;
  const temperatureText =
    temperature === "neutral" ? "neutral warmth" : `${temperature} balance`;
  const tintText = tint === "neutral" ? "neutral tint" : `${tint} tint`;
  return `Local audit suggests balanced exposure with ${temperatureText} and ${tintText}.`;
};

export const formatPercentage = (value: number) =>
  `${Math.round(value * 1000) / 10}%`;

export const formatMetric = (value: number) =>
  `${Math.round(value * 1000) / 1000}`;

export const formatPlannerObservationLabel = (
  context: PlannerVisualContext,
): string[] =>
  context.observations
    .map((observation) => visualObservationLabel[observation.code])
    .filter(Boolean);
