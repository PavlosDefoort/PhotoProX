import { parseShowMeRequest } from "../parseShowMeRequest";
import { buildLearningResponse } from "../buildLearningResponse";
import type {
  EditPlanProvider,
  EditPlanProviderRequest,
  EditPlanProviderResult,
} from "./types";
import type { PlannerVisualContext } from "../visual-analysis";

const isBinaryQuestion = (request: string) =>
  /^\s*(?:is|are|does|do)\b/i.test(request.trim());

const isWhyQuestion = (request: string) => /^\s*why\b/i.test(request.trim());

const mentionsSaturation = (request: string) =>
  /\b(?:saturation|colou?rs?|color|vivid|muted|dull|faded|strong|intens\w+|insen\w+)\b/i.test(
    request,
  );

const mentionsContrast = (request: string) =>
  /\b(?:contrast|flat|washed\s*out|punchy|crisp)\b/i.test(request);

const mentionsBrightness = (request: string) =>
  /\b(?:bright|brightness|dark|dim|exposure|underexposed|overexposed)\b/i.test(
    request,
  );

const mentionsWarmCool = (request: string) =>
  /\b(?:warm|cool|temperature|cast)\b/i.test(request);

const mentionsTint = (request: string) =>
  /\b(?:green|magenta|tint|cast)\b/i.test(request);

const mentionsClipping = (request: string) =>
  /\b(?:clipp\w+|blown\s*out|crushed|blocked\s*up)\b/i.test(request);

const mentionsHighlights = (request: string) =>
  /\b(?:highlight|highlights|white|whites|brightest)\b/i.test(request);

const mentionsShadows = (request: string) =>
  /\b(?:shadow|shadows|black|blacks|darkest)\b/i.test(request);

const asksDominantColours = (request: string) =>
  /\b(?:dominant\s+(?:colou?rs?|colors?)|(?:colou?rs?|colors?)\s+are\s+dominant)\b/i.test(
    request,
  );

const createAnalysisAnswer = (
  answer: string,
  confidence: "low" | "medium" | "high",
  evidence: string[],
  limitations: string[],
  followUp?: string,
) => ({
  mode: "analysis-answer" as const,
  answer,
  confidence,
  evidence,
  limitations,
  followUp,
});

