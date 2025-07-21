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
} from "@/models/project/LayerManager";
import {
  BloomAdjustmentLayer,
  BrightnessAdjustmentLayer,
  DropShadowAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "@/models/project/Layers/AdjustmentLayer";
import {
  BackgroundLayer,
  ImageLayer,
  LayerX,
} from "@/models/project/Layers/Layers";
import { toast } from "sonner";
import { DraftFunction } from "use-immer";

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
  ) => void
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
  ) => void
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
    const command = new DeleteImageLayerCommand(targetLayer, setLayerManager);
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
