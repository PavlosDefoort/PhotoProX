import { getPhotoProxTool } from "./tools/photoProxToolRegistry";
import type { PhotoProxToolId } from "./tools/types";
import type { ShowMeLearningAnswer } from "./types";

const normalizeRequest = (request: string) => request.trim().toLowerCase();

const findRequestedTools = (request: string): PhotoProxToolId[] => {
  const matches = new Set<PhotoProxToolId>();
  if (/\bbrightness\b/.test(request)) matches.add("adjustment.brightness");
  if (/\bcontrast\b/.test(request)) matches.add("adjustment.contrast");
  if (/\bsaturation\b|\bcolou?r\b|\bcolor\b/.test(request))
    matches.add("adjustment.saturation");
  if (/\brotate\b|\brotation\b/.test(request))
    matches.add("image.rotate.clockwise");
  if (/\bresize\b|\bscale\b|\bscaling\b/.test(request))
    matches.add("image.scale.percent");
  return Array.from(matches);
};

const buildSingleToolLearningAnswer = (
  toolId: PhotoProxToolId,
): ShowMeLearningAnswer => {
  const tool = getPhotoProxTool(toolId);
  return {
    answer: `${tool.displayName} ${tool.education.whatItChanges}`,
    bullets: [
      `When to use it: ${tool.education.whenAppropriate}`,
      `Watch out for: ${tool.education.caveats}`,
    ],
    relatedTools: [tool.id],
    followUp:
      "If you want, I can turn that into an editable suggestion for the selected image.",
  };
};

const buildBrightnessVsContrastAnswer = (): ShowMeLearningAnswer => {
  const brightness = getPhotoProxTool("adjustment.brightness");
  const contrast = getPhotoProxTool("adjustment.contrast");
  return {
    answer:
      "Brightness changes overall lightness, while contrast changes how strongly light and dark tones separate.",
    bullets: [
      `Brightness: ${brightness.education.whenAppropriate}`,
      `Contrast: ${contrast.education.whenAppropriate}`,
      `Caveat: ${brightness.education.caveats} ${contrast.education.caveats}`,
    ],
    relatedTools: ["adjustment.brightness", "adjustment.contrast"],
    followUp:
      "If you want, I can suggest which one fits the selected image better.",
  };
};

export const buildLearningResponse = (
  request: string,
): ShowMeLearningAnswer | null => {
  const normalized = normalizeRequest(request);

  if (
    /\bbrightness\b/.test(normalized) &&
    /\bcontrast\b/.test(normalized) &&
    /\b(?:instead\s+of|difference\s+between|vs\.?)\b/.test(normalized)
  ) {
    return buildBrightnessVsContrastAnswer();
  }

  const requestedTools = findRequestedTools(normalized);
  if (requestedTools.length === 1) {
    return buildSingleToolLearningAnswer(requestedTools[0]);
  }

  if (
    requestedTools.length === 2 &&
    requestedTools.includes("adjustment.brightness") &&
    requestedTools.includes("adjustment.contrast")
  ) {
    return buildBrightnessVsContrastAnswer();
  }

  return null;
};
