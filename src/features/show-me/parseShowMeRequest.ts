import {
  ShowMeParseResult,
  ShowMePlanStep,
} from "@/features/show-me/types";
import { createShowMePlanStep } from "./createShowMePlan";
import { ToolAvailabilityContext } from "./tools/types";

const ROTATE =
  /\brotate(?:\s+(?:this|the|selected|image|photo|layer|it|these|images|photos))*\s+(\d+(?:\.\d+)?)\s*(?:degrees?|deg|°)?(?:\s+(clockwise|counterclockwise|anticlockwise))?\b/i;
const RESIZE_TO_PERCENT =
  /\b(?:resize|scale)(?:\s+(?:this|the|selected|image|photo|layer|it))*\s+to\s+(\d+(?:\.\d+)?)\s*%/i;
const SCALE_DOWN_BY =
  /\bscale(?:\s+(?:this|the|selected|image|photo|layer|it))*\s+down\s+by\s+(\d+(?:\.\d+)?)\b/i;
const SET_BRIGHTNESS =
  /\bset\s+brightness\s+to\s+(\d+(?:\.\d+)?)\b/i;
const MAKE_BRIGHTER = /\bmake(?:\s+this)?\s+(?:image\s+)?brighter\b/i;
const MAKE_BRIGHTER_WITHOUT_WASHING_OUT =
  /\bmake(?:\s+this)?\s+(?:image\s+)?brighter\b.*\bwithout\s+wash(?:ing)?\s+(?:it|this|the\s+image)?\s*out\b/i;
const INCREASE_CONTRAST = /\bincrease\s+contrast\b/i;
const MORE_VIVID =
  /\bmake(?:\s+the|\s+this)?\s+colou?rs?\s+more\s+vivid\b/i;
const REDUCE_SATURATION =
  /\b(?:reduce|lower|decrease|tone\s+down)\s+(?:the\s+)?(?:(?:colou?r|color)\s+)?(?:saturation|(?:inten|insen)\w*)\b/i;

const DEFAULT_CONTEXT: ToolAvailabilityContext = {
  selectedLayerKind: "image",
};

export const parseShowMeRequest = (
  request: string,
  context: ToolAvailabilityContext = DEFAULT_CONTEXT,
): ShowMeParseResult => {
  const normalizedRequest = request.trim();
  if (!normalizedRequest) {
    return { ok: false, error: "Enter an editing request first." };
  }

  const steps: ShowMePlanStep[] = [];
  const rotationMatch = normalizedRequest.match(ROTATE);
  const resizeMatch = normalizedRequest.match(RESIZE_TO_PERCENT);
  const scaleDownMatch = normalizedRequest.match(SCALE_DOWN_BY);
  const setBrightnessMatch = normalizedRequest.match(SET_BRIGHTNESS);

  if (rotationMatch) {
    const degrees = Number(rotationMatch[1]);
    if (!Number.isFinite(degrees) || degrees <= 0 || degrees > 360) {
      return {
        ok: false,
        error: "Rotation degrees must be between 1 and 360.",
      };
    }
    const direction = rotationMatch[2];
    const rotateClockwise =
      !direction || /clockwise/i.test(direction) && !/counterclockwise|anticlockwise/i.test(direction);
    const result = createShowMePlanStep(
      `rotate-${rotateClockwise ? "clockwise" : "counterclockwise"}-${degrees}`,
      rotateClockwise ? "image.rotate.clockwise" : "image.rotate.counterclockwise",
      { degrees },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (/\brotate\b/i.test(normalizedRequest)) {
    return {
      ok: false,
      error:
        'Try "rotate 45 degrees", "rotate 45 degrees clockwise", or "rotate 45 degrees counterclockwise" in this MVP.',
    };
  }

  if (resizeMatch) {
    const percent = Number(resizeMatch[1]);
    const result = createShowMePlanStep(
      `resize-to-${percent}`,
      "image.scale.percent",
      { percent },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (scaleDownMatch) {
    const factor = Number(scaleDownMatch[1]);
    if (!Number.isFinite(factor) || factor <= 1) {
      return {
        ok: false,
        error: "The scale-down factor must be greater than 1.",
      };
    }
    const percent = 100 / factor;
    const result = createShowMePlanStep(
      `scale-down-by-${factor}`,
      "image.scale.percent",
      { percent, sourceFactor: factor },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (/\b(?:resize|scale)\b/i.test(normalizedRequest)) {
    return {
      ok: false,
      error:
        'Try "resize to 50%" or "scale down by 1.5" in this MVP.',
    };
  }

  if (
    setBrightnessMatch ||
    MAKE_BRIGHTER_WITHOUT_WASHING_OUT.test(normalizedRequest) ||
    MAKE_BRIGHTER.test(normalizedRequest)
  ) {
    const requestedValue = setBrightnessMatch
      ? Number(setBrightnessMatch[1])
      : MAKE_BRIGHTER_WITHOUT_WASHING_OUT.test(normalizedRequest)
        ? 1.05
        : 1.1;
    const value =
      setBrightnessMatch && requestedValue > 2
        ? 1 + requestedValue / 100
        : requestedValue;
    const result = createShowMePlanStep(
      `set-brightness-${value}`,
      "adjustment.brightness",
      { value },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (/\bbrightness\b|\bbrighter\b/i.test(normalizedRequest)) {
    return {
      ok: false,
      error:
        'Try "make this brighter" or "set brightness to 20" in this MVP.',
    };
  }

  if (INCREASE_CONTRAST.test(normalizedRequest) || /\bmake\s+this\s+less\s+flat\b/i.test(normalizedRequest)) {
    const result = createShowMePlanStep(
      "increase-contrast",
      "adjustment.contrast",
      { value: 1.1 },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (/\bcontrast\b/i.test(normalizedRequest)) {
    return {
      ok: false,
      error: 'Try "increase contrast" in this MVP.',
    };
  }

  if (MORE_VIVID.test(normalizedRequest)) {
    const result = createShowMePlanStep(
      "increase-saturation",
      "adjustment.saturation",
      { value: 1.2 },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (REDUCE_SATURATION.test(normalizedRequest)) {
    const result = createShowMePlanStep(
      "decrease-saturation",
      "adjustment.saturation",
      { value: 0.9 },
      context,
    );
    if (!result.ok) return result;
    steps.push(result.step);
  } else if (/\bsaturation\b|\bvivid\b/i.test(normalizedRequest)) {
    return {
      ok: false,
      error:
        'Try "make the colours more vivid" or "reduce saturation" in this MVP.',
    };
  }

  if (steps.length === 0) {
    return {
      ok: false,
      error:
        "This MVP supports registered rotate, scale, brightness, contrast, and saturation requests.",
    };
  }

  return {
    ok: true,
    plan: {
      request: normalizedRequest,
      steps,
    },
  };
};
