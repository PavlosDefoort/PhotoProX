import { Command } from "@/interfaces/UndoRedoInterfaces";
import { DeleteBloomLayerCommand } from "@/models/commands/delete-layer/DeleteBloomLayerCommand";
import { DeleteBrightnessLayerCommand } from "@/models/commands/delete-layer/DeleteBrightnessLayerCommand";
import { DeleteImageLayerCommand } from "@/models/commands/delete-layer/DeleteImageLayerCommand";
import { DeleteSaturationLayerCommand } from "@/models/commands/delete-layer/DeleteSaturationLayerCommand";
import { DeleteShadowLayerCommand } from "@/models/commands/delete-layer/DeleteShadowLayerCommand";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";
import {
  addLayer,
  LayerManager,
  moveLayer,
  removeLayer,
} from "@/models/project/LayerManager";
import {
  BloomAdjustmentLayer,
  BrightnessAdjustmentLayer,
  DropShadowAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "@/models/project/Layers/AdjustmentLayer";
import {
  AdjustmentLayer,
  BackgroundLayer,
  ImageLayer,
  LayerX,
} from "@/models/project/Layers/Layers";
import { toast } from "sonner";
import { DraftFunction } from "use-immer";
import { EditDocument } from "@/interfaces/editor/EditDocument";

// The clipboard is deliberately a snapshot, rather than a reference to the live
// layer. This makes Copy immune to later transforms or adjustment edits.
let layerClipboard: LayerX | null = null;

function copyValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function snapshotLayer(layer: LayerX): LayerX {
  if (layer instanceof ImageLayer) {
    const snapshot = Object.assign(
      Object.create(Object.getPrototypeOf(layer)),
      copyValue({ ...layer, sprite: undefined }),
    ) as ImageLayer;
    snapshot.id = layer.id;
    snapshot.sprite = layer.sprite;
    // Pixi objects are not safely JSON serializable. Capture the mutable display
    // state that affects where the pasted image appears.
    (snapshot as any).__spriteState = {
      x: layer.sprite.x, y: layer.sprite.y, width: layer.sprite.width,
      height: layer.sprite.height, angle: layer.sprite.angle,
      scaleX: layer.sprite.scale.x, scaleY: layer.sprite.scale.y,
      skewX: layer.sprite.skew.x, skewY: layer.sprite.skew.y,
      anchorX: layer.sprite.anchor.x, anchorY: layer.sprite.anchor.y,
    };
    return snapshot;
  }
  return Object.assign(
    Object.create(Object.getPrototypeOf(layer)),
    copyValue(layer),
  ) as LayerX;
}

export function copyLayer(layer: LayerX) {
  if (layer instanceof BackgroundLayer) return;
  layerClipboard = snapshotLayer(layer);
}

export function hasCopiedLayer() {
  return layerClipboard !== null;
}

export async function pasteLayer(
  layerManager: LayerManager,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void,
) {
  if (!layerClipboard) return;
  const source = layerClipboard;
  let pasted: LayerX;
  if (source instanceof ImageLayer) {
    const state = (source as any).__spriteState;
    pasted = await layerManager.duplicateImageLayer(source as ImageLayer);
    (pasted as ImageLayer).imageData = copyValue((source as ImageLayer).imageData);
    if (state) {
      const sprite = (pasted as ImageLayer).sprite;
      sprite.position.set(state.x, state.y);
      sprite.width = state.width; sprite.height = state.height;
      sprite.angle = state.angle; sprite.scale.set(state.scaleX, state.scaleY);
      sprite.skew.set(state.skewX, state.skewY);
      sprite.anchor.set(state.anchorX, state.anchorY);
    }
    pasted.name = source.name + " copy";
  } else if (source instanceof AdjustmentLayer) {
    const type = source instanceof BrightnessAdjustmentLayer ? "Brightness" :
      source instanceof SaturationAdjustmentLayer ? "Saturation" :
      source instanceof BloomAdjustmentLayer ? "Bloom" : "Shadow";
    pasted = layerManager.createAdjustmentLayer(source.clipToBelow, type,
       layerManager.layers.length + 1, layerManager.layers.length + 1, source.open);
    const adjustmentState = copyValue(source) as any;
    delete adjustmentState.container;
    delete adjustmentState.mask;
    Object.assign(pasted, adjustmentState);
  } else return;
  setLayerManager((draft) => { draft.layers = addLayer(draft.layers, pasted); draft.target = pasted.id; });
}

export function cutLayer(layer: LayerX, setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void) {
  if (layer instanceof BackgroundLayer) return;
  copyLayer(layer);
  setLayerManager((draft) => { draft.layers = removeLayer(draft.layers, layer.id); });
}

export async function handleDuplication(
  layer: LayerX,
  layerManager: LayerManager,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void
) {
  if (layer instanceof ImageLayer) {
    const newLayer = await layerManager.duplicateImageLayer(layer);
    setLayerManager((draft) => {
      draft.layers = addLayer(draft.layers, newLayer);
    });
  }
}

const handleCommand = (
  command: Command,
  setUndoRedoManager: (
    arg: UndoRedoManager | DraftFunction<UndoRedoManager>
  ) => void,
) => {
  // Add to the undoredo stack
  setUndoRedoManager((draft) => {
    // Add to the front of the undo stack
    draft.undoStack.push(command);

    // Clear the redo stack as a "new reality" has been created
    draft.redoStack = [];
  });

  command.execute();
};

export function handleDeleteLayer(
  targetLayer: LayerX,
  projectWidth: number,
  projectHeight: number,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void,
  setUndoRedoManager: (
    arg: UndoRedoManager | DraftFunction<UndoRedoManager>
  ) => void,
  setEditDocument: (arg: EditDocument | DraftFunction<EditDocument>) => void
) {
  // Handle attepmt to delete the background layer
  if (targetLayer instanceof BackgroundLayer) {
    toast("Cannot delete background", {
      duration: 10000,
      description: "You can hide it by clicking the eye icon!",

      action: {
        label: "Got it!",
        onClick: () => {
          // Undo the copy of the address
        },
      },
    });
  }

  // Handle deleting an image layer
  else if (targetLayer instanceof ImageLayer) {
    // Create a new delete layer command
    const command = new DeleteImageLayerCommand(targetLayer, setLayerManager, setEditDocument);
    handleCommand(command, setUndoRedoManager);
  }

  // Handle deleting a Brightness layer
  else if (targetLayer instanceof BrightnessAdjustmentLayer) {
    // Create a new delete layer command
    const command = new DeleteBrightnessLayerCommand(
      targetLayer,
      setLayerManager,
      projectWidth,
      projectHeight
    );
    handleCommand(command, setUndoRedoManager);
  } else if (targetLayer instanceof SaturationAdjustmentLayer) {
    // Create a new delete layer command
    const command = new DeleteSaturationLayerCommand(
      targetLayer,
      setLayerManager,
      projectWidth,
      projectHeight
    );
    handleCommand(command, setUndoRedoManager);
  } else if (targetLayer instanceof BloomAdjustmentLayer) {
    // Create a new delete layer command
    const command = new DeleteBloomLayerCommand(
      targetLayer,
      setLayerManager,
      projectWidth,
      projectHeight
    );
    handleCommand(command, setUndoRedoManager);
  } else if (targetLayer instanceof DropShadowAdjustmentLayer) {
    // Create a new delete layer command
    const command = new DeleteShadowLayerCommand(
      targetLayer,
      setLayerManager,
      projectWidth,
      projectHeight
    );
    handleCommand(command, setUndoRedoManager);
  }
}

export function handleMoveLayerForward(
  layer: LayerX,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void
) {
  setLayerManager((draft) => {
    draft.layers = moveLayer(draft.layers, layer.id, layer.zIndex + 1);
  });
}

export function handleMoveLayerBackward(
  layer: LayerX,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void
) {
  setLayerManager((draft) => {
    draft.layers = moveLayer(draft.layers, layer.id, layer.zIndex - 1);
  });
}

export function handleMoveLayerToFront(
  layer: LayerX,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void
) {
  setLayerManager((draft) => {
    draft.layers = moveLayer(draft.layers, layer.id, draft.layers.length - 1);
  });
}

export function handleMoveLayerToBack(
  layer: LayerX,
  setLayerManager: (arg: LayerManager | DraftFunction<LayerManager>) => void
) {
  setLayerManager((draft) => {
    draft.layers = moveLayer(draft.layers, layer.id, 0);
  });
}