const answerWithAudit = (
  request: string,
  visualContext: PlannerVisualContext | undefined,
) => {
  if (!visualContext) {
    return createAnalysisAnswer(
      "I need a fresh local Image Audit before I can answer that accurately.",
      "low",
      [],
      ["No fresh local image audit is available for this question yet."],
      "Want me to analyze the selected image first?",
    );
  }

  if (isBinaryQuestion(request) && mentionsBrightness(request)) {
    const isLow = visualContext.exposure.level === "low";
    const isHigh = visualContext.exposure.level === "high";
    const asksDark = /\b(?:dark|dim|underexposed)\b/i.test(request);
    const asksBright = /\b(?:bright|overexposed|high\s+exposure)\b/i.test(request);
    return createAnalysisAnswer(
      asksDark
        ? isLow
          ? "Yes — the local image audit suggests the image is globally dark."
          : "No — the local image audit does not suggest the image is globally dark."
        : asksBright
          ? isHigh
            ? "Yes — the local image audit suggests the image is globally bright."
            : "No — the local image audit does not suggest unusually high overall brightness."
          : visualContext.exposure.level === "balanced"
            ? "The local image audit suggests overall exposure is fairly balanced."
            : `The local image audit suggests overall exposure is ${visualContext.exposure.level}.`,
      visualContext.exposure.level === "balanced" ? "medium" : "high",
      [
        `Exposure level: ${visualContext.exposure.level}.`,
        `Mean luminance: ${visualContext.exposure.meanLuminance}.`,
      ],
      visualContext.limitations,
      isLow || isHigh ? "Want an editable brightness suggestion?" : undefined,
    );
  }

  if (isBinaryQuestion(request) && mentionsContrast(request)) {
    const isLowContrast = visualContext.contrast.level === "low";
    const isHighContrast = visualContext.contrast.level === "high";
    const asksFlat = /\b(?:flat|washed\s*out)\b/i.test(request);
    return createAnalysisAnswer(
      asksFlat
        ? isLowContrast
          ? "Yes — the local image audit suggests the image looks flat."
          : "No — the local image audit does not suggest a notably flat overall contrast range."
        : visualContext.contrast.level === "balanced"
          ? "The local image audit suggests overall contrast is fairly balanced."
          : `The local image audit suggests overall contrast is ${visualContext.contrast.level}.`,
      visualContext.contrast.level === "balanced" ? "medium" : "high",
      [
        `Contrast level: ${visualContext.contrast.level}.`,
        `Flatness score: ${visualContext.contrast.flatnessScore}.`,
      ],
      visualContext.limitations,
      isLowContrast || isHighContrast
        ? "Want an editable contrast suggestion?"
        : undefined,
    );
  }

  if (isBinaryQuestion(request) && mentionsSaturation(request)) {
    const isHigh = visualContext.saturation.level === "high";
    const isMuted = visualContext.saturation.level === "muted";
    return createAnalysisAnswer(
      /\b(?:muted|dull|faded)\b/i.test(request)
        ? isMuted
          ? "Yes — the local image audit suggests the colours are muted."
          : "No — the local image audit does not suggest muted overall colour."
        : isHigh
          ? "Yes — the local image audit suggests saturation is high."
          : "No — the local image audit does not suggest unusually high saturation.",
      visualContext.saturation.level === "balanced" ? "medium" : "high",
      [
        `Saturation level: ${visualContext.saturation.level}.`,
        `Mean saturation: ${visualContext.saturation.meanSaturation}.`,
      ],
      visualContext.limitations,
      isHigh || isMuted ? "Want an editable saturation suggestion?" : undefined,
    );
  }

  if (isBinaryQuestion(request) && mentionsWarmCool(request)) {
    return createAnalysisAnswer(
      /\bcool\b/i.test(request)
        ? visualContext.colorBalance.temperatureBias === "cool"
          ? "Yes — the local image audit suggests a cool overall colour balance."
          : "No — the local image audit does not suggest a cool overall colour balance."
        : /\bwarm\b/i.test(request)
          ? visualContext.colorBalance.temperatureBias === "warm"
            ? "Yes — the local image audit suggests a warm overall colour balance."
            : "No — the local image audit does not suggest a warm overall colour balance."
          : `The local image audit suggests a ${visualContext.colorBalance.temperatureBias} overall colour balance.`,
      visualContext.colorBalance.temperatureBias === "neutral" ? "medium" : "high",
      [
        `Temperature bias: ${visualContext.colorBalance.temperatureBias}.`,
        `Temperature score: ${visualContext.colorBalance.temperatureScore}.`,
      ],
      visualContext.limitations,
    );
  }

  if (isBinaryQuestion(request) && mentionsTint(request)) {
    return createAnalysisAnswer(
      /\bgreen\b/i.test(request)
        ? visualContext.colorBalance.tintBias === "green"
          ? "Yes — the local image audit suggests a green tint."
          : "No — the local image audit does not suggest a green tint."
        : /\bmagenta\b/i.test(request)
          ? visualContext.colorBalance.tintBias === "magenta"
            ? "Yes — the local image audit suggests a magenta tint."
            : "No — the local image audit does not suggest a magenta tint."
          : `The local image audit suggests a ${visualContext.colorBalance.tintBias} tint balance.`,
      visualContext.colorBalance.tintBias === "neutral" ? "medium" : "high",
      [
        `Tint bias: ${visualContext.colorBalance.tintBias}.`,
        `Tint score: ${visualContext.colorBalance.tintScore}.`,
      ],
      visualContext.limitations,
    );
  }

  if (isBinaryQuestion(request) && mentionsShadows(request)) {
    return createAnalysisAnswer(
      visualContext.clippingRisk.shadows
        ? "Yes — the local image audit suggests shadow clipping risk."
        : "No — the local image audit does not suggest shadow clipping risk.",
      visualContext.clippingRisk.shadows ? "high" : "medium",
      [
        `Shadow clipping risk: ${visualContext.clippingRisk.shadows ? "present" : "not detected"}.`,
      ],
      visualContext.limitations,
    );
  }

  if (isBinaryQuestion(request) && (mentionsClipping(request) || mentionsHighlights(request))) {
    return createAnalysisAnswer(
      visualContext.clippingRisk.highlights
        ? "Yes — the local image audit suggests highlight clipping risk."
        : "No — the local image audit does not suggest highlight clipping risk.",
      visualContext.clippingRisk.highlights ? "high" : "medium",
      [
        `Highlight clipping risk: ${visualContext.clippingRisk.highlights ? "present" : "not detected"}.`,
      ],
      visualContext.limitations,
    );
  }

  if (asksDominantColours(request)) {
    return createAnalysisAnswer(
      "The local image audit can only estimate overall dominant colours, not named subjects or regions.",
      "medium",
      visualContext.dominantColors.map(
        (color) => `Dominant colour ${color.hex} with share ${color.share}.`,
      ),
      visualContext.limitations,
    );
  }

  if (isWhyQuestion(request) && mentionsContrast(request)) {
    return createAnalysisAnswer(
      visualContext.contrast.level === "low"
        ? "The local image audit suggests the image looks flat because global contrast is low."
        : "The local image audit does not suggest especially low global contrast.",
      visualContext.contrast.level === "low" ? "high" : "medium",
      [
        `Contrast level: ${visualContext.contrast.level}.`,
        `Flatness score: ${visualContext.contrast.flatnessScore}.`,
      ],
      visualContext.limitations,
      visualContext.contrast.level === "low"
        ? "Want an editable contrast suggestion?"
        : undefined,
    );
  }

  if (isWhyQuestion(request) && mentionsBrightness(request)) {
    return createAnalysisAnswer(
      visualContext.exposure.level === "low"
        ? "The local image audit suggests the image looks dark because overall exposure is low."
        : visualContext.exposure.level === "high"
          ? "The local image audit suggests the image looks bright because overall exposure is high."
          : "The local image audit suggests overall exposure is fairly balanced rather than strongly dark or bright.",
      "medium",
      [
        `Exposure level: ${visualContext.exposure.level}.`,
        `Mean luminance: ${visualContext.exposure.meanLuminance}.`,
      ],
      visualContext.limitations,
      visualContext.exposure.level === "low" || visualContext.exposure.level === "high"
        ? "Want an editable brightness suggestion?"
        : undefined,
    );
  }

  if (
    (/^\s*why\b/i.test(request) || /^\s*is\b/i.test(request)) &&
    mentionsSaturation(request)
  ) {
    const isHigh = visualContext.saturation.level === "high";
    const isMuted = visualContext.saturation.level === "muted";
    return createAnalysisAnswer(
      isHigh
        ? "The local image audit suggests colour intensity is strong because saturation is high."
        : isMuted
          ? "The local image audit suggests colour intensity is subdued because saturation is muted."
          : "The local image audit suggests overall saturation is fairly balanced.",
      "medium",
      [
        `Saturation level: ${visualContext.saturation.level}.`,
        `Mean saturation: ${visualContext.saturation.meanSaturation}.`,
      ],
      visualContext.limitations,
      isHigh || isMuted ? "Want an editable saturation suggestion?" : undefined,
    );
  }

  return createAnalysisAnswer(
    "I can answer overall audit questions about brightness, contrast, saturation, clipping risk, colour balance, and dominant colours for the selected image.",
    "low",
    [],
    visualContext.limitations,
  );
};

