import type { AssistantProviderMode } from "./assistantPreferences";
import type { ShowMeIntent } from "./types";

export type AssistantProvenance =
  | "Instant"
  | "Image analysis"
  | "Photo guide"
  | "Local AI"
  | "Needs clarification";

export const resolveAssistantProviderId = (
  intent: ShowMeIntent,
  providerMode: AssistantProviderMode,
) => {
  if (intent === "subjective" && providerMode !== "deterministic") {
    return "ollama-local" as const;
  }
  return "deterministic" as const;
};

export const shouldUseFallbackInterpreter = (
  intent: ShowMeIntent,
  providerMode: AssistantProviderMode,
) => intent === "ambiguous" && providerMode !== "deterministic";

export const resolveAssistantProvenance = (
  intent: ShowMeIntent,
  providerId: "deterministic" | "ollama-local",
): AssistantProvenance => {
  if (intent === "analysis") {
    return "Image analysis";
  }
  if (intent === "learn") {
    return "Photo guide";
  }
  if (
    (intent === "subjective" || intent === "ambiguous") &&
    providerId === "ollama-local"
  ) {
    return "Local AI";
  }
  return intent === "ambiguous" ? "Needs clarification" : "Instant";
};
