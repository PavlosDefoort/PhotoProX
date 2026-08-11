import {
  AdjustmentEditState,
  ImageAdjustmentAction,
  EditDocument,
  ImageTransformAction,
  ImageTransformState,
} from "@/interfaces/editor/EditDocument";

export const createEditDocument = (): EditDocument => ({
  version: 1,
  imageLayers: {},
  adjustmentLayers: {},
  selections: {},
});

const normalizeDegrees = (degrees: number) => {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const roundDimension = (value: number) =>
  Math.round(Math.max(1, value) * 10000) / 10000;

export const applyImageTransformAction = (
  state: ImageTransformState,
  action: ImageTransformAction,
): ImageTransformState => {
  switch (action.type) {
    case "image.rotateBy":
      if (!Number.isFinite(action.degrees)) {
        throw new Error("Rotation must be a finite number.");
      }
      return {
        ...state,
        rotationDegrees: normalizeDegrees(
          state.rotationDegrees + action.degrees,
        ),
      };
    case "image.setRotation":
      if (!Number.isFinite(action.degrees)) {
        throw new Error("Rotation must be a finite number.");
      }
      return {
        ...state,
        rotationDegrees: normalizeDegrees(action.degrees),
      };
    case "image.resizeToPercent": {
      if (
        !Number.isFinite(action.percent) ||
        action.percent <= 0 ||
        action.percent > 400
      ) {
        throw new Error(
          "Resize percentage must be greater than zero and no more than 400.",
        );
      }
      const scale = action.percent / 100;
      return {
        ...state,
        width: roundDimension(state.width * scale),
        height: roundDimension(state.height * scale),
      };
    }
    case "image.setDimensions":
      if (
        !Number.isFinite(action.width) ||
        !Number.isFinite(action.height) ||
        action.width < 1 ||
        action.height < 1
      ) {
        throw new Error("Image dimensions must be at least one pixel.");
      }
      return {
        ...state,
        width: action.width,
        height: action.height,
      };
  }
};

export const applyImageTransformActions = (
  state: ImageTransformState,
  actions: ImageTransformAction[],
) =>
  actions.reduce(
    (currentState, action) =>
      applyImageTransformAction(currentState, action),
    state,
  );

const validateAdjustmentValue = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 2) {
    throw new Error("Adjustment values must be between 0 and 2.");
  }
};

export const applyImageAdjustmentAction = (
  state: AdjustmentEditState,
  action: ImageAdjustmentAction,
): AdjustmentEditState => {
  validateAdjustmentValue(action.value);

  switch (action.type) {
    case "adjustment.setBrightness":
      if (state.kind !== "brightness-contrast") {
        throw new Error("Brightness requires a brightness adjustment layer.");
      }
      return {
        ...state,
        values: { ...state.values, brightness: action.value },
      };
    case "adjustment.setContrast":
      if (state.kind !== "brightness-contrast") {
        throw new Error("Contrast requires a brightness adjustment layer.");
      }
      return {
        ...state,
        values: { ...state.values, contrast: action.value },
      };
    case "adjustment.setSaturation":
      if (state.kind !== "saturation") {
        throw new Error("Saturation requires a saturation adjustment layer.");
      }
      return {
        ...state,
        values: { ...state.values, saturation: action.value },
      };
  }
};
