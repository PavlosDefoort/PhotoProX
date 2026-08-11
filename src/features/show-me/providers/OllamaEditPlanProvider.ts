import type {
  EditPlanProvider,
  EditPlanProviderRequest,
  EditPlanProviderResult,
} from "./types";

interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen3:4b";
const DEFAULT_OLLAMA_TIMEOUT_MS = 12000;

const toSafeTimeout = (value: string | undefined) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_OLLAMA_TIMEOUT_MS;
  }
  return Math.max(1000, Math.min(parsed, 120000));
};

const readOllamaConfig = (): OllamaConfig => ({
  baseUrl:
    process.env.NEXT_PUBLIC_SHOW_ME_OLLAMA_BASE_URL?.trim().replace(
      /\/+$/,
      "",
    ) || DEFAULT_OLLAMA_BASE_URL,
  model:
    process.env.NEXT_PUBLIC_SHOW_ME_OLLAMA_MODEL?.trim() ||
    DEFAULT_OLLAMA_MODEL,
  timeoutMs: toSafeTimeout(process.env.NEXT_PUBLIC_SHOW_ME_OLLAMA_TIMEOUT_MS),
});

const EDIT_PLAN_SYSTEM_INSTRUCTIONS = `You are a constrained edit-planning model for PhotoProx.
Return JSON only. No markdown, prose, code fences, or explanations.
Do not include UI selectors, control IDs, actions, policy text, or implementation notes.
Do not access files, pixels, or external tools.
Use only tool IDs from toolManifest.tools.
Each step must be: {"toolId":"...", "parameters":{...}}.
If visualContext is present, treat it as limited deterministic evidence rather than certainty.
Never claim semantic understanding such as identifying a sky, face, or subject.
Never claim that any pixel-level change has already happened before a validated plan is applied.
If the request needs unavailable selective or semantic capabilities, say so in clarification or summary rather than promising them.
For overall appearance questions such as why the image looks flat, dark, muted, or too strong in colour, prefer a brief summary plus one grounded global adjustment step instead of repeating the user's question back.
Prefer short, editable plans using the registered tools only.
If request is ambiguous or unsupported, return clarification.`;

const ANALYSIS_ANSWER_SYSTEM_INSTRUCTIONS = `You are a constrained visual analysis assistant for PhotoProx.
Return JSON only. No markdown, prose, code fences, or explanations.
Base your answer only on visualContext and the provided toolManifest.
Treat visualContext as limited deterministic evidence, not certainty.
Never claim semantic understanding such as identifying a sky, face, or subject.
Never claim that any pixel-level change has already happened before a validated plan is applied.
Answer the user's question directly and briefly.
For binary questions, the answer string must start with "Yes —" or "No —".
For why-questions, the answer string must briefly explain the likely reason using words like "because" or "suggests".
Always include at least one short evidence item grounded in the provided visualContext.
Do not return generic capability descriptions or meta explanations about what kinds of questions you can answer.
Do not create an executable edit plan for analysis questions.
You may include one short followUp string such as "Want an editable suggestion?".
If the question cannot be answered reliably from the provided context, use clarification or limitations instead of guessing.`;

const EDIT_PLAN_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["edit-plan"] },
    summary: { type: "string" },
    clarification: {
      type: "object",
      additionalProperties: false,
      properties: {
        needed: { type: "boolean" },
        question: { type: "string" },
      },
      required: ["needed"],
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          toolId: { type: "string" },
          parameters: { type: "object" },
        },
        required: ["toolId", "parameters"],
      },
    },
  },
  required: ["mode", "steps"],
} as const;

const ANALYSIS_ANSWER_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["analysis-answer"] },
    answer: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    evidence: {
      type: "array",
      items: { type: "string" },
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
    followUp: { type: "string" },
    clarification: {
      type: "object",
      additionalProperties: false,
      properties: {
        needed: { type: "boolean" },
        question: { type: "string" },
      },
      required: ["needed"],
    },
  },
  required: ["mode", "answer"],
} as const;

const INTERPRET_SYSTEM_INSTRUCTIONS = `You are a constrained request router for PhotoProx. You do NOT answer questions or invent facts.
Return JSON only. No markdown, prose, code fences, or explanations.
Your only job is to classify the user's request into one route and, when it is an edit, map it onto supported tools.
Routes:
- "edit": the user wants to change the selected image using the registered tools. Provide "steps" using only tool IDs from toolManifest.tools, each {"toolId":"...","parameters":{...}}.
- "analysis": the user is asking a factual question about the current image's exposure, contrast, saturation, colour balance, or clipping. Do NOT answer it. Return route only.
- "learn": the user is asking a general/educational question about what a tool or concept does. Do NOT answer it. Return route only.
- "none": the request is unclear, unsupported, or cannot be confidently mapped. Return route only.
Only include "steps" for the "edit" route. Never include steps for other routes.
Use only tool IDs from toolManifest.tools. Do not access files, pixels, or external tools.
Never claim semantic understanding such as identifying a sky, face, or subject.
If you are not confident, use route "none".`;

