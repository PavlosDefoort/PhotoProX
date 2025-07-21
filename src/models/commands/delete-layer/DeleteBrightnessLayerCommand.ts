import { Container } from "pixi.js";
import { DraftFunction } from "use-immer";
import {
  addLayerAtIndex,
  LayerManager,
  removeLayer,
} from "../../project/LayerManager";
import { BrightnessAdjustmentLayer } from "../../project/Layers/AdjustmentLayer";
import { DeleteLayerCommand } from "./DeleteLayerCommand";
import { ContainerX } from "@/models/pixi-extends/SpriteX";

export class DeleteBrightnessLayerCommand implements DeleteLayerCommand {
  public zIndex: number;
  public layerId: string;
  public name: string;
  private container: ContainerX;
  private clip: boolean;
  private width: number;
  private height: number;
  private brightness: number;
  private contrast: number;
  public setLayerManager: (draft: DraftFunction<LayerManager>) => void;
  title: string = "Delete Brightness Layer";

  constructor(
    layer: BrightnessAdjustmentLayer,
    setter: (draft: DraftFunction<LayerManager>) => void,
    width: number,
    height: number
  ) {
    this.setLayerManager = setter;
    this.width = width;
    this.height = height;
    this.zIndex = layer.zIndex;
    this.layerId = layer.id;
    this.name = layer.name;
    this.brightness = layer.brightness;
    this.contrast = layer.contrast;
    this.container = layer.container;
    this.clip = layer.clipToBelow;
  }

  execute(): void {
    // Delete the brightness layer

    // 1. Remove the children from the container
    this.container.removeChildren();

    // 2. Remove the container from the parent
    this.container.parent.removeChild(this.container);

    // 3. Update the state
    this.setLayerManager((draft) => {
      draft.layers = removeLayer(draft.layers, this.layerId);
      draft.target = "";
    });
  }

  redo(): void {
    this.execute();
  }

  undo(): void {
    // Create a new brightness layer
    const newLayer = new BrightnessAdjustmentLayer(
      this.clip,
      this.zIndex,
      this.name,
      this.width,
      this.height,
      false,
      this.container
    );

    // Update the state
    this.setLayerManager((draft) => {
      newLayer.brightness = this.brightness;
      newLayer.contrast = this.contrast;

      draft.layers = addLayerAtIndex(draft.layers, newLayer, this.zIndex);
      draft.target = newLayer.id;
    });

    // Update the layerId, since we have a new layer
    this.layerId = newLayer.id;

    // Update the filter
    newLayer.updateFilter();
  }
}
