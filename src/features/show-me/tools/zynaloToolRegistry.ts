import {
  AdjustmentValueParameters,
  ZynaloTool,
  ZynaloToolId,
  ZynaloToolManifest,
  ZynaloToolParameters,
  ZynaloToolRegistry,
  RotateParameters,
  ScalePercentParameters,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

const isNumberInRange = (
  value: unknown,
  minimum: number,
  maximum: number,
  exclusiveMinimum = false,
) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  (exclusiveMinimum ? value > minimum : value >= minimum) &&
  value <= maximum;

const validateRotateParameters = (
  value: unknown,
): value is RotateParameters =>
  isRecord(value) &&
  hasOnlyKeys(value, ["degrees"]) &&
  isNumberInRange(value.degrees, 1, 360);

const validateScaleParameters = (
  value: unknown,
): value is ScalePercentParameters =>
  isRecord(value) &&
  hasOnlyKeys(value, ["percent", "sourceFactor"]) &&
  isNumberInRange(value.percent, 0, 400, true) &&
  (value.sourceFactor === undefined ||
    isNumberInRange(value.sourceFactor, 1, 100, true));

const validateAdjustmentParameters = (
  value: unknown,
): value is AdjustmentValueParameters =>
  isRecord(value) &&
  hasOnlyKeys(value, ["value"]) &&
  isNumberInRange(value.value, 0, 2);

const formatPercent = (percent: number) =>
  Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(1);

export const ZYNALO_TOOL_REGISTRY: ZynaloToolRegistry = {
  version: 1,
  tools: {
    "image.rotate.clockwise": {
      id: "image.rotate.clockwise",
      displayName: "Rotate clockwise",
      description: "Rotates the selected image clockwise by a safe angle.",
      education: {
        whatItChanges: "Changes the selected image layer's rotation.",
        whenAppropriate:
          "Use it to correct orientation or create a deliberate angled layout.",
        caveats:
          "Rotation can move image corners outside the canvas; no pixels are discarded.",
      },
      parameters: {
        degrees: {
          type: "number",
          description: "Clockwise rotation angle in degrees.",
          minimum: 1,
          maximum: 360,
          required: true,
        },
      },
      uiTargetId: "transform.rotation",
      batchSafe: true,
      executionPolicy: "auto-apply",
      supports: ({ selectedLayerKind }) => selectedLayerKind === "image",
      validateParameters: validateRotateParameters,
      formatTitle: ({ degrees }) => `Rotate ${degrees}° clockwise`,
      formatExplanation: ({ degrees }) =>
        degrees === 90
          ? "A positive 90° rotation turns the selected image one quarter-turn clockwise."
          : `A positive ${degrees}° rotation turns the selected image clockwise.`,
      createActions: ({ degrees }) => [
        { type: "image.rotateBy", degrees },
      ],
    },
    "image.rotate.counterclockwise": {
      id: "image.rotate.counterclockwise",
      displayName: "Rotate counterclockwise",
      description:
        "Rotates the selected image counterclockwise by a safe angle.",
      education: {
        whatItChanges: "Changes the selected image layer's rotation.",
        whenAppropriate:
          "Use it to correct orientation or create a deliberate angled layout.",
        caveats:
          "Rotation can move image corners outside the canvas; no pixels are discarded.",
      },
      parameters: {
        degrees: {
          type: "number",
          description: "Counterclockwise rotation angle in degrees.",
          minimum: 1,
          maximum: 360,
          required: true,
        },
      },
      uiTargetId: "transform.rotation",
      batchSafe: true,
      executionPolicy: "auto-apply",
      supports: ({ selectedLayerKind }) => selectedLayerKind === "image",
      validateParameters: validateRotateParameters,
      formatTitle: ({ degrees }) => `Rotate ${degrees}° counterclockwise`,
      formatExplanation: ({ degrees }) =>
        `A negative ${degrees}° rotation turns the selected image counterclockwise. Rotation is non-destructive, but its corners may extend beyond the canvas.`,
      createActions: ({ degrees }) => [
        { type: "image.rotateBy", degrees: -degrees },
      ],
    },
    "image.scale.percent": {
      id: "image.scale.percent",
      displayName: "Scale by percentage",
      description:
        "Resizes the selected image proportionally using its current dimensions.",
      education: {
        whatItChanges:
          "Changes both width and height by the same percentage.",
        whenAppropriate:
          "Use it to make an image larger or smaller without changing its aspect ratio.",
        caveats:
          "Repeated scaling is relative to the current size; enlarging beyond 100% may reveal softness.",
      },
      parameters: {
        percent: {
          type: "number",
          description: "Percentage of the image's current size.",
          minimum: 0,
          maximum: 400,
          exclusiveMinimum: true,
          required: true,
        },
        sourceFactor: {
          type: "number",
          description:
            "Optional divisor from a phrase such as scale down by 1.5.",
          minimum: 1,
          maximum: 100,
          exclusiveMinimum: true,
          required: false,
        },
      },
      uiTargetId: "transform.scale-percent",
      batchSafe: true,
      executionPolicy: "auto-apply",
      supports: ({ selectedLayerKind }) => selectedLayerKind === "image",
      validateParameters: validateScaleParameters,
      formatTitle: ({ percent }) => `Resize to ${formatPercent(percent)}%`,
      formatExplanation: ({ percent, sourceFactor }) =>
        sourceFactor
          ? `Scaling down by ${sourceFactor} means dividing each dimension by ${sourceFactor}: 100% ÷ ${sourceFactor} = ${formatPercent(percent)}%.`
          : `The width and height will each become ${formatPercent(percent)}% of their current values, preserving the aspect ratio.`,
      createActions: ({ percent }) => [
        { type: "image.resizeToPercent", percent },
      ],
    },
    "adjustment.brightness": {
      id: "adjustment.brightness",
      displayName: "Brightness",
      description:
        "Sets the document-backed brightness adjustment multiplier.",
      education: {
        whatItChanges: "Changes the overall lightness of affected pixels.",
        whenAppropriate:
          "Use it for broad exposure-like corrections on a brightness adjustment layer.",
        caveats:
          "Large increases can clip highlights; this control does not selectively protect the sky.",
      },
      parameters: {
        value: {
          type: "number",
          description: "Brightness multiplier.",
          minimum: 0,
          maximum: 2,
          required: true,
        },
      },
      uiTargetId: "adjustment.brightness",
      batchSafe: false,
      executionPolicy: "auto-apply",
      supports: ({ selectedLayerKind }) =>
        selectedLayerKind === "brightness-adjustment" ||
        selectedLayerKind === "image",
      validateParameters: validateAdjustmentParameters,
      formatTitle: ({ value }) => `Set brightness to ${value}`,
      formatExplanation: ({ value }) =>
        `Set the brightness multiplier to ${value}. Review highlights because this global adjustment does not protect bright regions.`,
      createActions: ({ value }) => [
        { type: "adjustment.setBrightness", value },
      ],
    },
    "adjustment.contrast": {
      id: "adjustment.contrast",
      displayName: "Contrast",
      description:
        "Sets the document-backed contrast adjustment multiplier.",
      education: {
        whatItChanges:
          "Increases or decreases separation between light and dark tones.",
        whenAppropriate:
          "Use it when an image looks flat or overly harsh.",
        caveats:
          "Strong values can lose shadow or highlight detail.",
      },
      parameters: {
        value: {
          type: "number",
          description: "Contrast multiplier.",
          minimum: 0,
          maximum: 2,
          required: true,
        },
      },
      uiTargetId: "adjustment.contrast",
      batchSafe: false,
      executionPolicy: "auto-apply",
      supports: ({ selectedLayerKind }) =>
        selectedLayerKind === "brightness-adjustment" ||
        selectedLayerKind === "image",
      validateParameters: validateAdjustmentParameters,
      formatTitle: ({ value }) => `Set contrast to ${value}`,
      formatExplanation: ({ value }) =>
        `Set the contrast multiplier to ${value}. Check both shadows and highlights for lost detail.`,
      createActions: ({ value }) => [
        { type: "adjustment.setContrast", value },
      ],
    },
    "adjustment.saturation": {
      id: "adjustment.saturation",
      displayName: "Saturation",
      description:
        "Sets the document-backed saturation adjustment multiplier.",
      education: {
        whatItChanges: "Changes the intensity of colors.",
        whenAppropriate:
          "Use it to strengthen muted color or create a subdued look.",
        caveats:
          "High values can create unnatural colors and exaggerate color noise.",
      },
      parameters: {
        value: {
          type: "number",
          description: "Saturation multiplier.",
          minimum: 0,
          maximum: 2,
          required: true,
        },
      },
      uiTargetId: "adjustment.saturation",
      batchSafe: false,
      executionPolicy: "auto-apply",
      supports: ({ selectedLayerKind }) =>
        selectedLayerKind === "saturation-adjustment" ||
        selectedLayerKind === "image",
      validateParameters: validateAdjustmentParameters,
      formatTitle: ({ value }) => `Set saturation to ${value}`,
      formatExplanation: ({ value }) =>
        `Set the saturation multiplier to ${value}. Watch for unnatural color and amplified noise.`,
      createActions: ({ value }) => [
        { type: "adjustment.setSaturation", value },
      ],
    },
  },
};

export const isZynaloToolId = (
  toolId: string,
): toolId is ZynaloToolId =>
  Object.prototype.hasOwnProperty.call(
    ZYNALO_TOOL_REGISTRY.tools,
    toolId,
  );

export const getZynaloTool = <K extends ZynaloToolId>(
  toolId: K,
): ZynaloTool<K> =>
  ZYNALO_TOOL_REGISTRY.tools[toolId] as ZynaloTool<K>;

export const validateToolParameters = <K extends ZynaloToolId>(
  toolId: K,
  parameters: unknown,
): parameters is ZynaloToolParameters[K] =>
  getZynaloTool(toolId).validateParameters(parameters);

export const getAvailableZynaloTools = (
  context: Parameters<ZynaloTool["supports"]>[0],
) =>
  Object.values(ZYNALO_TOOL_REGISTRY.tools).filter((tool) =>
    tool.supports(context),
  );

export const getZynaloToolManifest = (
  context: Parameters<ZynaloTool["supports"]>[0],
): ZynaloToolManifest => ({
  version: ZYNALO_TOOL_REGISTRY.version,
  tools: getAvailableZynaloTools(context).map((tool) => ({
    id: tool.id,
    displayName: tool.displayName,
    description: tool.description,
    education: tool.education,
    parameters: tool.parameters,
    uiTargetId: tool.uiTargetId,
    batchSafe: tool.batchSafe,
    executionPolicy: tool.executionPolicy,
  })),
});
