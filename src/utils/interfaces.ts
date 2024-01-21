// A file to store all the interfaces used in the project
import { Edit } from "lucide-react";
import {
  TYPES,
  SCALE_MODES,
  Sprite,
  FORMATS,
  TARGETS,
  MIPMAP_MODES,
  Container,
  DisplayObject,
} from "pixi.js";
import { v4 as uuidv4 } from "uuid";

export interface ImageData {
  src: string;
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

export interface ImageLayer {
  id: string;
  imageData: ImageData;
  zIndex: number;
  editingParameters: EditingParameters;
  sprite: Sprite;
  visible: boolean;
}

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
  width: number | null;
  height: number | null;
  antialias: boolean;
}

export interface EditorProject {
  historyStack: ProjectSnapshot[];
  layers: ImageLayer[];
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
};

export const initialSettings: ProjectSettings = {
  name: "New Project",
  dateCreated: Date.now(),
  dateModified: Date.now(),
  size: 0,
  colorMode: TYPES.UNSIGNED_BYTE,
  scaleMode: SCALE_MODES.LINEAR,
  canvasSettings: {
    width: null,
    height: null,
    antialias: false,
  },
};

class LayerManager {
  private layers: ImageLayer[] = [];

  /**
   * @description Adds a layer to the project
   * @param layer The layer to be added
   * @returns void
   */
  addLayer = (layer: ImageLayer) => {
    this.layers.push(layer);
    this.checkZIndex();
  };

  /**
   * @description Removes a layer from the project
   * @param id The id of the layer to be removed
   * @returns void
   */
  removeLayer = (id: string) => {
    this.layers = this.layers.filter((layer) => layer.id !== id);
    this.checkZIndex();
  };

  /**
   * @description Renames a layer
   * @param id The id of the layer to be renamed
   * @param name The new name of the layer
   */
  renameLayer = (id: string, name: string) => {
    const layer = this.layers.find((layer) => layer.id === id);
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
    if (index === this.layers.length - 1) return;
    this.swapLayers(id, this.layers[this.layers.length - 1].id);
  };

  /**
   * @description Moves a layer to the back of the project
   * @param id The id of the layer to be moved to the back
   * @returns
   */
  moveLayerBack = (id: string) => {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index === 0) return;
    this.swapLayers(id, this.layers[0].id);
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
    this.swapLayers(id, this.layers[index - 1].id);
  };

  sortZIndex = () => {
    // Sort the layers by their z-index, first element has the lowest z-index
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  };

  checkZIndex = () => {
    // Check if the z-index of the layers is correct
    // The layers are correct when the z-index of the first layer is 0 and the z-index of the last layer is the number of layers - 1
    // The layers must increase linearly by 1

    const sortedLayers = [...this.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (let i = 0; i < sortedLayers.length; i++) {
      if (sortedLayers[i].zIndex !== i) {
        // Adjust the z-index of the layers if they are not in the correct order
        const updatedLayer = { ...sortedLayers[i], zIndex: i };
        this.layers = this.layers.map((layer) =>
          layer.id === updatedLayer.id ? updatedLayer : layer
        );
      }
    }
    // Sort the layers by their z-index, first element has the lowest z-index
    this.sortZIndex();
  };

  swapLayers = (id1: string, id2: string) => {
    const index1 = this.layers.findIndex((layer) => layer.id === id1);
    const index2 = this.layers.findIndex((layer) => layer.id === id2);
    const temp = this.layers[index1];
    this.layers[index1] = this.layers[index2];
    this.layers[index2] = temp;
    // Update z-index
    this.layers[index1].zIndex = index1;
    this.layers[index2].zIndex = index2;
    this.checkZIndex();
  };

  clearLayers = () => {
    this.layers = [];
  };

  copyLayer = (id: string) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      this.addLayer({
        ...layer,
        id: uuidv4(),
      });
    }
    this.checkZIndex();
  };

  createLayer = (width: number, height: number, imageData: ImageData) => {
    const newSprite = Sprite.from(imageData.src, {
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

    return newLayer;
  };

  getLayers = () => {
    return this.layers.slice();
  };
}

export class Project {
  private layerManager: LayerManager = new LayerManager();
  layers: ImageLayer[] = [];
  historyStack: ProjectSnapshot[] = [];
  currentSnapshot: ProjectSnapshot | null = null;
  settings: ProjectSettings = initialSettings;
  id: string = uuidv4();
  target: ImageLayer | null = null;
  container: Container | null = null;

  renameProject = (
    name: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.settings.name = name;
    console.log(this.settings.name);
    setState({ ...this });
  };

  addLayer = (
    layer: ImageLayer,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.layerManager.addLayer(layer);
    this.layers = this.layerManager.getLayers();
    setState({ ...this }); // Or setState(this) depending on your usage
  };

  removeLayer = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>,
    container: Container | null
  ) => {
    this.layerManager.removeLayer(id);
    this.layers = this.layerManager.getLayers();
    setState({ ...this });
    container?.removeChild(container.getChildByName(id)!);
  };

  hideLayer = (
    id: string,
    container: Container | null,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      layer.visible = false;
      if (container) {
        const child = container.getChildByName(id);
        if (child) {
          child.visible = false;
        }
      }
      setState({ ...this });
    }
  };

  showLayer = (
    id: string,
    container: Container | null,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      layer.visible = true;
      if (container) {
        const child = container.getChildByName(id);
        if (child) {
          child.visible = true;
        }
      }
      setState({ ...this });
    }
  };

  createLayer = (imageData: ImageData) => {
    const newLayer = this.layerManager.createLayer(
      this.settings.canvasSettings.width!,
      this.settings.canvasSettings.height!,
      imageData
    );
    return newLayer;
  };

  renameLayer = (
    id: string,
    name: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.layerManager.renameLayer(id, name);
    this.layers = this.layerManager.getLayers();
    setState({ ...this });
  };

  moveLayerFront = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.layerManager.moveLayerFront(id);
    this.layers = this.layerManager.getLayers();
    setState({ ...this });
  };

  moveLayerBack = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.layerManager.moveLayerBack(id);
    this.layers = this.layerManager.getLayers();
    setState({ ...this });
  };

  resetLayer = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      layer.editingParameters = initialEditingParameters;
    }

    setState({ ...this });
  };

  moveLayerUp = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.layerManager.moveLayerUp(id);
    this.layers = this.layerManager.getLayers();
    setState({ ...this });
  };

  moveLayerDown = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.layerManager.moveLayerDown(id);
    this.layers = this.layerManager.getLayers();
    setState({ ...this });
  };

  changeVisibility = (
    id: string,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    const layer = this.layers.find((layer) => layer.id === id);
    if (layer) {
      layer.visible = !layer.visible;
    }
    setState({ ...this });
  };

  changeCanvasDimensions = (
    width: number,
    height: number,
    setState: React.Dispatch<React.SetStateAction<Project>>
  ) => {
    this.settings.canvasSettings.width = width;
    this.settings.canvasSettings.height = height;
    setState({ ...this });
  };
}
