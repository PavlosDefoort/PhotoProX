import { AdjustmentEditState } from "@/interfaces/editor/EditDocument";
import {
  BrightnessAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "@/models/project/Layers/AdjustmentLayer";
import { AdjustmentLayer } from "@/models/project/Layers/Layers";
import { AdjustmentFilter } from "pixi-filters";
import { Filter } from "pixi.js";

export const readAdjustmentEditState = (
  layer: AdjustmentLayer,
): AdjustmentEditState | null => {
  if (layer instanceof BrightnessAdjustmentLayer) {
    return {
      id: layer.id,
      type: "adjustment",
      kind: "brightness-contrast",
      values: {
        brightness: layer.brightness,
        contrast: layer.contrast,
        saturation: 1,
      },
    };
  }
  if (layer instanceof SaturationAdjustmentLayer) {
    return {
      id: layer.id,
      type: "adjustment",
      kind: "saturation",
      values: {
        brightness: 1,
        contrast: 1,
        saturation: layer.saturation,
      },
    };
  }
  return null;
};

export const projectAdjustmentStateToRuntime = (
  layer: AdjustmentLayer,
  state: AdjustmentEditState,
) => {
  if (
    layer instanceof BrightnessAdjustmentLayer &&
    state.kind === "brightness-contrast"
  ) {
    const filter = (layer.container.filters as Filter[])[0] as AdjustmentFilter;
    filter.brightness = state.values.brightness;
    filter.contrast = state.values.contrast;
  } else if (
    layer instanceof SaturationAdjustmentLayer &&
    state.kind === "saturation"
  ) {
    const filter = (layer.container.filters as Filter[])[0] as AdjustmentFilter;
    filter.saturation = state.values.saturation;
  }
};