const INTERPRET_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["interpret"] },
    route: { type: "string", enum: ["edit", "analysis", "learn", "none"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          toolId: { type: "string" },
          parameters: { type: "object" },
        },
        required: ["toolId", "parameters"],
      },
    },
  },
  required: ["mode", "route"],
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripCodeFences = (value: string) =>
  value
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

const stripThinkBlocks = (value: string) =>
  value.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

const normalizeComparableText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();

const isBinaryQuestion = (request: string) =>
  /^\s*(?:is|are|does|do)\b/i.test(request.trim());

const isWhyQuestion = (request: string) => /^\s*why\b/i.test(request.trim());

const inferAnalysisQuestionAxis = (request: string) => {
  if (
    /\b(?:saturation|colou?rs?|color|vivid|muted|dull|faded|strong|intens\w+|insen\w+)\b/i.test(
      request,
    )
  ) {
    return "saturation";
  }
  if (/\b(?:contrast|flat|washed\s*out|punchy|crisp)\b/i.test(request)) {
    return "contrast";
  }
  if (
    /\b(?:bright|brightness|dark|dim|exposure|underexposed|overexposed)\b/i.test(
      request,
    )
  ) {
    return "exposure";
  }
  if (/\b(?:warm|cool|temperature|green|magenta|tint|cast)\b/i.test(request)) {
    return "color-balance";
  }
  if (
    /\b(?:clipp\w+|blown\s*out|crushed|blocked\s*up|highlight|highlights|shadow|shadows|white|whites|black|blacks)\b/i.test(
      request,
    )
  ) {
    return "clipping";
  }
  return "general";
};

const extractBalancedJsonObject = (value: string) => {
  const startIndex = value.search(/[\[{]/);
  if (startIndex < 0) {
    return value;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(startIndex, index + 1);
      }
    }
  }

  return value.slice(startIndex).trim();
};

const parseProviderJson = (value: unknown): unknown => {
  if (typeof value === "string") {
    const normalized = extractBalancedJsonObject(
      stripCodeFences(stripThinkBlocks(value)),
    );
    return JSON.parse(normalized);
  }
  return value;
};

const extractAnalysisAnswerText = (value: unknown) => {
  if (!isRecord(value) || typeof value.answer !== "string") {
    return null;
  }
  return value.answer.trim();
};

const extractEvidenceCount = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.evidence)) {
    return 0;
  }
  return value.evidence.filter(
    (item) => typeof item === "string" && item.trim(),
  ).length;
};

const isGenericCapabilityAnswer = (answer: string) => {
  const normalized = normalizeComparableText(answer);
  return (
    normalized.includes(
      "i can answer questions about overall brightness contrast saturation clipping risk and colour balance",
    ) ||
    normalized.includes(
      "i can answer questions about overall brightness contrast saturation clipping risk and color balance",
    ) ||
    normalized.includes("when a fresh local image audit is available")
  );
};

const isEchoClarification = (request: string, plan: unknown) => {
  if (!isRecord(plan) || !isRecord(plan.clarification)) {
    return false;
  }
  const { clarification } = plan;
  return (
    clarification.needed === true &&
    typeof clarification.question === "string" &&
    normalizeComparableText(clarification.question) ===
      normalizeComparableText(request)
  );
};

const isNonGroundedAnalysisAnswer = (request: string, response: unknown) => {
  const answer = extractAnalysisAnswerText(response);
  if (!answer) {
    return true;
  }
  if (isGenericCapabilityAnswer(answer)) {
    return true;
  }
  if (extractEvidenceCount(response) === 0) {
    return true;
  }
  if (isBinaryQuestion(request)) {
    return !/^\s*(yes|no)\b/i.test(answer);
  }
  if (isWhyQuestion(request)) {
    return !/(because|suggests)/i.test(answer);
  }
  return false;
};

const buildAnalysisResponseStyle = (
  request: string,
  hasVisualContext: boolean,
) => ({
  questionForm: isBinaryQuestion(request)
    ? "binary"
    : isWhyQuestion(request)
      ? "why"
      : "open",
  primaryAxis: inferAnalysisQuestionAxis(request),
  requiresVisualContext: hasVisualContext,
  answerRules: isBinaryQuestion(request)
    ? [
        'Start answer with "Yes —" or "No —".',
        "Keep the answer to one short sentence.",
        "Use evidence entries to cite the relevant audit measurements.",
      ]
    : isWhyQuestion(request)
      ? [
          'Answer in one short sentence and include "because" or "suggests".',
          "Keep the explanation grounded in the audit evidence only.",
        ]
      : [
          "Answer briefly and only from the provided visual context.",
          "Use evidence entries to cite the relevant audit measurements.",
        ],
});

