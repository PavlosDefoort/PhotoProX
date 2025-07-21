import {
  addLayerAtIndex,
  LayerManager,
  removeLayer,
} from "@/models/project/LayerManager";
import { DraftFunction } from "use-immer";
import { DeleteLayerCommand } from "./DeleteLayerCommand";
import { SaturationAdjustmentLayer } from "@/models/project/Layers/AdjustmentLayer";
import { Container } from "pixi.js";
import { ContainerX } from "@/models/pixi-extends/SpriteX";

export class DeleteSaturationLayerCommand implements DeleteLayerCommand {
  public zIndex: number;
  public layerId: string;
  public name: string;
  public setLayerManager: (draft: DraftFunction<LayerManager>) => void;
  public title: string;
  private container: ContainerX;
  private clip: boolean;
  private saturation: number;
  private hue: number;
  private width: number;
  private height: number;

  constructor(
    layer: SaturationAdjustmentLayer,
    setter: (draft: DraftFunction<LayerManager>) => void,
    width: number,
    height: number
  ) {
    this.setLayerManager = setter;
    this.zIndex = layer.zIndex;
    this.layerId = layer.id;
    this.title = "Delete Saturation Layer";
    this.container = layer.container; // Reference the container
    this.saturation = layer.saturation; // Copy the saturation value
    this.hue = layer.hue; // Copy the hue value
    this.width = width;
    this.height = height;
    this.name = layer.name;
    this.clip = layer.clipToBelow;
  }

  execute(): void {
    // Delete the saturation layer

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

  undo(): void {
    // Create a new brightness layer
    const newLayer = new SaturationAdjustmentLayer(
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
      newLayer.saturation = this.saturation;
      newLayer.hue = this.hue;
      draft.layers = addLayerAtIndex(draft.layers, newLayer, this.zIndex);
      draft.target = newLayer.id;
    });
    // Update the layerId, since we have a new layer
    this.layerId = newLayer.id;

    // Update the filter
    newLayer.updateFilter();
  }

  redo(): void {
    this.execute();
  }
}
