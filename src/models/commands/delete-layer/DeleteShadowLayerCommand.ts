import { Color, Container } from "pixi.js";
import { DraftFunction } from "use-immer";
import {
  addLayerAtIndex,
  LayerManager,
  removeLayer,
} from "../../project/LayerManager";
import {
  BloomAdjustmentLayer,
  DropShadowAdjustmentLayer,
} from "../../project/Layers/AdjustmentLayer";
import { DeleteLayerCommand } from "./DeleteLayerCommand";
import { ContainerX } from "@/models/pixi-extends/SpriteX";

export class DeleteShadowLayerCommand implements DeleteLayerCommand {
  public zIndex: number;
  public layerId: string;
  public name: string;
  private container: ContainerX;
  private width: number;
  private height: number;
  private opacity: number;
  private blur: number;
  private offsetX: number;
  private offsetY: number;
  private shadowOnly: boolean;
  private quality: number;
  private color: Color;
  private clip: boolean;

  public setLayerManager: (draft: DraftFunction<LayerManager>) => void;
  title: string = "Delete DropShadow Layer";

  constructor(
    layer: DropShadowAdjustmentLayer,
    setter: (draft: DraftFunction<LayerManager>) => void,
    width: number,
    height: number
  ) {
    this.setLayerManager = setter;
    this.width = width;
    this.height = height;
    this.zIndex = layer.zIndex;
    this.layerId = layer.id;
    this.opacity = layer.opacity;
    this.name = layer.name;
    this.blur = layer.blur;
    this.offsetX = layer.offsetX;
    this.offsetY = layer.offsetY;
    this.shadowOnly = layer.shadowOnly;
    this.quality = layer.quality;
    this.color = layer.color;
    this.clip = layer.clipToBelow;
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
    const newLayer = new DropShadowAdjustmentLayer(
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
      newLayer.opacity = this.opacity;
      newLayer.blur = this.blur;
      newLayer.offsetX = this.offsetX;
      newLayer.offsetY = this.offsetY;
      newLayer.shadowOnly = this.shadowOnly;
      newLayer.quality = this.quality;
      newLayer.color = this.color;

      draft.layers = addLayerAtIndex(draft.layers, newLayer, this.zIndex);
      draft.target = newLayer.id;
    });
    // Update the layerId, since we have a new layer
    this.layerId = newLayer.id;

    // Update the filter
    newLayer.updateFilter();
  }
}
