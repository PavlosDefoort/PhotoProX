export interface ImageTransformState {
  rotationDegrees: number;
  width: number;
  height: number;
}

export interface ImageEditState {
  id: string;
  type: "image";
  transform: ImageTransformState;
  adjustmentLayerIds: string[];
}

export type SelectionPoint = { x: number; y: number };
export type SelectionCombineMode = "new" | "add" | "subtract" | "intersect";
export type SelectionPathKind = "lasso" | "polygonal" | "magnetic";
export interface SelectionPath {
  kind: SelectionPathKind;
  points: SelectionPoint[];
  feather: number;
  mode: SelectionCombineMode;
}
export interface ImageSelectionState {
  layerId: string;
  paths: SelectionPath[];
  inverted: boolean;
}

export interface AdjustmentValues {
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface AdjustmentEditState {
  id: string;
  type: "adjustment";
  kind: "brightness-contrast" | "saturation";
  values: AdjustmentValues;
}

export interface EditDocument {
  version: 1;
  imageLayers: Record<string, ImageEditState>;
  adjustmentLayers: Record<string, AdjustmentEditState>;
  selections: Record<string, ImageSelectionState>;
}

export type ImageTransformAction =
  | {
      type: "image.rotateBy";
      degrees: number;
    }
  | {
      type: "image.setRotation";
      degrees: number;
    }
  | {
      type: "image.resizeToPercent";
      percent: number;
    }
  | {
      type: "image.setDimensions";
      width: number;
      height: number;
    };

export type ImageAdjustmentAction =
  | {
      type: "adjustment.setBrightness";
      value: number;
    }
  | {
      type: "adjustment.setContrast";
      value: number;
    }
  | {
      type: "adjustment.setSaturation";
      value: number;
    };

export type SerializableEditorAction =
  | ImageTransformAction
  | ImageAdjustmentAction;
