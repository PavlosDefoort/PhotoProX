// A file to store all the interfaces used in the project
import {
  StorageReference,
  UploadMetadata,
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from "firebase/storage";
import { Edit } from "lucide-react";
import { produce, immerable, Draft } from "immer";
import {
  TYPES,
  SCALE_MODES,
  Sprite,
  FORMATS,
  TARGETS,
  MIPMAP_MODES,
  Container,
  DisplayObject,
  SpriteSource,
  IBaseTextureOptions,
  Graphics,
  Point,
  FederatedPointerEvent,
  ColorMatrixFilter,
} from "pixi.js";
import { v4 as uuidv4 } from "uuid";
import {
  storage,
  uploadFileFromGallery,
  uploadLayer,
} from "../../app/firebase";
import { Timestamp } from "firebase/firestore";
import { useRef } from "react";
import { useProjectContext } from "@/pages/editor";
import { AdjustmentFilter, AdvancedBloomFilter } from "pixi-filters";
import { Functions } from "./filters";

export class SpriteX extends Sprite {
  getVertexData(): Float32Array | undefined {
    // Access the protected vertexData property
    return this.vertexData;
  }
  static from(
    source: SpriteSource,
    options?: IBaseTextureOptions<any> | undefined
  ): SpriteX {
    // Call the original PIXI.Sprite.from method to create a sprite
    const sprite = super.from(source, options);

    // Convert the sprite to a CustomSprite instance
    const customSprite = new SpriteX(sprite.texture);

    // Add any custom logic here if needed
    return customSprite;
  }
}

export interface ImageData {
  src?: string;
  imageWidth: number;
  imageHeight: number;
  name: string;
}

export interface EditingParameters {
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  positionX: number;
  positionY: number;
  // More properties to come
}

export interface EditHistoryEntry {
  timestamp: number;
  editingParameters: EditingParameters;
  layerId: string;
}

export interface ProjectSnapshot {
  layers: LayerSnapshot[];
  timestamp: number;
}

export type LayerType = "image" | "adjustment" | "group";

export interface LayerX {
  id: string;
  visible: boolean;
  type: LayerType;
  zIndex: number;
  children?: LayerX[];
}

type AdjustmentValues = {
  brightness: number;
  contrast: number;
  saturation: number;
};

const defaultAdjustmentValues: AdjustmentValues = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
};

type SampleData = {
  bins: number[];
  frequencies: number[];
};

export type AnalysisData = {
  luminance: Uint8Array;
  red: Uint8Array;
  green: Uint8Array;
  blue: Uint8Array;
  alpha: Uint8Array;
};

export type HistogramArray = {
  red: SampleData;
  green: SampleData;
  blue: SampleData;
  luminance: SampleData;
  alpha: SampleData;
};

export const defaultHistogram: HistogramArray = {
  red: {
    bins: [],
    frequencies: [],
  },
  green: {
    bins: [],
    frequencies: [],
  },
  blue: {
    bins: [],
    frequencies: [],
  },
  luminance: {
    bins: [],
    frequencies: [],
  },
  alpha: {
    bins: [],
    frequencies: [],
  },
};

export interface AdjustmentLayer extends LayerX {
  clipToBelow: boolean;
  mask: Graphics;
  adjustmentType:
    | "brightness"
    | "hue"
    | "bloom"
    | "waves"
    | "levels"
    | "functions";
  opacity: number;
  values: AdjustmentValues;
  container: Container;
  mathData?: {
    redMathData: string;
    greenMathData: string;
    blueMathData: string;
  };
}

export interface ImageLayer extends LayerX {
  imageData: ImageData;
  editingParameters: EditingParameters;
  sprite: SpriteX;
}

// // Sample data
// const layer1: ImageLayer = {
//   id: "1",
//   visible: true,
//   type: "image",
//   zIndex: 0,
//   imageData: { imageHeight: 0, imageWidth: 0, name: "", src: "" },
//   editingParameters: {
//     brightness: 0,
//     contrast: 0,
//     opacity: 1,
//     positionX: 0,
//     positionY: 0,
//     rotation: 0,
//     saturation: 0,
//     scaleX: 1,
//     scaleY: 1,
//   },
//   sprite: new SpriteX(),
// };

// const layer2: ImageLayer = {
//   id: "2",
//   visible: true,
//   type: "image",
//   zIndex: 1,
//   imageData: { imageHeight: 0, imageWidth: 0, name: "", src: "" },
//   editingParameters: {
//     brightness: 0,
//     contrast: 0,
//     opacity: 1,
//     positionX: 0,
//     positionY: 0,
//     rotation: 0,
//     saturation: 0,
//     scaleX: 1,
//     scaleY: 1,
//   },
//   sprite: new SpriteX(),
// };

// const adjustmentLayer: AdjustmentLayer = {
//   id: "3",
//   visible: true,
//   type: "adjustment",
//   zIndex: 2,
//   layers: [], // Initially empty
//   clipToBelow: true,
//   mask: new Graphics(),
// };

