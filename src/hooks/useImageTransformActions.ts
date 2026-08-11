import {
  AdjustmentEditState,
  ImageAdjustmentAction,
  ImageTransformAction,
  ImageTransformState,
  SerializableEditorAction,
} from "@/interfaces/editor/EditDocument";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { EditorStateCommand } from "@/models/commands/editor/EditorStateCommand";
import {
  projectAdjustmentStateToRuntime,
  readAdjustmentEditState,
} from "@/models/editor/AdjustmentDocument";
import { getAdjustmentsForImage } from "@/models/editor/AdjustmentTargets";
import {
  applyImageAdjustmentAction,
  applyImageTransformActions,
} from "@/models/editor/EditDocument";
import { findLayer } from "@/models/project/LayerManager";
import {
  BrightnessAdjustmentLayer,
  SaturationAdjustmentLayer,
} from "@/models/project/Layers/AdjustmentLayer";
import {
  AdjustmentLayer,
  ImageLayer,
  LayerX,
} from "@/models/project/Layers/Layers";
import { useCallback } from "react";

interface EditorCommandState {
  layerSnapshot: {
    layers: LayerX[];
    target: string;
  };
  imageTransforms: Record<string, ImageTransformState>;
  adjustments: Record<string, AdjustmentEditState>;
}

interface DispatchOptions {
  adjustmentBefore?: Record<string, AdjustmentEditState>;
  adjustmentLayerId?: string;
  recordHistory?: boolean;
}

const isTransformAction = (
  action: SerializableEditorAction,
): action is ImageTransformAction => action.type.startsWith("image.");

const isBrightnessContrastAction = (action: ImageAdjustmentAction) =>
  action.type === "adjustment.setBrightness" ||
  action.type === "adjustment.setContrast";

const supportsAdjustmentAction = (
  layer: AdjustmentLayer,
  action: ImageAdjustmentAction,
) =>
  (isBrightnessContrastAction(action) &&
    layer instanceof BrightnessAdjustmentLayer) ||
  (action.type === "adjustment.setSaturation" &&
    layer instanceof SaturationAdjustmentLayer);

const cloneLayerSnapshot = <T extends LayerX>(layer: T): T =>
  Object.assign(Object.create(Object.getPrototypeOf(layer)), layer);

const cloneLayerCollection = (layers: LayerX[]) =>
  layers.map((layer) => cloneLayerSnapshot(layer));

