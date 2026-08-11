import { SerializableEditorAction } from "@/interfaces/editor/EditDocument";

export type PhotoProxToolId =
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
  availableAdjustmentToolIds?: PhotoProxToolId[];
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

export interface PhotoProxToolParameters {
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

export interface PhotoProxTool<K extends PhotoProxToolId = PhotoProxToolId> {
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
  ) => parameters is PhotoProxToolParameters[K];
  formatTitle: (parameters: PhotoProxToolParameters[K]) => string;
  formatExplanation: (parameters: PhotoProxToolParameters[K]) => string;
  createActions?: (
    parameters: PhotoProxToolParameters[K],
  ) => SerializableEditorAction[];
}

export type PhotoProxToolRegistry = {
  version: 1;
  tools: {
    [K in PhotoProxToolId]: PhotoProxTool<K>;
  };
};

export interface PhotoProxToolManifestEntry {
  id: PhotoProxToolId;
  displayName: string;
  description: string;
  education: ToolEducation;
  parameters: ToolParameterSchema;
  uiTargetId: ShowMeControlId;
  batchSafe: boolean;
  executionPolicy: ToolExecutionPolicy;
}

export interface PhotoProxToolManifest {
  version: 1;
  tools: PhotoProxToolManifestEntry[];
}

export type PhotoProxToolRequest = {
  [K in PhotoProxToolId]: {
    toolId: K;
    parameters: PhotoProxToolParameters[K];
  };
}[PhotoProxToolId];