// const layer3: ImageLayer = {
//   id: "4",
//   visible: true,
//   type: "image",
//   zIndex: 3,
//   imageData: { imageHeight: 0, imageWidth: 0, name: "", src: "" },
//   editingParameters: {
//     brightness: 0,
//     contrast: 0,
//     opacity: 1,
//     positionX: 0,
//     positionY: 0,
//     rotation: 0,
//     saturation: 0,
//     scaleX: 1,
//     scaleY: 1,
//   },
//   sprite: new SpriteX(),
// };

// const adjustmentLayer2: AdjustmentLayer = {
//   id: "5",
//   visible: true,
//   type: "adjustment",
//   zIndex: 4,
//   layers: [], // Initially empty
//   clipToBelow: true,
//   mask: new Graphics(),
// };

// const layers: LayerX[] = [
//   layer1,
//   layer2,
//   adjustmentLayer,
//   layer3,
//   adjustmentLayer2,
// ];

export interface LayerSnapshot {
  id: string;
  editingParameters: EditingParameters;
  zIndex: number;
}

export interface ProjectSettings {
  name: string;
  dateCreated: number;
  dateModified: number;
  size: number;
  colorMode: TYPES;
  scaleMode: SCALE_MODES;
  canvasSettings: CanvasSettings;
}

// interface LayerSettings {
//   format: TYPES;
//   scaleMode: SCALE_MODES;
// }

export interface CanvasSettings {
  width: number;
  height: number;
  antialias: boolean;
}

export interface EditorProject {
  historyStack: ProjectSnapshot[];
  layers: LayerX[];
  currentSnapshot: ProjectSnapshot | null;
  settings: ProjectSettings;
  id: string;

  addLayer: (layer: ImageLayer) => void;
  removeLayer: (id: string) => void;
}

export function getCurrentSnapshot(project: EditorProject) {
  return project.currentSnapshot;
}

export const initialEditingParameters: EditingParameters = {
  brightness: 0,
  opacity: 1,
  contrast: 0,
  saturation: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  positionX: 0,
  positionY: 0,
};

export const initialSettings: ProjectSettings = {
  name: "New Project",
  dateCreated: Date.now(),
  dateModified: Date.now(),
  size: 0,
  colorMode: TYPES.UNSIGNED_BYTE,
  scaleMode: SCALE_MODES.LINEAR,
  canvasSettings: {
    width: 1,
    height: 1,
    antialias: false,
  },
};

export function removeAdjustmentLayerKeepChildren(
  mainContainer: Container,
  adjustmentLayerToRemove: Container
): void {
  // Assuming adjustmentLayerToRemove is the adjustment layer container you want to remove
  if (mainContainer.removeChild(adjustmentLayerToRemove)) {
    // Successfully removed the adjustment layer container
    // Now add its children to the main container
    adjustmentLayerToRemove.children.forEach((child) => {
      mainContainer.addChild(child);
    });
  }
}

export function removeSpriteFromContainer(
  container: Container,
  spriteToRemove: SpriteX
) {
  // Iterate over all children of the container
  for (let i = container.children.length - 1; i >= 0; i--) {
    const child = container.children[i];
    container.children;
    // If the child is a container, recursively search its children

    if (
      child instanceof Container &&
      (!child.isSprite || (child.isSprite && child !== spriteToRemove))
    ) {
      ("Container found");
      removeSpriteFromContainer(child, spriteToRemove);
    }

    // If the child is the sprite to remove, remove it
    else if (child === spriteToRemove) {
      child;
      container.removeChild(child);
      // Exit the loop once the sprite is removed
      return;
    }
  }
}

const createAdjustmentContainer = (adjustmentType: string): Container => {
  const container = new Container();
  container.visible = true;

  // // Create mask
  // const mask = new Graphics();
  // mask.beginFill(0xffffff);
  // // Add mask shape, e.g., rectangle or custom shape
  // mask.drawRect(0, 0, 100, 100); // Example rectangle mask
  // mask.endFill();

  // // Apply mask to adjustment container
  // container.mask = mask;

  // Add adjustment effects, filters, etc.

  if (adjustmentType === "brightness") {
    const matrix = new AdjustmentFilter({
      brightness: 1,
      contrast: 1,
    });
    container.filters = [matrix];
  } else if (adjustmentType === "hue") {
    const matrix = new AdjustmentFilter({
      saturation: 1,
    });

    const hueMatrix = new ColorMatrixFilter();
    hueMatrix.matrix;
    hueMatrix.negative(true);
    hueMatrix.matrix;

    container.filters = [matrix, hueMatrix];
  } else if (adjustmentType === "bloom") {
    const matrix = new AdvancedBloomFilter();

    container.filters = [matrix];
  } else if (adjustmentType === "waves") {
    // const matrix = new Functions("x");
    // container.filters = [matrix];
    // (container.filters[0].program.fragmentSrc);
  } else if (adjustmentType === "functions") {
    const matrix = new Functions("r", "g", "b");
    container.filters = [matrix];
  }

  // Store the container in the layer object

  return container;
};

