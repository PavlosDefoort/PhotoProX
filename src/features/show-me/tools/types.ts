import { SerializableEditorAction } from "@/interfaces/editor/EditDocument";

export type ZynaloToolId =
  | "image.rotate.clockwise"
  | "image.rotate.counterclockwise"
  | "image.scale.percent"
  | "adjustment.brightness"
  | "adjustment.contrast"
  | "adjustment.saturation";

export type ShowMeControlId =
  | "transform.rotation"
  | "transform.scale-percent"
  | "adjustment.brightness"
  | "adjustment.contrast"
  | "adjustment.saturation";

export type SelectedLayerKind =
  | "none"
  | "image"
  | "brightness-adjustment"
  | "saturation-adjustment"
  | "other";

export interface ToolAvailabilityContext {
  selectedLayerKind: SelectedLayerKind;
  availableAdjustmentToolIds?: ZynaloToolId[];
}

export type ToolExecutionPolicy =
  | "auto-apply"
  | "confirmation-required"
  | "guide-only";

export interface RotateParameters {
  degrees: number;
}

export interface ScalePercentParameters {
  percent: number;
  sourceFactor?: number;
}

export interface AdjustmentValueParameters {
  value: number;
}

export interface ZynaloToolParameters {
  "image.rotate.clockwise": RotateParameters;
  "image.rotate.counterclockwise": RotateParameters;
  "image.scale.percent": ScalePercentParameters;
  "adjustment.brightness": AdjustmentValueParameters;
  "adjustment.contrast": AdjustmentValueParameters;
  "adjustment.saturation": AdjustmentValueParameters;
}

export interface NumberParameterSchema {
  type: "number";
  description: string;
  minimum: number;
  maximum: number;
  exclusiveMinimum?: boolean;
  required: boolean;
}

export type ToolParameterSchema = Record<string, NumberParameterSchema>;

export interface ToolEducation {
  whatItChanges: string;
  whenAppropriate: string;
  caveats: string;
}

export interface ZynaloTool<K extends ZynaloToolId = ZynaloToolId> {
  id: K;
  displayName: string;
  description: string;
  education: ToolEducation;
  parameters: ToolParameterSchema;
  uiTargetId: ShowMeControlId;
  batchSafe: boolean;
  executionPolicy: ToolExecutionPolicy;
  supports: (context: ToolAvailabilityContext) => boolean;
  validateParameters: (
    parameters: unknown,
  ) => parameters is ZynaloToolParameters[K];
  formatTitle: (parameters: ZynaloToolParameters[K]) => string;
  formatExplanation: (parameters: ZynaloToolParameters[K]) => string;
  createActions?: (
    parameters: ZynaloToolParameters[K],
  ) => SerializableEditorAction[];
}

export type ZynaloToolRegistry = {
  version: 1;
  tools: {
    [K in ZynaloToolId]: ZynaloTool<K>;
  };
};

export interface ZynaloToolManifestEntry {
  id: ZynaloToolId;
  displayName: string;
  description: string;
  education: ToolEducation;
  parameters: ToolParameterSchema;
  uiTargetId: ShowMeControlId;
  batchSafe: boolean;
  executionPolicy: ToolExecutionPolicy;
}

export interface ZynaloToolManifest {
  version: 1;
  tools: ZynaloToolManifestEntry[];
}

export type ZynaloToolRequest = {
  [K in ZynaloToolId]: {
    toolId: K;
    parameters: ZynaloToolParameters[K];
  };
}[ZynaloToolId];