export class OllamaEditPlanProvider implements EditPlanProvider {
  readonly id = "ollama-local" as const;
  readonly label = "Local AI (Ollama)";
  readonly description =
    "Experimental local model via Ollama on this computer.";
  private readonly config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      ...readOllamaConfig(),
      ...config,
    };
  }

  async createPlan(
    input: EditPlanProviderRequest,
    options?: { signal?: AbortSignal },
  ): Promise<EditPlanProviderResult> {
    if (input.interactionMode === "learn-answer") {
      return {
        ok: false,
        reason: "invalid-response",
        error: "Learning responses are served from the trusted Tool Registry.",
        suggestDeterministic: true,
      };
    }

    const interactionMode = input.interactionMode;
    const systemInstructions =
      interactionMode === "interpret"
        ? INTERPRET_SYSTEM_INSTRUCTIONS
        : interactionMode === "analysis-answer"
          ? ANALYSIS_ANSWER_SYSTEM_INSTRUCTIONS
          : EDIT_PLAN_SYSTEM_INSTRUCTIONS;
    const outputSchema =
      interactionMode === "interpret"
        ? INTERPRET_OUTPUT_SCHEMA
        : interactionMode === "analysis-answer"
          ? ANALYSIS_ANSWER_OUTPUT_SCHEMA
          : EDIT_PLAN_OUTPUT_SCHEMA;
    const responseStyle =
      interactionMode === "analysis-answer"
        ? buildAnalysisResponseStyle(input.request, Boolean(input.visualContext))
        : null;

    if (interactionMode === "analysis-answer" && !input.visualContext) {
      return {
        ok: false,
        reason: "invalid-response",
        error: "Local AI needs a fresh Image Audit for that visual question.",
        suggestDeterministic: true,
      };
    }

    const timeoutController = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, this.config.timeoutMs);

    const handleExternalAbort = () => {
      timeoutController.abort();
    };

    options?.signal?.addEventListener("abort", handleExternalAbort);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeoutController.signal,
        body: JSON.stringify({
          model: this.config.model,
          stream: false,
          format: outputSchema,
          options: {
            temperature: 0,
          },
          messages: [
            {
              role: "system",
              content: systemInstructions,
            },
            {
              role: "user",
              content: JSON.stringify({
                request: input.request,
                interactionMode,
                context: input.context,
                visualContext: input.visualContext,
                toolManifest: input.toolManifest,
                responseStyle,
                outputSchema,
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: "unavailable",
          error: `Local AI is unavailable (HTTP ${response.status}).`,
          suggestDeterministic: true,
        };
      }

      const data: unknown = await response.json();
      if (!isRecord(data) || !isRecord(data.message)) {
        return {
          ok: false,
          reason: "invalid-response",
          error: "Local AI returned an unexpected response shape.",
          suggestDeterministic: true,
        };
      }

      const rawContent = data.message.content;
      if (
        typeof rawContent !== "string" &&
        !isRecord(rawContent) &&
        !Array.isArray(rawContent)
      ) {
        return {
          ok: false,
          reason: "invalid-response",
          error: "Local AI response did not contain valid JSON content.",
          suggestDeterministic: true,
        };
      }

      let parsedPlan: unknown;
      try {
        parsedPlan = parseProviderJson(rawContent);
      } catch {
        return {
          ok: false,
          reason: "invalid-response",
          error: "Local AI returned malformed JSON.",
          suggestDeterministic: true,
        };
      }

      if (isEchoClarification(input.request, parsedPlan)) {
        return {
          ok: false,
          reason: "invalid-response",
          error: "Local AI returned a non-actionable clarification.",
          suggestDeterministic: true,
        };
      }

      if (
        interactionMode === "analysis-answer" &&
        isNonGroundedAnalysisAnswer(input.request, parsedPlan)
      ) {
        return {
          ok: false,
          reason: "invalid-response",
          error: "Local AI returned a non-grounded visual answer.",
          suggestDeterministic: true,
        };
      }

      return { ok: true, response: parsedPlan };
    } catch (error) {
      if (timedOut) {
        return {
          ok: false,
          reason: "timeout",
          error: "Local AI timed out before returning a plan.",
          suggestDeterministic: true,
        };
      }

      const aborted =
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError";
      if (aborted || options?.signal?.aborted) {
        return {
          ok: false,
          reason: "cancelled",
          error: "Planning request was cancelled.",
        };
      }

      return {
        ok: false,
        reason: "unavailable",
        error: "Could not reach the local Ollama service.",
        suggestDeterministic: true,
      };
    } finally {
      clearTimeout(timeoutId);
      options?.signal?.removeEventListener("abort", handleExternalAbort);
    }
  }
}