const createSummary = (request: string) =>
  `Built-in planner interpreted: ${request}`;

export class DeterministicEditPlanProvider implements EditPlanProvider {
  readonly id = "deterministic" as const;
  readonly label = "Deterministic (built in)";
  readonly description = "Rule-based local parser. Always available.";

  async createPlan(
    input: EditPlanProviderRequest,
  ): Promise<EditPlanProviderResult> {
    if (input.interactionMode === "learn-answer") {
      const learningAnswer = buildLearningResponse(input.request);
      return {
        ok: true,
        response: learningAnswer
          ? { mode: "learning-answer" as const, ...learningAnswer }
          : {
              mode: "learning-answer" as const,
              answer:
                "I can explain brightness, contrast, saturation, rotation, and scaling using the trusted PhotoProx tool definitions.",
              bullets: [],
              relatedTools: [],
              followUp:
                "Ask about a specific tool such as contrast or brightness.",
            },
      };
    }

    if (input.interactionMode === "analysis-answer") {
      return {
        ok: true,
        response: answerWithAudit(input.request, input.visualContext),
      };
    }

    const result = parseShowMeRequest(input.request, input.context);
    if (!result.ok) {
      return {
        ok: true,
        response: {
          mode: "edit-plan" as const,
          summary: "The built-in planner needs clarification.",
          clarification: {
            needed: true,
            question: result.error,
          },
          steps: [],
        },
      };
    }

    return {
      ok: true,
      response: {
        mode: "edit-plan" as const,
        summary: createSummary(input.request),
        clarification: { needed: false },
        steps: result.plan.steps.map((step) => ({
          toolId: step.toolId,
          parameters: step.parameters,
        })),
      },
    };
  }
}
