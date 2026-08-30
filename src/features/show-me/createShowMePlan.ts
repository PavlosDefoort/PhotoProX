import {
  getZynaloTool,
  isZynaloToolId,
} from "./tools/zynaloToolRegistry";
import type {
  UntrustedAnalysisAnswer,
  UntrustedEditPlan,
  UntrustedEditPlanClarification,
  UntrustedEditPlanStep,
  UntrustedLearningAnswer,
  UntrustedShowMeResponse,
} from "./providers/types";
import type {
  ZynaloToolId,
  ToolAvailabilityContext,
} from "./tools/types";
import type {
  ResolvedShowMePlan,
  ResolvedShowMeResponse,
  ShowMePlanStep,
} from "./types";
import type { SerializableEditorAction } from "@/interfaces/editor/EditDocument";

export type PlanStepResult<K extends ZynaloToolId = ZynaloToolId> =
  | { ok: true; step: ShowMePlanStep<K> }
  | { ok: false; error: string };

export const createShowMePlanStep = <K extends ZynaloToolId>(
  id: string,
  toolId: K,
  parameters: unknown,
  context: ToolAvailabilityContext,
): PlanStepResult<K> => {
  const tool = getZynaloTool(toolId);
  if (!tool.validateParameters(parameters)) {
    return {
      ok: false,
      error: `Invalid parameters for Zynalo tool "${toolId}".`,
    };
  }
  if (!tool.supports(context)) {
    return {
      ok: false,
      error: `${tool.displayName} is not supported for the selected layer.`,
    };
  }
  if (tool.executionPolicy !== "auto-apply" || !tool.createActions) {
    return {
      ok: false,
      error: `${tool.displayName} is currently available as guidance only.`,
    };
  }

  return {
    ok: true,
    step: {
      id,
      toolId,
      parameters,
      title: tool.formatTitle(parameters),
      explanation: tool.formatExplanation(parameters),
      controlId: tool.uiTargetId,
      actions: tool.createActions(parameters),
    },
  };
};

export const createShowMePlanStepFromUnknown = (
  id: string,
  toolId: string,
  parameters: unknown,
  context: ToolAvailabilityContext,
): PlanStepResult => {
  if (!isZynaloToolId(toolId)) {
    return {
      ok: false,
      error: `Unknown Zynalo tool "${toolId}".`,
    };
  }
  return createShowMePlanStep(id, toolId, parameters, context);
};

export type ExecutablePlanResult =
  | { ok: true; actions: SerializableEditorAction[] }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateExecutableShowMePlan = (
  plan: unknown,
  context: ToolAvailabilityContext,
): ExecutablePlanResult => {
  if (!isRecord(plan) || !Array.isArray(plan.steps)) {
    return { ok: false, error: "The Show Me plan is malformed." };
  }

  const actions: SerializableEditorAction[] = [];

  for (const step of plan.steps) {
    if (
      !isRecord(step) ||
      typeof step.id !== "string" ||
      typeof step.toolId !== "string"
    ) {
      return {
        ok: false,
        error: "The Show Me plan contains a malformed step.",
      };
    }
    const result = createShowMePlanStepFromUnknown(
      step.id,
      step.toolId,
      step.parameters,
      context,
    );
    if (!result.ok) {
      return result;
    }
    actions.push(...result.step.actions);
  }

  return actions.length > 0
    ? { ok: true, actions }
    : { ok: false, error: "The plan contains no executable actions." };
};

const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

const isUntrustedClarification = (
  value: unknown,
): value is UntrustedEditPlanClarification => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["needed", "question"])) {
    return false;
  }
  if (typeof value.needed !== "boolean") {
    return false;
  }
  if (
    value.question !== undefined &&
    (typeof value.question !== "string" || !value.question.trim())
  ) {
    return false;
  }
  return true;
};

