import NumberInput from "@/components/editor/ui/components/input/NumberInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { EditorStateCommand } from "@/models/commands/editor/EditorStateCommand";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { base64StringToTexture, setFullResolutionWorkingSource } from "@/utils/ImageUtils";
import { getOptimalInitialZoom } from "@/utils/CalcUtils";
import { texturePixelFromSpriteLocal } from "@/utils/CropCoordinates";
import { SwapHoriz } from "@mui/icons-material";
import { Graphics, Text, Texture } from "pixi.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BEFORE_DOCUMENT_SWITCH_EVENT } from "@/components/editor/editorEvents";

type CropSession = {
  layerId: string;
  textureWidth: number;
  textureHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  before: CropLayerState;
  originalRatio: number;
};

type CropLayerState = {
  texture: Texture;
  imageData: {
    src: string;
    imageWidth: number;
    imageHeight: number;
  };
  transform: {
    angle: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    positionX: number;
    positionY: number;
    skewX: number;
    skewY: number;
  };
  adjustmentLayerIds: string[];
};

type CropCommandState = {
  layerId: string;
  layer: CropLayerState;
  canvas: {
    width: number;
    height: number;
  };
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type RatioMode = "free" | "original" | "1:1" | "4:5" | "3:2" | "16:9";

const HANDLE_CURSOR: Record<DragHandle, string> = {
  move: "move",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  sw: "nesw-resize",
};

const MIN_CROP_SIZE = 8;

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));
const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const clampCropRect = (rect: CropRect, session: CropSession): CropRect => {
  const x = clampValue(rect.x, 0, session.textureWidth - 1);
  const y = clampValue(rect.y, 0, session.textureHeight - 1);
  const width = clampValue(rect.width, 1, Math.max(1, session.textureWidth - x));
  const height = clampValue(
    rect.height,
    1,
    Math.max(1, session.textureHeight - y),
  );
  return { x, y, width, height };
};

const ratioFromMode = (
  mode: RatioMode,
  originalRatio: number,
  swapped: boolean,
): number | null => {
  let ratio: number | null = null;
  if (mode === "original") ratio = originalRatio;
  else if (mode === "1:1") ratio = 1;
  else if (mode === "4:5") ratio = 4 / 5;
  else if (mode === "3:2") ratio = 3 / 2;
  else if (mode === "16:9") ratio = 16 / 9;
  if (!ratio) return null;
  return swapped ? 1 / ratio : ratio;
};

const fitRectToRatioCentered = (
  rect: CropRect,
  ratio: number,
  session: CropSession,
): CropRect => {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  let width = rect.width;
  let height = Math.round(width / ratio);
  if (height > session.textureHeight) {
    height = session.textureHeight;
    width = Math.round(height * ratio);
  }
  if (width > session.textureWidth) {
    width = session.textureWidth;
    height = Math.round(width / ratio);
  }
  width = clampValue(width, 1, session.textureWidth);
  height = clampValue(height, 1, session.textureHeight);

  const x = clampInt(
    Math.round(centerX - width / 2),
    0,
    session.textureWidth - width,
  );
  const y = clampInt(
    Math.round(centerY - height / 2),
    0,
    session.textureHeight - height,
  );
  return { x, y, width, height };
};

const cloneLayerState = (
  layer: ImageLayer,
  adjustmentLayerIds: string[],
): CropLayerState => ({
  texture: layer.sprite.texture,
  imageData: {
    src: layer.imageData.src,
    imageWidth: layer.imageData.imageWidth,
    imageHeight: layer.imageData.imageHeight,
  },
  transform: {
    angle: layer.sprite.angle,
    width: layer.sprite.width,
    height: layer.sprite.height,
    scaleX: layer.sprite.scale.x,
    scaleY: layer.sprite.scale.y,
    positionX: layer.sprite.position.x,
    positionY: layer.sprite.position.y,
    skewX: layer.sprite.skew.x,
    skewY: layer.sprite.skew.y,
  },
  adjustmentLayerIds: [...adjustmentLayerIds],
});