export const useImageTransformActions = () => {
  const {
    editDocument,
    project,
    layerManager,
    setEditDocument,
    setLayerManager,
    setUndoRedoManager,
  } = useProject();
  const { container } = useCanvas();

  const dispatchSelectedImageActions = useCallback(
    (
      actions: SerializableEditorAction[],
      title: string,
      options: DispatchOptions = {},
    ) => {
      const workingLayers = cloneLayerCollection(layerManager.layers);
      const selected = findLayer(workingLayers, layerManager.target);
      const transformActions = actions.filter(isTransformAction);
      const adjustmentActions = actions.filter(
        (action): action is ImageAdjustmentAction =>
          !isTransformAction(action),
      );

      let imageTarget: ImageLayer | null = null;
      if (transformActions.length > 0) {
        if (!(selected instanceof ImageLayer)) {
          return {
            ok: false as const,
            error: "Select an image layer before applying transforms.",
          };
        }
        imageTarget = selected;
      }

      const resolvedAdjustments: Array<{
        action: ImageAdjustmentAction;
        layer: AdjustmentLayer;
      }> = [];
      const findOrCreateAdjustmentLayer = (
        action: ImageAdjustmentAction,
      ): AdjustmentLayer | null => {
        if (!(selected instanceof ImageLayer)) {
          return null;
        }

        const existing = getAdjustmentsForImage(selected, workingLayers).filter(
          (layer) => supportsAdjustmentAction(layer, action),
        );
        if (existing.length > 0) {
          return existing[0];
        }

        const type =
          action.type === "adjustment.setSaturation"
            ? "Saturation"
            : "Brightness";
        const newLayer = layerManager.createAdjustmentLayer(
          true,
          type,
          project.settings.canvasSettings.width,
          project.settings.canvasSettings.height,
        );
        const imageIndex = workingLayers.findIndex(
          (layer) => layer.id === selected.id,
        );
        workingLayers.splice(
          imageIndex >= 0 ? imageIndex + 1 : workingLayers.length,
          0,
          newLayer,
        );
        workingLayers.forEach((layer, index) => {
          layer.zIndex = index;
        });
        return newLayer;
      };
      for (const action of adjustmentActions) {
        let candidates: AdjustmentLayer[] = [];
        const explicitLayer = options.adjustmentLayerId
          ? findLayer(workingLayers, options.adjustmentLayerId)
          : null;
        if (
          explicitLayer instanceof AdjustmentLayer &&
          supportsAdjustmentAction(explicitLayer, action)
        ) {
          candidates = [explicitLayer];
        } else if (
          selected instanceof AdjustmentLayer &&
          supportsAdjustmentAction(selected, action)
        ) {
          candidates = [selected];
        } else if (selected instanceof ImageLayer) {
          candidates = getAdjustmentsForImage(
            selected,
            workingLayers,
          ).filter((layer) => supportsAdjustmentAction(layer, action));
        }

        if (candidates.length === 0) {
          const created = findOrCreateAdjustmentLayer(action);
          if (created) {
            candidates = [created];
          }
        }

        if (candidates.length === 0) {
          return {
            ok: false as const,
            error:
              "Add or select the matching adjustment layer before applying this action.",
          };
        }
        if (candidates.length > 1) {
          return {
            ok: false as const,
            error:
              "Multiple matching adjustment layers affect this image. Select the one to edit.",
          };
        }
        resolvedAdjustments.push({ action, layer: candidates[0] });
      }

      const before: EditorCommandState = {
        layerSnapshot: {
          layers: cloneLayerCollection(layerManager.layers),
          target: layerManager.target,
        },
        imageTransforms: {},
        adjustments: {},
      };
      if (imageTarget) {
        before.imageTransforms[imageTarget.id] =
          editDocument.imageLayers[imageTarget.id]?.transform ?? {
            rotationDegrees: imageTarget.sprite.angle,
            width: imageTarget.sprite.width,
            height: imageTarget.sprite.height,
          };
      }
      for (const { layer } of resolvedAdjustments) {
        if (!before.adjustments[layer.id]) {
          const state =
            options.adjustmentBefore?.[layer.id] ??
            editDocument.adjustmentLayers[layer.id] ??
            readAdjustmentEditState(layer);
          if (!state) {
            return {
              ok: false as const,
              error: "This adjustment is not document-backed.",
            };
          }
          before.adjustments[layer.id] = state;
        }
      }

      const after: EditorCommandState = {
        layerSnapshot: {
          layers: [...workingLayers],
          target: layerManager.target,
        },
        imageTransforms: Object.fromEntries(
          Object.entries(before.imageTransforms).map(([id, state]) => [
            id,
            { ...state },
          ]),
        ),
        adjustments: Object.fromEntries(
          Object.entries(before.adjustments).map(([id, state]) => [
            id,
            { ...state, values: { ...state.values } },
          ]),
        ),
      };

      try {
        if (imageTarget && transformActions.length > 0) {
          after.imageTransforms[imageTarget.id] =
            applyImageTransformActions(
              before.imageTransforms[imageTarget.id],
              transformActions,
            );
        }
        for (const { action, layer } of resolvedAdjustments) {
          after.adjustments[layer.id] = applyImageAdjustmentAction(
            after.adjustments[layer.id],
            action,
          );
        }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error
              ? error.message
              : "The editor action could not be applied.",
        };
      }

      if (
        JSON.stringify({
          imageTransforms: before.imageTransforms,
          adjustments: before.adjustments,
        }) ===
        JSON.stringify({
          imageTransforms: after.imageTransforms,
          adjustments: after.adjustments,
        })
      ) {
        return { ok: true as const };
      }

      const applyState = (state: EditorCommandState) => {
        setLayerManager((draft) => {
          draft.layers = [...state.layerSnapshot.layers];
          draft.target = state.layerSnapshot.target;
          for (const [id, adjustment] of Object.entries(
            state.adjustments,
          )) {
            const layer = draft.layers.find((candidate) => candidate.id === id);
            if (
              layer instanceof BrightnessAdjustmentLayer &&
              adjustment.kind === "brightness-contrast"
            ) {
              layer.brightness = adjustment.values.brightness;
              layer.contrast = adjustment.values.contrast;
            } else if (
              layer instanceof SaturationAdjustmentLayer &&
              adjustment.kind === "saturation"
            ) {
              layer.saturation = adjustment.values.saturation;
            }
          }
        });
        for (const [id, transform] of Object.entries(
          state.imageTransforms,
        )) {
          const layer = state.layerSnapshot.layers.find(
            (candidate) => candidate.id === id,
          );
          if (layer instanceof ImageLayer) {
            layer.sprite.angle = transform.rotationDegrees;
            layer.sprite.width = transform.width;
            layer.sprite.height = transform.height;
          }
        }
        for (const [id, adjustment] of Object.entries(
          state.adjustments,
        )) {
          const layer = state.layerSnapshot.layers.find(
            (candidate) => candidate.id === id,
          );
          if (layer instanceof AdjustmentLayer) {
            projectAdjustmentStateToRuntime(layer, adjustment);
          }
        }

        setEditDocument((draft) => {
          const presentAdjustmentIds = new Set(
            state.layerSnapshot.layers
              .filter(
                (layer): layer is AdjustmentLayer =>
                  layer instanceof AdjustmentLayer,
              )
              .map((layer) => layer.id),
          );
          for (const adjustmentId of Object.keys(draft.adjustmentLayers)) {
            if (!presentAdjustmentIds.has(adjustmentId)) {
              delete draft.adjustmentLayers[adjustmentId];
            }
          }
          for (const [id, transform] of Object.entries(
            state.imageTransforms,
          )) {
            const existing = draft.imageLayers[id];
            draft.imageLayers[id] = {
              id,
              type: "image",
              transform: { ...transform },
              adjustmentLayerIds:
                existing?.adjustmentLayerIds ?? [],
            };
          }
          for (const [id, adjustment] of Object.entries(
            state.adjustments,
          )) {
            draft.adjustmentLayers[id] = {
              ...adjustment,
              values: { ...adjustment.values },
            };
          }

          for (const layer of state.layerSnapshot.layers) {
            if (!(layer instanceof ImageLayer)) continue;
            const existing = draft.imageLayers[layer.id];
            draft.imageLayers[layer.id] = {
              id: layer.id,
              type: "image",
              transform: existing?.transform ?? {
                rotationDegrees: layer.sprite.angle,
                width: layer.sprite.width,
                height: layer.sprite.height,
              },
              adjustmentLayerIds: getAdjustmentsForImage(
                layer,
                state.layerSnapshot.layers,
              ).map((adjustment) => adjustment.id),
            };
          }
        });
        if (container) {
          container.compositeNeeded = true;
        }
      };

      const command = new EditorStateCommand(
        title,
        before,
        after,
        applyState,
      );
      command.execute();
      if (options.recordHistory !== false) {
        setUndoRedoManager((draft) => {
          draft.undoStack.push(command);
          draft.redoStack = [];
        });
      }

      return { ok: true as const };
    },
    [
      container,
      editDocument.adjustmentLayers,
      editDocument.imageLayers,
      layerManager.layers,
      layerManager.target,
      project.settings.canvasSettings.height,
      project.settings.canvasSettings.width,
      setEditDocument,
      setLayerManager,
      setUndoRedoManager,
    ],
  );

  const previewSelectedAdjustmentAction = useCallback(
    (action: ImageAdjustmentAction, adjustmentLayerId?: string) =>
      dispatchSelectedImageActions([action], "Preview adjustment", {
        adjustmentLayerId,
        recordHistory: false,
      }),
    [dispatchSelectedImageActions],
  );

  return {
    dispatchSelectedImageActions,
    previewSelectedAdjustmentAction,
  };
};