const isUntrustedStep = (value: unknown): value is UntrustedEditPlanStep =>
  isRecord(value) &&
  hasOnlyKeys(value, ["toolId", "parameters"]) &&
  typeof value.toolId === "string" &&
  "parameters" in value;

const isUntrustedEditPlan = (value: unknown): value is UntrustedEditPlan => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["mode", "summary", "clarification", "steps"])
  ) {
    return false;
  }

  if (value.mode !== undefined && value.mode !== "edit-plan") {
    return false;
  }
  if (value.summary !== undefined && typeof value.summary !== "string") {
    return false;
  }
  if (
    value.clarification !== undefined &&
    !isUntrustedClarification(value.clarification)
  ) {
    return false;
  }
  if (
    value.steps !== undefined &&
    (!Array.isArray(value.steps) || !value.steps.every(isUntrustedStep))
  ) {
    return false;
  }
  return true;
};

const isUntrustedAnalysisAnswer = (
  value: unknown,
): value is UntrustedAnalysisAnswer => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "mode",
      "answer",
      "confidence",
      "evidence",
      "limitations",
      "followUp",
      "clarification",
    ])
  ) {
    return false;
  }
  if (value.mode !== undefined && value.mode !== "analysis-answer") {
    return false;
  }
  if (value.answer !== undefined && typeof value.answer !== "string") {
    return false;
  }
  if (
    value.confidence !== undefined &&
    value.confidence !== "low" &&
    value.confidence !== "medium" &&
    value.confidence !== "high"
  ) {
    return false;
  }
  if (
    value.evidence !== undefined &&
    (!Array.isArray(value.evidence) ||
      !value.evidence.every((entry) => typeof entry === "string"))
  ) {
    return false;
  }
  if (
    value.limitations !== undefined &&
    (!Array.isArray(value.limitations) ||
      !value.limitations.every((entry) => typeof entry === "string"))
  ) {
    return false;
  }
  if (value.followUp !== undefined && typeof value.followUp !== "string") {
    return false;
  }
  if (
    value.clarification !== undefined &&
    !isUntrustedClarification(value.clarification)
  ) {
    return false;
  }
  return true;
};

const isUntrustedLearningAnswer = (
  value: unknown,
): value is UntrustedLearningAnswer => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "mode",
      "answer",
      "bullets",
      "relatedTools",
      "followUp",
      "clarification",
    ])
  ) {
    return false;
  }
  if (value.mode !== undefined && value.mode !== "learning-answer") {
    return false;
  }
  if (value.answer !== undefined && typeof value.answer !== "string") {
    return false;
  }
  if (
    value.bullets !== undefined &&
    (!Array.isArray(value.bullets) ||
      !value.bullets.every((entry) => typeof entry === "string"))
  ) {
    return false;
  }
  if (
    value.relatedTools !== undefined &&
    (!Array.isArray(value.relatedTools) ||
      !value.relatedTools.every((entry) => typeof entry === "string"))
  ) {
    return false;
  }
  if (value.followUp !== undefined && typeof value.followUp !== "string") {
    return false;
  }
  if (
    value.clarification !== undefined &&
    !isUntrustedClarification(value.clarification)
  ) {
    return false;
  }
  return true;
};

const isUntrustedShowMeResponse = (
  value: unknown,
): value is UntrustedShowMeResponse =>
  isUntrustedEditPlan(value) ||
  isUntrustedAnalysisAnswer(value) ||
  isUntrustedLearningAnswer(value);

const sanitizeSummary = (summary: string | undefined) => {
  if (!summary) {
    return undefined;
  }
  const normalized = summary.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, 240);
};

const buildStepId = (toolId: string, index: number) =>
  `step-${index + 1}-${toolId.replace(/[^a-z0-9.-]/gi, "-")}`;

const sanitizeLineItems = (items: string[] | undefined, maximum: number) =>
  (items || [])
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maximum);