const CropTool: React.FC<{ showToolOptions?: boolean }> = ({ showToolOptions = true }) => {
  const {
    editMode,
    setEditMode,
    layerManager,
    setLayerManager,
    project,
    setProject,
    editDocument,
    setEditDocument,
    setUndoRedoManager,
  } = useProject();
  const {
    app,
    container,
    setCurrentZoom,
    setTargetZoom,
    targetPosition,
    pendingZoomSnap,
  } = useCanvas();
  const target = findLayer(layerManager.layers, layerManager.target);
  const sessionRef = useRef<CropSession | null>(null);
  const overlayRef = useRef<Graphics | null>(null);
  const dimensionLabelRef = useRef<Text | null>(null);
  const draggingRef = useRef<{
    pointerId: number;
    handle: DragHandle;
    startPoint: { x: number; y: number };
    startRect: CropRect;
  } | null>(null);

  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(1);
  const [cropHeight, setCropHeight] = useState(1);
  const [straightenDegrees, setStraightenDegrees] = useState(0);
  const [ratioMode, setRatioMode] = useState<RatioMode>("free");
  const [swapRatioAxes, setSwapRatioAxes] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const cropRect = useMemo(
    () => ({ x: cropX, y: cropY, width: cropWidth, height: cropHeight }),
    [cropHeight, cropWidth, cropX, cropY],
  );
  // Pointer listeners must keep their active drag state between React renders.
  // Reading this ref avoids rebinding those listeners for every crop pixel.
  const cropRectRef = useRef(cropRect);

  useEffect(() => {
    cropRectRef.current = cropRect;
  }, [cropRect]);

  const requestComposite = useCallback(() => {
    if (container) {
      container.compositeNeeded = true;
    }
  }, [container]);

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.clear();
      overlay.removeFromParent();
    }
    dimensionLabelRef.current?.removeFromParent();
  }, []);

  const applyCropLayerState = useCallback(
    (state: CropCommandState) => {
      setProject((draft) => {
        draft.settings.canvasSettings.width = state.canvas.width;
        draft.settings.canvasSettings.height = state.canvas.height;
      });

      setLayerManager((draft) => {
        const imageLayer = findLayer(draft.layers, state.layerId);
        if (!(imageLayer instanceof ImageLayer)) {
          return;
        }
        imageLayer.sprite.texture = state.layer.texture;
        imageLayer.sprite.angle = state.layer.transform.angle;
        imageLayer.sprite.width = state.layer.transform.width;
        imageLayer.sprite.height = state.layer.transform.height;
        imageLayer.sprite.scale.x = state.layer.transform.scaleX;
        imageLayer.sprite.scale.y = state.layer.transform.scaleY;
        imageLayer.sprite.position.x = state.layer.transform.positionX;
        imageLayer.sprite.position.y = state.layer.transform.positionY;
        imageLayer.sprite.skew.x = state.layer.transform.skewX;
        imageLayer.sprite.skew.y = state.layer.transform.skewY;
        setFullResolutionWorkingSource(
          imageLayer,
          state.layer.imageData.src,
          state.layer.imageData.imageWidth,
          state.layer.imageData.imageHeight,
        );
      });

      setEditDocument((draft) => {
        draft.imageLayers[state.layerId] = {
          id: state.layerId,
          type: "image",
          transform: {
            rotationDegrees: state.layer.transform.angle,
            width: state.layer.transform.width,
            height: state.layer.transform.height,
          },
          adjustmentLayerIds: [...state.layer.adjustmentLayerIds],
        };
      });

      const renderer = app.current?.renderer;
      if (renderer) {
        const availableWidth = Math.max(1, Math.round(renderer.width));
        const availableHeight = Math.max(1, Math.round(renderer.height));
        const fittedZoom = getOptimalInitialZoom(
          state.canvas.width,
          state.canvas.height,
          Math.max(1, availableWidth - 96),
          Math.max(1, availableHeight - 96),
          0,
        );
        const fittedPosition = {
          x: availableWidth / 2,
          y: availableHeight / 2,
        };
        setCurrentZoom(fittedZoom);
        setTargetZoom(fittedZoom);
        targetPosition.current = fittedPosition;
        pendingZoomSnap.current = {
          zoom: fittedZoom,
          ...fittedPosition,
        };
      }
      requestComposite();
    },
    [
      app,
      pendingZoomSnap,
      requestComposite,
      setCurrentZoom,
      setEditDocument,
      setLayerManager,
      setProject,
      setTargetZoom,
      targetPosition,
    ],
  );

  const restorePreCropState = useCallback(() => {
    if (!(target instanceof ImageLayer)) return;
    const session = sessionRef.current;
    if (!session || session.layerId !== target.id) return;
    applyCropLayerState({
      layerId: target.id,
      layer: session.before,
      canvas: {
        width: session.canvasWidth,
        height: session.canvasHeight,
      },
    });
  }, [applyCropLayerState, target]);

  const syncCropRect = useCallback(
    (rect: CropRect) => {
      const session = sessionRef.current;
      if (!session) return;
      const baseRect = clampCropRect(rect, session);
      const ratio = ratioFromMode(ratioMode, session.originalRatio, swapRatioAxes);
      const nextRect = ratio
        ? fitRectToRatioCentered(baseRect, ratio, session)
        : baseRect;
      setCropX(nextRect.x);
      setCropY(nextRect.y);
      setCropWidth(nextRect.width);
      setCropHeight(nextRect.height);
    },
    [ratioMode, swapRatioAxes],
  );

  const getGlobalFromPointerEvent = useCallback(
    (event: PointerEvent) => {
      const canvasEl = app.current?.canvas as HTMLCanvasElement | null;
      const renderer = app.current?.renderer;
      if (!canvasEl || !renderer) return null;
      const rect = canvasEl.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * renderer.width;
      const y = ((event.clientY - rect.top) / rect.height) * renderer.height;
      return { x, y };
    },
    [app],
  );

  const texturePixelFromGlobal = useCallback(
    (
      layer: ImageLayer,
      session: CropSession,
      globalPoint: { x: number; y: number },
    ) => {
      const localPoint = layer.sprite.toLocal(globalPoint);
      return texturePixelFromSpriteLocal(
        localPoint,
        session.textureWidth,
        session.textureHeight,
      );
    },
    [],
  );

  const getDragHandleForPoint = useCallback(
    (
      point: { x: number; y: number },
      rect: CropRect,
      edgeThresholdX: number,
      edgeThresholdY: number,
    ) => {
      const handleHitScale = 1.5;
      const handleTargets: Array<{ handle: DragHandle; x: number; y: number }> = [
        { handle: "nw", x: rect.x, y: rect.y },
        { handle: "ne", x: rect.x + rect.width, y: rect.y },
        { handle: "sw", x: rect.x, y: rect.y + rect.height },
        { handle: "se", x: rect.x + rect.width, y: rect.y + rect.height },
        { handle: "n", x: rect.x + rect.width / 2, y: rect.y },
        { handle: "s", x: rect.x + rect.width / 2, y: rect.y + rect.height },
        { handle: "w", x: rect.x, y: rect.y + rect.height / 2 },
        { handle: "e", x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      ];
      const hitHandle = handleTargets
        .map((target) => ({
          handle: target.handle,
          nx: Math.abs(point.x - target.x) / (edgeThresholdX * handleHitScale),
          ny: Math.abs(point.y - target.y) / (edgeThresholdY * handleHitScale),
        }))
        .filter((candidate) => candidate.nx <= 1 && candidate.ny <= 1)
        .sort((a, b) => a.nx + a.ny - (b.nx + b.ny))[0];
      if (hitHandle) return hitHandle.handle;

      const insideX = point.x >= rect.x && point.x <= rect.x + rect.width;
      const insideY = point.y >= rect.y && point.y <= rect.y + rect.height;
      return insideX && insideY ? "move" : null;
    },
    [],
  );

  const applyRatioForHandle = useCallback(
    (
      rect: CropRect,
      handle: DragHandle,
      startRect: CropRect,
      ratio: number,
      session: CropSession,
    ): CropRect => {
      if (handle === "move") return rect;

      let width = rect.width;
      let height = rect.height;

      if (handle === "n" || handle === "s") {
        width = Math.round(height * ratio);
      } else if (handle === "e" || handle === "w") {
        height = Math.round(width / ratio);
      } else {
        const heightFromWidth = Math.round(width / ratio);
        const widthFromHeight = Math.round(height * ratio);
        const widthDiff = Math.abs(heightFromWidth - height);
        const heightDiff = Math.abs(widthFromHeight - width);
        if (widthDiff <= heightDiff) {
          height = heightFromWidth;
        } else {
          width = widthFromHeight;
        }
      }

      width = Math.max(MIN_CROP_SIZE, width);
      height = Math.max(MIN_CROP_SIZE, height);

      const rightAnchor = startRect.x + startRect.width;
      const bottomAnchor = startRect.y + startRect.height;
      const centerX = startRect.x + startRect.width / 2;
      const centerY = startRect.y + startRect.height / 2;

      let x = rect.x;
      let y = rect.y;

      if (handle.includes("w")) x = rightAnchor - width;
      else if (!handle.includes("e")) x = Math.round(centerX - width / 2);

      if (handle.includes("n")) y = bottomAnchor - height;
      else if (!handle.includes("s")) y = Math.round(centerY - height / 2);

      return clampCropRect({ x, y, width, height }, session);
    },
    [],
  );

  const applyDragDelta = useCallback(
    (
      session: CropSession,
      startRect: CropRect,
      handle: DragHandle,
      delta: { x: number; y: number },
    ): CropRect => {
      let nextRect = { ...startRect };
      const maxWidth = session.textureWidth;
      const maxHeight = session.textureHeight;

      if (handle === "move") {
        nextRect.x = clampValue(
          startRect.x + delta.x,
          0,
          maxWidth - startRect.width,
        );
        nextRect.y = clampValue(
          startRect.y + delta.y,
          0,
          maxHeight - startRect.height,
        );
        return nextRect;
      }

      if (handle.includes("e")) {
        nextRect.width = clampValue(
          startRect.width + delta.x,
          MIN_CROP_SIZE,
          maxWidth - startRect.x,
        );
      }
      if (handle.includes("s")) {
        nextRect.height = clampValue(
          startRect.height + delta.y,
          MIN_CROP_SIZE,
          maxHeight - startRect.y,
        );
      }
      if (handle.includes("w")) {
        const right = startRect.x + startRect.width;
        const nextX = clampValue(
          startRect.x + delta.x,
          0,
          right - MIN_CROP_SIZE,
        );
        nextRect.x = nextX;
        nextRect.width = right - nextX;
      }
      if (handle.includes("n")) {
        const bottom = startRect.y + startRect.height;
        const nextY = clampValue(
          startRect.y + delta.y,
          0,
          bottom - MIN_CROP_SIZE,
        );
        nextRect.y = nextY;
        nextRect.height = bottom - nextY;
      }

      const ratio = ratioFromMode(ratioMode, session.originalRatio, swapRatioAxes);
      if (!ratio) return clampCropRect(nextRect, session);
      return applyRatioForHandle(nextRect, handle, startRect, ratio, session);
    },
    [applyRatioForHandle, ratioMode, swapRatioAxes],
  );

  const drawOverlay = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !(target instanceof ImageLayer)) return;

    if (!overlayRef.current) {
      overlayRef.current = new Graphics();
      overlayRef.current.eventMode = "none";
    }
    const overlay = overlayRef.current;
    if (overlay.parent !== target.sprite) {
      overlay.removeFromParent();
      target.sprite.addChild(overlay);
    }

    const rect = clampCropRect(cropRect, session);
    // Overlay children use sprite-local coordinates, not scaled display
    // coordinates. Using sprite.width here would apply sprite scale twice.
    const displayWidth = session.textureWidth;
    const displayHeight = session.textureHeight;
    const left = -displayWidth / 2 + (rect.x / session.textureWidth) * displayWidth;
    const top = -displayHeight / 2 + (rect.y / session.textureHeight) * displayHeight;
    const width = (rect.width / session.textureWidth) * displayWidth;
    const height = (rect.height / session.textureHeight) * displayHeight;
    const right = left + width;
    const bottom = top + height;

    overlay.clear();

    overlay.rect(-displayWidth / 2, -displayHeight / 2, displayWidth, top + displayHeight / 2);
    overlay.fill({ color: 0x000000, alpha: 0.35 });
    overlay.rect(-displayWidth / 2, top, left + displayWidth / 2, height);
    overlay.fill({ color: 0x000000, alpha: 0.35 });
    overlay.rect(right, top, displayWidth / 2 - right, height);
    overlay.fill({ color: 0x000000, alpha: 0.35 });
    overlay.rect(-displayWidth / 2, bottom, displayWidth, displayHeight / 2 - bottom);
    overlay.fill({ color: 0x000000, alpha: 0.35 });

    overlay.rect(left, top, width, height);
    overlay.stroke({ width: 2, color: 0xffffff, alpha: 1 });

    if (isInteracting) {
      const oneThirdX = left + width / 3;
      const twoThirdX = left + (2 * width) / 3;
      const oneThirdY = top + height / 3;
      const twoThirdY = top + (2 * height) / 3;
      overlay.moveTo(oneThirdX, top);
      overlay.lineTo(oneThirdX, bottom);
      overlay.stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      overlay.moveTo(twoThirdX, top);
      overlay.lineTo(twoThirdX, bottom);
      overlay.stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      overlay.moveTo(left, oneThirdY);
      overlay.lineTo(right, oneThirdY);
      overlay.stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      overlay.moveTo(left, twoThirdY);
      overlay.lineTo(right, twoThirdY);
      overlay.stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
    }

    const worldScaleX = Math.hypot(target.sprite.worldTransform.a, target.sprite.worldTransform.b);
    const worldScaleY = Math.hypot(target.sprite.worldTransform.c, target.sprite.worldTransform.d);
    const halfHandleWidth = 6 / Math.max(0.001, worldScaleX);
    const halfHandleHeight = 6 / Math.max(0.001, worldScaleY);

    const drawHandle = (x: number, y: number) => {
      overlay.rect(x - halfHandleWidth, y - halfHandleHeight, halfHandleWidth * 2, halfHandleHeight * 2);
      overlay.fill({ color: 0x1d4ed8, alpha: 1 });
      overlay.rect(x - halfHandleWidth, y - halfHandleHeight, halfHandleWidth * 2, halfHandleHeight * 2);
      overlay.stroke({ width: 1, color: 0xffffff, alpha: 1 });
    };
    drawHandle(left, top);
    drawHandle(right, top);
    drawHandle(left, bottom);
    drawHandle(right, bottom);
    drawHandle((left + right) / 2, top);
    drawHandle((left + right) / 2, bottom);
    drawHandle(left, (top + bottom) / 2);
    drawHandle(right, (top + bottom) / 2);

    const dragState = draggingRef.current;
    if (isInteracting && dragState && dragState.handle !== "move") {
      const handlePosition = {
        x: dragState.handle.includes("w")
          ? left
          : dragState.handle.includes("e")
            ? right
            : (left + right) / 2,
        y: dragState.handle.includes("n")
          ? top
          : dragState.handle.includes("s")
            ? bottom
            : (top + bottom) / 2,
      };
      const isWest = dragState.handle.includes("w");
      const isNorth = dragState.handle.includes("n");
      if (!dimensionLabelRef.current) {
        dimensionLabelRef.current = new Text({
          text: "",
          style: {
            fill: 0xffffff,
            fontFamily: "Arial, sans-serif",
            fontSize: 22,
            fontWeight: "600",
            stroke: { color: 0x000000, width: 3 },
          },
        });
        dimensionLabelRef.current.eventMode = "none";
      }
      const dimensionLabel = dimensionLabelRef.current;
      dimensionLabel.text = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      dimensionLabel.anchor.set(isWest ? 1 : 0, isNorth ? 1 : 0);
      // Keep the readout legible at every canvas zoom, just like the handles.
      dimensionLabel.scale.set(
        1 / Math.max(0.001, worldScaleX),
        1 / Math.max(0.001, worldScaleY),
      );
      dimensionLabel.position.set(
        handlePosition.x + (isWest ? -10 : 10) / Math.max(0.001, worldScaleX),
        handlePosition.y + (isNorth ? -10 : 10) / Math.max(0.001, worldScaleY),
      );
      if (dimensionLabel.parent !== target.sprite) {
        dimensionLabel.removeFromParent();
        target.sprite.addChild(dimensionLabel);
      }
    } else {
      dimensionLabelRef.current?.removeFromParent();
    }

    requestComposite();
  }, [cropRect, isInteracting, requestComposite, target]);

  const initializeSession = useCallback(() => {
    if (!(target instanceof ImageLayer)) {
      toast.warning("Please select an image layer to crop.");
      setEditMode("move");
      return;
    }
    const textureWidth = Math.max(1, Math.round(target.sprite.texture.width));
    const textureHeight = Math.max(1, Math.round(target.sprite.texture.height));
    const adjustmentLayerIds = editDocument.imageLayers[target.id]?.adjustmentLayerIds ?? [];
    sessionRef.current = {
      layerId: target.id,
      textureWidth,
      textureHeight,
      canvasWidth: project.settings.canvasSettings.width,
      canvasHeight: project.settings.canvasSettings.height,
      originalRatio: textureWidth / textureHeight,
      before: cloneLayerState(target, adjustmentLayerIds),
    };
    setRatioMode("free");
    setSwapRatioAxes(false);
    setStraightenDegrees(0);
    setIsInteracting(false);
    setCropX(0);
    setCropY(0);
    setCropWidth(textureWidth);
    setCropHeight(textureHeight);
  }, [editDocument.imageLayers, project.settings.canvasSettings.height, project.settings.canvasSettings.width, setEditMode, target]);

  useEffect(() => {
    if (editMode !== "crop") return;
    initializeSession();
  }, [editMode, initializeSession]);

  useEffect(() => {
    if (editMode !== "crop") return;
    if (!(target instanceof ImageLayer)) return;
    const session = sessionRef.current;
    if (!session || session.layerId !== target.id) return;

    target.sprite.angle = session.before.transform.angle + straightenDegrees;
    drawOverlay();
  }, [cropRect, drawOverlay, editMode, straightenDegrees, target]);

  useEffect(() => {
    if (editMode !== "crop") return;
    const session = sessionRef.current;
    if (!session) return;
    const ratio = ratioFromMode(ratioMode, session.originalRatio, swapRatioAxes);
    if (!ratio) return;
    syncCropRect(cropRect);
  }, [cropRect, editMode, ratioMode, swapRatioAxes, syncCropRect]);

  const handleCancel = useCallback(() => {
    setIsInteracting(false);
    restorePreCropState();
    clearOverlay();
    setEditMode("move");
  }, [clearOverlay, restorePreCropState, setEditMode]);

  const buildAfterState = useCallback(
    async (layer: ImageLayer, session: CropSession): Promise<CropCommandState> => {
      const clampedRect = clampCropRect(cropRect, session);
      const safeRect = {
        x: Math.round(clampedRect.x),
        y: Math.round(clampedRect.y),
        width: Math.max(1, Math.round(clampedRect.width)),
        height: Math.max(1, Math.round(clampedRect.height)),
      };
      const source = layer.sprite.texture.source.resource;
      if (
        !(
          source instanceof HTMLCanvasElement ||
          source instanceof HTMLImageElement ||
          source instanceof ImageBitmap
        )
      ) {
        throw new Error("This image source cannot be cropped in the browser.");
      }

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = safeRect.width;
      cropCanvas.height = safeRect.height;
      const context = cropCanvas.getContext("2d");
      if (!context) throw new Error("Failed to prepare crop canvas.");

      context.drawImage(
        source as CanvasImageSource,
        safeRect.x,
        safeRect.y,
        safeRect.width,
        safeRect.height,
        0,
        0,
        safeRect.width,
        safeRect.height,
      );

      const dataUrl = cropCanvas.toDataURL("image/png");
      const nextTexture = await base64StringToTexture(dataUrl);
      const pre = session.before.transform;
      const previousTextureWidth = Math.max(1, Math.round(layer.sprite.texture.width));
      const previousTextureHeight = Math.max(1, Math.round(layer.sprite.texture.height));
      const widthRatio = safeRect.width / previousTextureWidth;
      const heightRatio = safeRect.height / previousTextureHeight;
      const croppedWidth = Math.max(
        1,
        Math.round(Math.abs(pre.width) * widthRatio),
      );
      const croppedHeight = Math.max(
        1,
        Math.round(Math.abs(pre.height) * heightRatio),
      );

      return {
        layerId: layer.id,
        canvas: {
          width: croppedWidth,
          height: croppedHeight,
        },
        layer: {
          texture: nextTexture,
          imageData: {
            src: dataUrl,
            imageWidth: safeRect.width,
            imageHeight: safeRect.height,
          },
          adjustmentLayerIds: [...session.before.adjustmentLayerIds],
          transform: {
            angle: pre.angle + straightenDegrees,
            width: croppedWidth,
            height: croppedHeight,
            scaleX: pre.scaleX,
            scaleY: pre.scaleY,
            positionX: croppedWidth / 2,
            positionY: croppedHeight / 2,
            skewX: pre.skewX,
            skewY: pre.skewY,
          },
        },
      };
    },
    [cropRect, straightenDegrees],
  );

  const handleApply = useCallback(async () => {
    if (!(target instanceof ImageLayer)) {
      setEditMode("move");
      return;
    }
    const session = sessionRef.current;
    if (!session || session.layerId !== target.id) {
      setEditMode("move");
      return;
    }

    try {
      const beforeState: CropCommandState = {
        layerId: target.id,
        layer: session.before,
        canvas: {
          width: session.canvasWidth,
          height: session.canvasHeight,
        },
      };
      const afterState = await buildAfterState(target, session);
      const command = new EditorStateCommand<CropCommandState>(
        "Crop image",
        beforeState,
        afterState,
        applyCropLayerState,
      );
      command.execute();
      setUndoRedoManager((draft) => {
        draft.undoStack.push(command);
        draft.redoStack = [];
      });
      setIsInteracting(false);
      clearOverlay();
      setEditMode("move");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply crop.",
      );
    }
  }, [
    applyCropLayerState,
    buildAfterState,
    clearOverlay,
    setEditMode,
    setUndoRedoManager,
    target,
  ]);

  useEffect(() => {
    const handleDocumentSwitch = () => {
      if (editMode === "crop") {
        handleCancel();
      }
    };

    window.addEventListener(BEFORE_DOCUMENT_SWITCH_EVENT, handleDocumentSwitch);
    return () => {
      window.removeEventListener(
        BEFORE_DOCUMENT_SWITCH_EVENT,
        handleDocumentSwitch,
      );
    };
  }, [editMode, handleCancel]);

  useEffect(() => {
    if (editMode !== "crop" || !(target instanceof ImageLayer)) return;
    const session = sessionRef.current;
    if (!session || session.layerId !== target.id) return;

    const canvasEl = app.current?.canvas as HTMLCanvasElement | null;
    if (!canvasEl) return;

    const getEdgeThreshold = () => {
      const spriteScaleX = Math.hypot(target.sprite.worldTransform.a, target.sprite.worldTransform.b);
      const spriteScaleY = Math.hypot(target.sprite.worldTransform.c, target.sprite.worldTransform.d);
      return {
        thresholdX: 14 / Math.max(0.001, spriteScaleX),
        thresholdY: 14 / Math.max(0.001, spriteScaleY),
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const globalPoint = getGlobalFromPointerEvent(event);
      if (!globalPoint) return;
      const pixelPoint = texturePixelFromGlobal(target, session, globalPoint);
      const { thresholdX, thresholdY } = getEdgeThreshold();
      const handle = getDragHandleForPoint(
        pixelPoint,
        cropRectRef.current,
        thresholdX,
        thresholdY,
      );
      if (!handle) return;

      draggingRef.current = {
        pointerId: event.pointerId,
        handle,
        startPoint: pixelPoint,
        startRect: cropRectRef.current,
      };
      setIsInteracting(true);
      canvasEl.style.cursor = HANDLE_CURSOR[handle];
      if (canvasEl.setPointerCapture) canvasEl.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onCanvasPointerMove = (event: PointerEvent) => {
      if (draggingRef.current) return;
      const globalPoint = getGlobalFromPointerEvent(event);
      if (!globalPoint) return;
      const pixelPoint = texturePixelFromGlobal(target, session, globalPoint);
      const { thresholdX, thresholdY } = getEdgeThreshold();
      const handle = getDragHandleForPoint(
        pixelPoint,
        cropRectRef.current,
        thresholdX,
        thresholdY,
      );
      canvasEl.style.cursor = handle ? HANDLE_CURSOR[handle] : "default";
    };

    const onPointerMove = (event: PointerEvent) => {
      const dragState = draggingRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.layerId !== target.id) return;
      const globalPoint = getGlobalFromPointerEvent(event);
      if (!globalPoint) return;

      const pixelPoint = texturePixelFromGlobal(target, currentSession, globalPoint);
      const delta = {
        x: pixelPoint.x - dragState.startPoint.x,
        y: pixelPoint.y - dragState.startPoint.y,
      };
      const nextRect = applyDragDelta(
        currentSession,
        dragState.startRect,
        dragState.handle,
        delta,
      );
      setCropX(nextRect.x);
      setCropY(nextRect.y);
      setCropWidth(nextRect.width);
      setCropHeight(nextRect.height);
      canvasEl.style.cursor = HANDLE_CURSOR[dragState.handle];
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (draggingRef.current?.pointerId !== event.pointerId) return;
      draggingRef.current = null;
      setIsInteracting(false);
      if (canvasEl.releasePointerCapture && canvasEl.hasPointerCapture?.(event.pointerId)) {
        canvasEl.releasePointerCapture(event.pointerId);
      }
      canvasEl.style.cursor = "default";
    };

    canvasEl.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("pointermove", onCanvasPointerMove);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointermove", onCanvasPointerMove);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      draggingRef.current = null;
      setIsInteracting(false);
      canvasEl.style.cursor = "default";
    };
  }, [
    app,
    applyDragDelta,
    editMode,
    getDragHandleForPoint,
    getGlobalFromPointerEvent,
    target,
    texturePixelFromGlobal,
  ]);

  useEffect(() => {
    if (editMode !== "crop") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingElement =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.isContentEditable;
      if (isTypingElement) return;

      if (event.key === "Enter") {
        event.preventDefault();
        void handleApply();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode, handleApply, handleCancel]);

  useEffect(
    () => () => {
      clearOverlay();
    },
    [clearOverlay],
  );

  const session = sessionRef.current;
  const maxX = session ? Math.max(0, session.textureWidth - 1) : 0;
  const maxY = session ? Math.max(0, session.textureHeight - 1) : 0;

  return (
    <div className="w-full">
      {showToolOptions && target instanceof ImageLayer && editMode === "crop" && (
        <div className="z-10 flex h-9 w-full flex-nowrap items-center gap-2 overflow-x-auto border-b-2 border-[#cdcdcd] bg-navbarBackground px-3 text-black dark:border-[#252525] dark:bg-navbarBackground dark:text-white">
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Crop
          </span>
          <Button
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-7 bg-blue-500 px-2 text-xs hover:bg-blue-600"
            onClick={() => void handleApply()}
          >
            Apply
          </Button>
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Ratio
          </span>
          <Select
            value={ratioMode}
            onValueChange={(value) => setRatioMode(value as RatioMode)}
          >
            <SelectTrigger className="h-7 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="original">Original</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="4:5">4:5</SelectItem>
              <SelectItem value="3:2">3:2</SelectItem>
              <SelectItem value="16:9">16:9</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSwapRatioAxes((value) => !value)}
            disabled={ratioMode === "free"}
            title="Swap width and height"
          >
            <SwapHoriz className="h-4 w-4" />
          </Button>
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Straighten
          </span>
          <NumberInput
            min={-45}
            max={45}
            numPlaces={1}
            value={straightenDegrees}
            setValue={setStraightenDegrees}
          />
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            X
          </span>
          <NumberInput
            min={0}
            max={maxX}
            value={Math.round(cropX)}
            numPlaces={0}
            setValue={(value) => {
              if (!session) return;
              const nextX = clampInt(value, 0, maxX);
              syncCropRect({
                x: nextX,
                y: cropY,
                width: clampInt(cropWidth, 1, session.textureWidth - nextX),
                height: cropHeight,
              });
            }}
          />
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Y
          </span>
          <NumberInput
            min={0}
            max={maxY}
            value={Math.round(cropY)}
            numPlaces={0}
            setValue={(value) => {
              if (!session) return;
              const nextY = clampInt(value, 0, maxY);
              syncCropRect({
                x: cropX,
                y: nextY,
                width: cropWidth,
                height: clampInt(cropHeight, 1, session.textureHeight - nextY),
              });
            }}
          />
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            W
          </span>
          <NumberInput
            min={1}
            max={session ? session.textureWidth - cropX : 1}
            value={Math.round(cropWidth)}
            numPlaces={0}
            setValue={(value) => {
              if (!session) return;
              syncCropRect({
                x: cropX,
                y: cropY,
                width: clampInt(value, 1, session.textureWidth - cropX),
                height: cropHeight,
              });
            }}
          />
          <span className="shrink-0 select-none text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            H
          </span>
          <NumberInput
            min={1}
            max={session ? session.textureHeight - cropY : 1}
            value={Math.round(cropHeight)}
            numPlaces={0}
            setValue={(value) => {
              if (!session) return;
              syncCropRect({
                x: cropX,
                y: cropY,
                width: cropWidth,
                height: clampInt(value, 1, session.textureHeight - cropY),
              });
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CropTool;
