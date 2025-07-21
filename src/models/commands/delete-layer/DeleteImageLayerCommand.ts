import { ImageData } from "@/interfaces/project/SettingsInterfaces";
import { DraftFunction } from "use-immer";
import { SpriteX } from "../../pixi-extends/SpriteX";
import {
  addLayerAtIndex,
  LayerManager,
  removeLayer,
} from "../../project/LayerManager";
import { ImageLayer } from "../../project/Layers/Layers";
import { DeleteLayerCommand } from "./DeleteLayerCommand";
export class DeleteImageLayerCommand implements DeleteLayerCommand {
  private layerData: ImageData;
  private sprite: SpriteX;
  public name: string;
  public layerId: string;
  public zIndex: number;
  public setLayerManager: (draft: DraftFunction<LayerManager>) => void;
  public title: string = "Delete Image Layer";

  constructor(
    layer: ImageLayer,
    setter: (draft: DraftFunction<LayerManager>) => void
  ) {
    this.layerData = { ...layer.imageData }; // Copy the image data
    this.layerId = layer.id; // Copy
    this.sprite = layer.sprite; // Copy the reference to the sprite
    this.zIndex = layer.zIndex; // Copy the z-index
    this.name = layer.name; // Copy the name

    this.setLayerManager = setter;
  }

  execute() {
    const parentContainer = this.sprite.parent;
    // Remove the sprite from the parent container
    parentContainer.removeChild(this.sprite);

    this.setLayerManager((draft) => {
      draft.layers = removeLayer(draft.layers, this.layerId);
      draft.target = "";
    });
  }

  undo() {
    // Perform the asynchronous operation outside the draft updater
    if (this.sprite) {
      // Create a new ImageLayer object
      const newLayer = new ImageLayer(
        1,
        this.name,
        this.layerData,
        this.sprite
      );
      this.layerId = newLayer.id;
      // Now, update the state with the result
      this.setLayerManager((draft) => {
        draft.layers = addLayerAtIndex(draft.layers, newLayer, this.zIndex);
        draft.target = newLayer.id;
      });
    }
  }

  redo(): void {
    this.execute();
  }
}