export const resolveUntrustedShowMePlan = (
  request: string,
  untrustedPlan: unknown,
  context: ToolAvailabilityContext,
):
  | { ok: true; resolved: ResolvedShowMePlan }
  | { ok: false; error: string } => {
  if (!isUntrustedEditPlan(untrustedPlan)) {
    return { ok: false, error: "The planner returned malformed JSON." };
  }

  if (untrustedPlan.clarification?.needed) {
    return {
      ok: false,
      error:
        untrustedPlan.clarification.question ||
        "I need a bit more detail before I can plan this edit.",
    };
  }

  if (!untrustedPlan.steps || untrustedPlan.steps.length === 0) {
    return {
      ok: false,
      error:
        "The planner returned an incomplete plan. Please retry or use the built-in planner.",
    };
  }

  const trustedSteps: ShowMePlanStep[] = [];
  for (const [index, step] of untrustedPlan.steps.entries()) {
    const result = createShowMePlanStepFromUnknown(
      buildStepId(step.toolId, index),
      step.toolId,
      step.parameters,
      context,
    );
    if (!result.ok) {
      return result;
    }
    trustedSteps.push(result.step);
  }

  return {
    ok: true,
    resolved: {
      summary: sanitizeSummary(untrustedPlan.summary),
      plan: {
        request,
        steps: trustedSteps,
      },
    },
  };
};

export const resolveUntrustedShowMeResponse = (
  request: string,
  untrustedResponse: unknown,
  context: ToolAvailabilityContext,
):
  | { ok: true; resolved: ResolvedShowMeResponse }
  | { ok: false; error: string } => {
  if (!isUntrustedShowMeResponse(untrustedResponse)) {
    return { ok: false, error: "The planner returned malformed JSON." };
  }

  if (
    isUntrustedAnalysisAnswer(untrustedResponse) &&
    (untrustedResponse.mode === "analysis-answer" ||
      untrustedResponse.answer !== undefined)
  ) {
    if (untrustedResponse.clarification?.needed) {
      return {
        ok: false,
        error:
          untrustedResponse.clarification.question ||
          "I need a bit more detail before I can answer that.",
      };
    }

    const answer = untrustedResponse.answer?.replace(/\s+/g, " ").trim();
    if (!answer) {
      return { ok: false, error: "The analysis answer was incomplete." };
    }

    return {
      ok: true,
      resolved: {
        mode: "analysis-answer",
        answer: {
          answer: answer.slice(0, 320),
          confidence: untrustedResponse.confidence,
          evidence: sanitizeLineItems(untrustedResponse.evidence, 4),
          limitations: sanitizeLineItems(untrustedResponse.limitations, 4),
          followUp: sanitizeSummary(untrustedResponse.followUp),
        },
      },
    };
  }

  if (
    isUntrustedLearningAnswer(untrustedResponse) &&
    (untrustedResponse.mode === "learning-answer" ||
      untrustedResponse.answer !== undefined)
  ) {
    if (untrustedResponse.clarification?.needed) {
      return {
        ok: false,
        error:
          untrustedResponse.clarification.question ||
          "I need a bit more detail before I explain that.",
      };
    }

    const answer = untrustedResponse.answer?.replace(/\s+/g, " ").trim();
    if (!answer) {
      return { ok: false, error: "The learning answer was incomplete." };
    }

    return {
      ok: true,
      resolved: {
        mode: "learning-answer",
        answer: {
          answer: answer.slice(0, 320),
          bullets: sanitizeLineItems(untrustedResponse.bullets, 4),
          relatedTools: (untrustedResponse.relatedTools || [])
            .filter(isZynaloToolId)
            .slice(0, 3),
          followUp: sanitizeSummary(untrustedResponse.followUp),
        },
      },
    };
  }

  const trusted = resolveUntrustedShowMePlan(request, untrustedResponse, context);
  if (!trusted.ok) {
    return trusted;
  }

  return {
    ok: true,
    resolved: {
      mode: "edit-plan",
      summary: trusted.resolved.summary,
      plan: trusted.resolved.plan,
    },
  };
};
