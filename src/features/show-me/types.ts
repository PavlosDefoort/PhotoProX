import {
  ZynaloToolId,
  ZynaloToolParameters,
  ShowMeControlId,
} from "@/features/show-me/tools/types";
import { SerializableEditorAction } from "@/interfaces/editor/EditDocument";

export interface ShowMePlanStep<
  K extends ZynaloToolId = ZynaloToolId,
> {
  id: string;
  toolId: K;
  parameters: ZynaloToolParameters[K];
  title: string;
  explanation: string;
  controlId: ShowMeControlId;
  actions: SerializableEditorAction[];
}

export interface ShowMePlan {
  request: string;
  steps: ShowMePlanStep[];
}

export interface ResolvedShowMePlan {
  plan: ShowMePlan;
  summary?: string;
}

export type ShowMeIntent = "analysis" | "learn" | "subjective" | "edit" | "ambiguous";

export interface ShowMeAnalysisAnswer {
  answer: string;
  confidence?: "low" | "medium" | "high";
  evidence: string[];
  limitations: string[];
  followUp?: string;
}

export interface ShowMeLearningAnswer {
  answer: string;
  bullets: string[];
  relatedTools: ZynaloToolId[];
  followUp?: string;
}

export interface ShowMeClarification {
  question: string;
}

export type AssistantResponse =
  | {
      mode: "edit-plan";
      summary?: string;
      plan: ShowMePlan;
    }
  | {
      mode: "analysis-answer";
      answer: ShowMeAnalysisAnswer;
    }
  | {
      mode: "learning-answer";
      answer: ShowMeLearningAnswer;
    }
  | {
      mode: "clarification";
      clarification: ShowMeClarification;
    };

export type ResolvedShowMeResponse = AssistantResponse;

export type ShowMeParseResult =
  | { ok: true; plan: ShowMePlan }
  | { ok: false; error: string };