class LayerManager {
  layers: LayerX[];
  constructor() {
    this.layers = [];
  }

  /**
   * @description Adds a layer to the project
   * @param layer The layer to be added
   * @returns void
   */
  addLayer = (layer: LayerX) => {
    // Check if the layer already exists
    if (this.layers.find((existingLayer) => existingLayer.id === layer.id)) {
      return;
    } else {
      this.layers.push(layer);
    }
  };

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
    updatedLayers;
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

  // copyLayer = (id: string) => {
  //   const layer = this.layers.find((layer) => layer.id === id);
  //   if (layer) {
  //     this.addLayer({
  //       ...layer,
  //       id: uuidv4(),
  //     });
  //   }
  //   this.checkZIndex();
  // };

  moveLayer = (id: string, newIndex: number) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      this.layers = this.layers.filter((layer) => layer.id !== id);
      this.layers.splice(newIndex, 0, layer);
      this.layers;
    }
  };

  findLayer = (id: string) => {
    return this.layers.find((layer) => layer.id === id);
  };

  createAdjustmentLayer = (
    type: "brightness" | "bloom" | "hue" | "waves" | "levels" | "functions",
    clip: boolean
  ): AdjustmentLayer => {
    const container = createAdjustmentContainer(type);
    if (type !== "functions") {
      return {
        adjustmentType: type as
          | "brightness"
          | "hue"
          | "bloom"
          | "waves"
          | "levels"
          | "functions",
        clipToBelow: clip as boolean,
        id: uuidv4(),
        mask: new Graphics(),
        type: "adjustment",
        visible: true,
        zIndex: this.layers.length,
        opacity: 1,
        values: defaultAdjustmentValues,
        container: container,
      };
    } else {
      return {
        adjustmentType: type as
          | "brightness"
          | "hue"
          | "bloom"
          | "waves"
          | "levels"
          | "functions",
        clipToBelow: clip as boolean,
        id: uuidv4(),
        mask: new Graphics(),
        type: "adjustment",
        visible: true,
        zIndex: this.layers.length,
        opacity: 1,
        values: defaultAdjustmentValues,
        container: container,
        mathData: {
          redMathData: "r",
          greenMathData: "g",
          blueMathData: "b",
        },
      };
    }
  };

  createLayer = (
    width: number,
    height: number,
    imageData: ImageData,
    file: File,
    projectId: string,
    userId: string,
    alreadyUploaded: boolean = false
  ) => {
    // Convert the file to an image source
    // const convertImageToSrc = (file: File): Promise<string> => {
    //   return new Promise((resolve, reject) => {
    //     if (!file) {
    //       reject("No file provided");
    //       return;
    //     }

    //     const reader = new FileReader();

    //     reader.onload = () => {
    //       resolve(reader.result as string);
    //     };

    //     reader.onerror = (error) => {
    //       reject(error);
    //     };

    //     // Read the file as a data URL
    //     reader.readAsDataURL(file);
    //   });
    // };
    // const src = await convertImageToSrc(file);

    const newSprite = SpriteX.from(imageData.src!, {
      resolution: 1,
      type: TYPES.UNSIGNED_BYTE,
      format: FORMATS.RGBA,
      target: TARGETS.TEXTURE_2D,
      scaleMode: SCALE_MODES.LINEAR,
      mipmap: MIPMAP_MODES.ON,
      anisotropicLevel: 16,
    });
    newSprite.width = imageData.imageWidth;
    newSprite.height = imageData.imageHeight;
    newSprite.anchor.set(0.5);
    newSprite.position.set(width / 2, height / 2);
    newSprite.roundPixels = true;
    const newId = uuidv4();
    newSprite.name = newId;
    const newLayer = {
      id: newId,
      imageData: imageData,
      zIndex: this.layers.length,
      editingParameters: initialEditingParameters,
      sprite: newSprite,
      visible: true,
    };
    newSprite.getVertexData;

    return newLayer;
  };

  getLayers = () => {
    return this.layers.slice();
  };
}

export class Project {
  layerManager: LayerManager;
  historyStack: ProjectSnapshot[];
  currentSnapshot: ProjectSnapshot | null;
  settings: ProjectSettings;
  id: string;
  target: LayerX | null;

  constructor() {
    this.layerManager = new LayerManager();
    this.settings = initialSettings;
    this.id = uuidv4();
    this.historyStack = [];
    this.currentSnapshot = null;
    this.target = null;
  }

  static [immerable] = true;

  getCurrentSpriteProperties() {
    if (this.target) {
      const imageLayer = this.target as ImageLayer; // Type assertion
      return {
        rotation: imageLayer.sprite.rotation,
        x: imageLayer.sprite.position.x,
        y: imageLayer.sprite.position.y,
        width: imageLayer.sprite.width,
        height: imageLayer.sprite.height,
      };
    }
    return null;
  }
}
