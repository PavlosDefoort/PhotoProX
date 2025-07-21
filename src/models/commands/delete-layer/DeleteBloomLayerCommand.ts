import { Container } from "pixi.js";
import { DraftFunction } from "use-immer";
import {
  addLayerAtIndex,
  LayerManager,
  removeLayer,
} from "../../project/LayerManager";
import { BloomAdjustmentLayer } from "../../project/Layers/AdjustmentLayer";
import { DeleteLayerCommand } from "./DeleteLayerCommand";
import { ContainerX } from "@/models/pixi-extends/SpriteX";

export class DeleteBloomLayerCommand implements DeleteLayerCommand {
  public zIndex: number;
  public layerId: string;
  public name: string;
  private container: ContainerX;
  private clip: boolean;
  private width: number;
  private height: number;
  private blur: number;
  private threshold: number;
  private quality: number;
  private brightness: number;
  private bloomScale: number;
  public setLayerManager: (draft: DraftFunction<LayerManager>) => void;
  title: string = "Delete Bloom Layer";

  constructor(
    layer: BloomAdjustmentLayer,
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
    this.clip = layer.clipToBelow;
    this.brightness = layer.brightness;
    this.blur = layer.blur;
    this.threshold = layer.threshold;
    this.quality = layer.quality;
    this.bloomScale = layer.bloomScale;

    this.container = layer.container;
  }

  execute(): void {
    // Delete the bloom layer

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
    const newLayer = new BloomAdjustmentLayer(
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
      newLayer.blur = this.blur;
      newLayer.threshold = this.threshold;
      newLayer.quality = this.quality;
      newLayer.bloomScale = this.bloomScale;
      draft.layers = addLayerAtIndex(draft.layers, newLayer, this.zIndex);
      draft.target = newLayer.id;
    });
    // Update the layerId, since we have a new layer
    this.layerId = newLayer.id;

    // Update the filter
    newLayer.updateFilter();
  }
}
