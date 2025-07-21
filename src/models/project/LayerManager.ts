import { LayerXInterface } from "@/interfaces/project/LayerInterfaces";
import { ImageData } from "@/interfaces/project/SettingsInterfaces";
import { base64StringToTexture } from "@/utils/ImageUtils";
import { immerable } from "immer";
import { SpriteX } from "../pixi-extends/SpriteX";
import {
  BloomAdjustmentLayer,
  BrightnessAdjustmentLayer,
  DropShadowAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "./Layers/AdjustmentLayer";
import { AdjustmentLayer, BackgroundLayer, ImageLayer } from "./Layers/Layers";
import { BlurFilter, Graphics, MaskFilter } from "pixi.js";

/**
 * @description Adds a layer to the project
 * @param layers The currenet layers in the project
 * @param newLayer The new layer to be added
 * @returns the updated layers
 */
export function addLayer(layers: LayerXInterface[], newLayer: LayerXInterface) {
  const existingLayer = layers.find(
    (existingLayer) => existingLayer.id === newLayer.id
  );
  if (!existingLayer) {
    layers.push(newLayer);
    layers = checkZIndex(layers);
    // Check the z-index of the layers
  }
  return layers;
}

export function findLayer(layers: LayerXInterface[], id: string) {
  return layers.find((layer) => layer.id === id);
}

export function addLayerAtIndex(
  layers: LayerXInterface[],
  newLayer: LayerXInterface,
  index: number
) {
  const existingLayer = layers.find(
    (existingLayer) => existingLayer.id === newLayer.id
  );
  if (!existingLayer) {
    layers.splice(index, 0, newLayer);
    layers = checkZIndex(layers);
  }
  return layers;
}

export function checkZIndex(layers: LayerXInterface[]) {
  layers.forEach((layer, index) => {
    layer.zIndex = index;
  });
  return layers;
}

export async function createImageLayer(
  containerWidth: number,
  containerHeight: number,
  imageData: ImageData
) {
  // Create the texture
  const texture = await base64StringToTexture(imageData.src);

  // Create the sprite
  const sprite = SpriteX.from(texture, false);

  // Center the sprite
  sprite.center(containerWidth, containerHeight);
  sprite.cursor = "pointer";
  sprite.eventMode = "static";

  // Modify the name to remove the file extension
  const name = imageData.name.split(".")[0];

  // Create the image layer
  const imageLayer = new ImageLayer(1, name, imageData, sprite);
  // Add the layer to the project
  return imageLayer;
}

export function sortLayers(layers: LayerXInterface[]) {
  // Criteria for sorting:
  // 1. Background layer first
  // 2. Clipping layers must be next to the nearest image layer

  // Create layer array with highest to lowest z-index

  layers.sort((a, b) => b.zIndex - a.zIndex);

  for (let i = 0; i < layers.length; i++) {
    let currentLayer = layers[i];
    let temp = i;

    if (currentLayer instanceof AdjustmentLayer) {
      if ((currentLayer as AdjustmentLayer).clipToBelow) {
        let nextLayer = layers[i + 1];
        while (nextLayer instanceof AdjustmentLayer) {
          // Before we swap, change the z-indecies

          let tempZ = currentLayer.zIndex;
          currentLayer.zIndex = nextLayer.zIndex;
          nextLayer.zIndex = tempZ;
          layers[temp] = nextLayer;
          layers[temp + 1] = currentLayer;
          // Check the next next layer
          if (temp + 2 < layers.length) {
            nextLayer = layers[temp + 2];
            temp = temp + 1;
          }
        }
      }
    }
  }

  // Sort the layers back to lowest to highest z-index
  layers.sort((a, b) => a.zIndex - b.zIndex);

  // Check the z-index of the layers
  layers = checkZIndex(layers);

  return layers;
}

export function moveLayer(
  layers: LayerXInterface[],
  id: string,
  newIndex: number
) {
  const layer = layers.find((layer) => layer.id === id);
  if (layer) {
    layers = layers.filter((layer) => layer.id !== id);
    layers.splice(newIndex, 0, layer);
    layers = checkZIndex(layers);
  }
  return layers;
}

export function getBackgroundLayer(layers: LayerXInterface[]) {
  return layers.find((layer) => layer instanceof BackgroundLayer) as
    | BackgroundLayer
    | undefined;
}

export function removeLayer(layers: LayerXInterface[], id: string) {
  layers = layers.filter((layer) => layer.id !== id);
  layers = checkZIndex(layers);
  return layers;
}

export function addBackgroundLayer(
  layers: LayerXInterface[],
  newLayer: LayerXInterface
) {
  // Check if a background layer already exists
  if (getBackgroundLayer(layers) === undefined) {
    // We need to push this layer to the first index
    layers.unshift(newLayer);
    return layers;
  } else {
    layers = layers.filter((layer) => layer instanceof BackgroundLayer);
    layers.unshift(newLayer);
    return layers;
  }
}

export class LayerManager {
  public layers: LayerXInterface[];
  public target: string;
  static [immerable] = true;
  constructor() {
    this.layers = [];
    this.target = "";
  }

  /**
   * @description Removes a layer from the project
   * @param id The id of the layer to be removed
   * @returns void
   */
  removeLayer = (id: string) => {
    this.layers = this.layers.filter((layer) => layer.id !== id);
  };

  /**
   * @description Renames a layer
   * @param id The id of the layer to be renamed
   * @param name The new name of the layer
   */
  renameLayer = (id: string, name: string) => {
    const layer = this.layers.find((layer) => layer.id === id) as ImageLayer;
    if (layer) {
      layer.imageData.name = name;
    }
    this.checkZIndex();
  };

  /**
   * @description Moves a layer to the front of the project
   * @param id The id of the layer to be moved to the front
   * @returns
   */
  moveLayerFront = (id: string) => {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index === this.layers.length - 1) return; // If already at front, do nothing
    const targetLayer = this.layers.splice(index, 1)[0]; // Remove target layer from array
    this.layers.push(targetLayer); // Add target layer to the end of the array
  };

  /**
   * @description Moves a layer to the back of the project
   * @param id The id of the layer to be moved to the back
   * @returns
   */
  moveLayerBack = (id: string) => {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index === 0) return; // If already at back, do nothing
    const targetLayer = this.layers.splice(index, 1)[0]; // Remove target layer from array
    this.layers.unshift(targetLayer); // Add target layer to the beginning of the array
  };

  /**
   * @description Moves a layer up one index
   * @param id The id of the layer to be moved up
   * @returns
   */
  moveLayerUp = (id: string) => {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index === this.layers.length - 1) return;
    this.swapLayers(id, this.layers[index + 1].id);
  };

  /**
   * @description Moves a layer down one index
   * @param id The id of the layer to be moved down
   * @returns
   */
  moveLayerDown = (id: string) => {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index === 0) return;
    index;
    this.swapLayers(id, this.layers[index - 1].id);
  };

  sortByZIndex = () => {
    // Lowest zIndex first
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  };

  checkZIndex = () => {
    const updatedLayers = this.layers.map((layer, index) => ({
      ...layer,
      zIndex: index,
    }));
    this.layers = updatedLayers;
  };

  hideLayer = (id: string) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      layer.visible = false;
    }
  };

  showLayer = (id: string) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      layer.visible = true;
    }
  };

  swapLayers = (id1: string, id2: string) => {
    ("Swapping layers");
    const index1 = this.layers.findIndex((layer) => layer.id === id1);
    const index2 = this.layers.findIndex((layer) => layer.id === id2);

    // Check if indices are valid
    if (index1 === -1 || index2 === -1) {
      console.error("Invalid layer IDs provided.");
      return;
    }

    const temp = this.layers[index1];
    this.layers[index1] = this.layers[index2];
    ("Swapping layerss");
    this.layers[index2] = temp;
  };

  clearLayers = () => {
    this.layers = [];
  };

  moveLayer = (id: string, newIndex: number) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      this.layers = this.layers.filter((layer) => layer.id !== id);
      this.layers.splice(newIndex, 0, layer);
    }
  };

  findLayer = (id: string) => {
    return this.layers.find((layer) => layer.id === id);
  };

  getLayers = () => {
    return this.layers.slice();
  };

  getBackgroundLayer = () => {
    return this.layers.find((layer) => layer instanceof BackgroundLayer) as
      | BackgroundLayer
      | undefined;
  };

  createBackgroundLayer = (
    transparent: boolean,
    color: string,
    width: number,
    height: number,
    opacity: number
  ) => {
    const layer = new BackgroundLayer(
      transparent,
      color,
      width,
      height,
      this.layers.length,
      opacity
    );

    return layer;
  };

  createAdjustmentLayer = (
    clip: boolean,
    type: "Brightness" | "Saturation" | "Bloom" | "Shadow",
    width: number,
    height: number,
    open: boolean = true
  ): AdjustmentLayer => {
    let layer; // Declare the 'layer' variable

    switch (type) {
      case "Brightness":
        layer = new BrightnessAdjustmentLayer(
          clip,
          this.layers.length,
          "Brightness/contrast",
          width,
          height,
          open
        );
        break;
      case "Saturation":
        layer = new SaturationAdjustmentLayer(
          clip,
          this.layers.length,
          "Saturation/hue",
          width,
          height,
          open
        );
        break;
      case "Bloom":
        layer = new BloomAdjustmentLayer(
          clip,
          this.layers.length,
          "Bloom",
          width,
          height,
          open
        );
        break;
      case "Shadow":
        layer = new DropShadowAdjustmentLayer(
          clip,
          this.layers.length,
          "Shadow",
          width,
          height,
          open
        );
        break;
    }
    return layer;
  };

  duplicateImageLayer = async (layer: ImageLayer) => {
    // Duplicate the pixi js sprite object
    const sprite = SpriteX.from(layer.sprite.texture, false);
    sprite.position.set(layer.sprite.x + 10, layer.sprite.y + 10);
    sprite.anchor.set(0.5);
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    const imageLayer = new ImageLayer(
      this.layers.length,
      layer.name + " copy",
      layer.imageData,
      sprite
    );
    return imageLayer;
  };

  createImageLayer = async (
    containerWidth: number,
    containerHeight: number,
    imageData: ImageData
  ) => {
    // Create the texture
    const texture = await base64StringToTexture(imageData.src);

    // Create the sprite
    const sprite = SpriteX.from(texture, false);

    // Center the sprite
    sprite.center(containerWidth, containerHeight);
    sprite.cursor = "pointer";
    sprite.eventMode = "static";

    // Modify the name to remove the file extension
    const name = imageData.name.split(".")[0];

    // Create the image layer
    const imageLayer = new ImageLayer(
      this.layers.length,
      name,
      imageData,
      sprite
    );
    // Add the layer to the project
    return imageLayer;
  };
}
