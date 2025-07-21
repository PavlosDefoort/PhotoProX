import { BrightnessAdjustmentLayer } from "@/models/project/Layers/AdjustmentLayer";
import { AdjustmentLayer } from "@/models/project/Layers/Layers";
import { AdjustmentFilter } from "pixi-filters";

export default function GetMatrix(layer: AdjustmentLayer) {
  if (layer instanceof BrightnessAdjustmentLayer) {
    const matrix = new AdjustmentFilter();
    return matrix;
  }
}
