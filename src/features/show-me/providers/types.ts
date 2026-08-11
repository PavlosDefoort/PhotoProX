import type {
  PhotoProxToolId,
  ToolAvailabilityContext,
  ToolParameterSchema,
} from "../tools/types";
import type { PlannerVisualContext } from "../visual-analysis";

export type EditPlanProviderId = "deterministic" | "ollama-local";
export type ShowMeInteractionMode =
  | "edit-plan"
  | "analysis-answer"
  | "learn-answer"
  | "interpret";

export type InterpretRoute = "edit" | "analysis" | "learn" | "none";

export interface SafeShowMeEditorContext extends ToolAvailabilityContext {
  imageDimensions: { width: number; height: number } | null;
  currentAdjustmentValues: Partial<{
    brightness: number;
    contrast: number;
    saturation: number;
  }>;
  supportedToolIds: PhotoProxToolId[];
}

export interface EditPlanToolManifestEntry {
  id: PhotoProxToolId;
  displayName: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface EditPlanToolManifest {
  version: 1;
  tools: EditPlanToolManifestEntry[];
}

export interface UntrustedEditPlanStep {
  toolId: string;
  parameters: unknown;
}

export interface UntrustedEditPlanClarification {
  needed: boolean;
  question?: string;
}

export interface UntrustedEditPlan {
  mode?: "edit-plan";
  summary?: string;
  clarification?: UntrustedEditPlanClarification;
  steps?: UntrustedEditPlanStep[];
}

export interface UntrustedAnalysisAnswerPlan {
  summary?: string;
  steps?: UntrustedEditPlanStep[];
}

export interface UntrustedAnalysisAnswer {
  mode?: "analysis-answer";
  answer?: string;
  confidence?: "low" | "medium" | "high";
  evidence?: string[];
  limitations?: string[];
  followUp?: string;
  clarification?: UntrustedEditPlanClarification;
}

export interface UntrustedLearningAnswer {
  mode?: "learning-answer";
  answer?: string;
  bullets?: string[];
  relatedTools?: string[];
  followUp?: string;
  clarification?: UntrustedEditPlanClarification;
}

export interface UntrustedInterpretResult {
  mode?: "interpret";
  route?: InterpretRoute;
  confidence?: "low" | "medium" | "high";
  steps?: UntrustedEditPlanStep[];
}

export type UntrustedShowMeResponse =
  | UntrustedEditPlan
  | UntrustedAnalysisAnswer
  | UntrustedLearningAnswer;

export interface EditPlanProviderRequest {
  request: string;
  toolManifest: EditPlanToolManifest;
  context: SafeShowMeEditorContext;
  visualContext?: PlannerVisualContext;
  interactionMode: ShowMeInteractionMode;
}

export type EditPlanProviderFailureReason =
  | "timeout"
  | "unavailable"
  | "invalid-response"
  | "cancelled";

export type EditPlanProviderResult =
  | { ok: true; response: unknown }
  | {
      ok: false;
      error: string;
      reason: EditPlanProviderFailureReason;
      suggestDeterministic?: boolean;
    };

export interface EditPlanProvider {
  id: EditPlanProviderId;
  label: string;
  description: string;
  createPlan: (
    input: EditPlanProviderRequest,
    options?: { signal?: AbortSignal },
  ) => Promise<EditPlanProviderResult>;
}
