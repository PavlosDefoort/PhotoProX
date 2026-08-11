import { parseShowMeRequest } from "./parseShowMeRequest";
import type { ToolAvailabilityContext } from "./tools/types";
import type { ShowMeIntent } from "./types";

export interface ShowMeIntentClassification {
  intent: ShowMeIntent;
  clarificationQuestion?: string;
}

const isQuestionStyleRequest = (request: string) =>
  /^\s*(?:is|are|does|do|why|what|how|when|which|can|could|would|should)\b/i.test(
    request.trim(),
  );

const isAnalysisQuestion = (request: string) =>
  isQuestionStyleRequest(request) &&
  /\b(?:bright|brightness|dark|dim|exposure|overexposed|underexposed|flat|contrast|saturation|muted|vivid|warm|cool|green|magenta|tint|cast|dominant\s+colou?rs?|dominant\s+colors?|clipp\w+|highlight|highlights|shadow|shadows)\b/i.test(
    request,
  ) &&
  /\b(?:image|photo|this|it|overexposed|underexposed|dominant|highlight|shadow|bright|dark|flat|warm|cool|saturation|contrast)\b/i.test(
    request,
  );

const isLearningQuestion = (request: string) =>
  /\b(?:what\s+does|how\s+does|when\s+should\s+i\s+use|what(?:'s| is)\s+the\s+difference\s+between|difference\s+between)\b/i.test(
    request,
  ) &&
  /\b(?:brightness|contrast|saturation|rotate|rotation|resize|scale|scaling)\b/i.test(
    request,
  );

const isDirectLearningFollowUp = (request: string) =>
  /^(?:explanation|explain|learn|learning|why)\b/i.test(request.trim()) ||
  /\bwhy\s+is\b/i.test(request);

const isSubjectiveRequest = (request: string) =>
  /\b(?:feel|feels|feeling|vibe|vibes|look|looks|looking|pop|natural|professional|candid|subtle|warm|cool|moody|polished|tasteful|vivid|muted|balanced|refined|editorial|cinematic|dramatic|soft|bold|authentic|modern|clean|classic|atmospheric|dreamy)\b/i.test(
    request,
  ) &&
  /\b(?:make|make\s+this|make\s+it|this|it|image|photo|tone|style|treatment|edit|adjust|feel|look)\b/i.test(
    request,
  );

const isExplicitEditRequest = (request: string) =>
  /^(?:make|rotate|resize|scale|set|increase|reduce|lower|decrease|tone\s+down|brighten|darken)\b/i.test(
    request.trim(),
  ) ||
  /^\s*(?:can|could|would)\s+you\b.*\b(?:make|rotate|resize|scale|set|increase|reduce|lower|decrease|brighten|darken)\b/i.test(
    request,
  );

const isAmbiguousToolTopic = (request: string) =>
  /^\s*(?:brightness|contrast|saturation|rotate|rotation|resize|scale)\??\s*$/i.test(
    request.trim(),
  );

export const classifyShowMeIntent = (
  request: string,
  context: ToolAvailabilityContext,
): ShowMeIntentClassification => {
  const normalizedRequest = request.trim();
  if (!normalizedRequest) {
    return {
      intent: "ambiguous",
      clarificationQuestion: "What would you like help with?",
    };
  }

  if (isLearningQuestion(normalizedRequest)) {
    return { intent: "learn" };
  }

  if (isAnalysisQuestion(normalizedRequest)) {
    return { intent: "analysis" };
  }

  if (isDirectLearningFollowUp(normalizedRequest)) {
    return { intent: "learn" };
  }

  if (isSubjectiveRequest(normalizedRequest)) {
    return { intent: "subjective" };
  }

  if (
    isExplicitEditRequest(normalizedRequest) ||
    parseShowMeRequest(normalizedRequest, context).ok
  ) {
    return { intent: "edit" };
  }

  if (isAmbiguousToolTopic(normalizedRequest)) {
    return {
      intent: "ambiguous",
      clarificationQuestion:
        "Do you want a quick explanation of that tool or an editable change on the selected image?",
    };
  }

  if (
    isQuestionStyleRequest(normalizedRequest) &&
    /\b(?:bright|brightness|contrast|saturation|vivid|muted|dark|rotate|resize|scale)\b/i.test(
      normalizedRequest,
    )
  ) {
    return {
      intent: "ambiguous",
      clarificationQuestion:
        "Do you want an explanation or an editable suggestion for the selected image?",
    };
  }

  return {
    intent: "ambiguous",
    clarificationQuestion:
      "Do you want an explanation, a safe editable change, or a creative suggestion for the selected image?",
  };
};
