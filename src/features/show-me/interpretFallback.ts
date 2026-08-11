import type { InterpretRoute, UntrustedEditPlanStep } from "./providers/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface ParsedInterpretResult {
  route: InterpretRoute;
  steps: UntrustedEditPlanStep[];
}

/**
 * Parses the untrusted router output from the Local AI fallback interpreter.
 * The interpreter is only allowed to choose a route and, for the "edit" route,
 * propose tool steps. Steps for any other route are discarded so the LLM can
 * never smuggle an edit into an analysis/learn/none decision.
 */
export const parseInterpretResult = (value: unknown): ParsedInterpretResult => {
  if (!isRecord(value)) {
    return { route: "none", steps: [] };
  }

  const rawRoute = value.route;
  const route: InterpretRoute =
    rawRoute === "edit" ||
    rawRoute === "analysis" ||
    rawRoute === "learn"
      ? rawRoute
      : "none";

  if (route !== "edit") {
    return { route, steps: [] };
  }

  const steps: UntrustedEditPlanStep[] = Array.isArray(value.steps)
    ? value.steps
        .filter(isRecord)
        .map((step) => ({
          toolId: typeof step.toolId === "string" ? step.toolId : "",
          parameters: step.parameters,
        }))
    : [];

  return { route, steps };
};
