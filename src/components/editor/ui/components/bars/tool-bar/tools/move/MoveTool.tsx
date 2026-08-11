import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { Graphics, PointData } from "pixi.js";
import React, { useEffect, useRef } from "react";

const DEBUG_MOVE_TOOL = false;

const debugMove = (message: string, payload?: unknown) => {
  if (!DEBUG_MOVE_TOOL) {
    return;
  }
  if (payload !== undefined) {
    console.log(`[MoveTool] ${message}`, payload);
    return;
  }
  console.log(`[MoveTool] ${message}`);
};

const MoveTool: React.FC = () => {
  const { app, container } = useCanvas();
  const { editMode, layerManager, setLayerManager } = useProject();

  const draggingRef = useRef(false);
  const dragLayerRef = useRef<ImageLayer | null>(null);
  const dragOffsetRef = useRef<PointData>({ x: 0, y: 0 });
  const previousAlphaRef = useRef(1);
  const moveLogCounterRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const lineRef = useRef<Graphics | null>(null);

  useEffect(() => {
    if (!app.current || !container || editMode !== "move") {
      debugMove("inactive", {
        hasApp: Boolean(app.current),
        hasContainer: Boolean(container),
        editMode,
      });
      return;
    }

    const stage = app.current.stage;
    const canvasEl = app.current.canvas as HTMLCanvasElement | null;

    if (!canvasEl) {
      debugMove("inactive", {
        hasApp: Boolean(app.current),
        hasContainer: Boolean(container),
        hasCanvas: false,
        editMode,
      });
      return;
    }

    const imageLayers = layerManager.layers.filter(
      (layer): layer is ImageLayer => layer instanceof ImageLayer,
    );

    const previousContainerEventMode = container.eventMode;
    const previousInteractiveChildren = container.interactiveChildren;

    debugMove("active", {
      targetId: layerManager.target,
      imageLayerCount: imageLayers.length,
      stageEventMode: stage.eventMode,
      containerEventMode: container.eventMode,
      containerInteractiveChildren: container.interactiveChildren,
    });

    container.eventMode = "static";
    container.interactiveChildren = true;

    if (!lineRef.current) {
      lineRef.current = new Graphics();
      lineRef.current.zIndex = 1000;
      lineRef.current.eventMode = "none";
      stage.addChild(lineRef.current);
    } else if (lineRef.current.parent !== stage) {
      lineRef.current.removeFromParent();
      stage.addChild(lineRef.current);
    }

    const toStagePoint = (x: number, y: number) => {
      return {
        x: container.x + (x - container.pivot.x) * container.scale.x,
        y: container.y + (y - container.pivot.y) * container.scale.y,
      };
    };

    const drawVerticalGuide = (x: number, height: number) => {
      const top = toStagePoint(x, 0);
      const bottom = toStagePoint(x, height);
      lineRef.current?.moveTo(top.x, top.y);
      lineRef.current?.lineTo(bottom.x, bottom.y);
      lineRef.current?.stroke({ width: 2, color: 0xff3b30 });
    };

    const drawHorizontalGuide = (y: number, width: number) => {
      const left = toStagePoint(0, y);
      const right = toStagePoint(width, y);
      lineRef.current?.moveTo(left.x, left.y);
      lineRef.current?.lineTo(right.x, right.y);
      lineRef.current?.stroke({ width: 2, color: 0xff3b30 });
    };

    const previousCursorByLayerId = new Map<string, string | undefined>();

    const getGlobalFromPointerEvent = (event: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      const x =
        ((event.clientX - rect.left) / rect.width) *
        app.current!.renderer.width;
      const y =
        ((event.clientY - rect.top) / rect.height) *
        app.current!.renderer.height;
      return { x, y };
    };

    const toContainerLocal = (globalX: number, globalY: number) => {
      const x = (globalX - container.x) / container.scale.x + container.pivot.x;
      const y = (globalY - container.y) / container.scale.y + container.pivot.y;
      return { x, y };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current || !dragLayerRef.current) {
        return;
      }

      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      const dragSprite = dragLayerRef.current.sprite;
      const { x: globalX, y: globalY } = getGlobalFromPointerEvent(event);
      const localPosition = toContainerLocal(globalX, globalY);

      const scaleX = Math.abs(dragSprite.scale.x) || 1;
      const scaleY = Math.abs(dragSprite.scale.y) || 1;
      const offsetX = dragOffsetRef.current.x * scaleX;
      const offsetY = dragOffsetRef.current.y * scaleY;

      const rawX = localPosition.x - offsetX;
      const rawY = localPosition.y - offsetY;

      const width = container.originalWidth;
      const height = container.originalHeight;
      const halfW = dragSprite.width / 2;
      const halfH = dragSprite.height / 2;

      const thresholdX = Math.min(20, Math.max(6, width * 0.008));
      const thresholdY = Math.min(20, Math.max(6, height * 0.008));

      const xCandidates = [
        {
          value: width / 2,
          guide: "v-center",
          distance: Math.abs(rawX - width / 2),
        },
        { value: 0, guide: "v-left", distance: Math.abs(rawX) },
        { value: width, guide: "v-right", distance: Math.abs(rawX - width) },
        { value: halfW, guide: "v-left", distance: Math.abs(rawX - halfW) },
        {
          value: width - halfW,
          guide: "v-right",
          distance: Math.abs(rawX - (width - halfW)),
        },
        {
          value: width / 2 + halfW,
          guide: "v-center",
          distance: Math.abs(rawX - (width / 2 + halfW)),
        },
        {
          value: width / 2 - halfW,
          guide: "v-center",
          distance: Math.abs(rawX - (width / 2 - halfW)),
        },
      ];

      const yCandidates = [
        {
          value: height / 2,
          guide: "h-center",
          distance: Math.abs(rawY - height / 2),
        },
        { value: 0, guide: "h-top", distance: Math.abs(rawY) },
        { value: height, guide: "h-bottom", distance: Math.abs(rawY - height) },
        { value: halfH, guide: "h-top", distance: Math.abs(rawY - halfH) },
        {
          value: height - halfH,
          guide: "h-bottom",
          distance: Math.abs(rawY - (height - halfH)),
        },
      ];

      const xSnap = xCandidates
        .filter((candidate) => candidate.distance <= thresholdX)
        .sort((a, b) => a.distance - b.distance)[0];

      const ySnap = yCandidates
        .filter((candidate) => candidate.distance <= thresholdY)
        .sort((a, b) => a.distance - b.distance)[0];

      const finalX = xSnap ? xSnap.value : rawX;
      const finalY = ySnap ? ySnap.value : rawY;

      dragSprite.position.set(finalX, finalY);

      if (lineRef.current) {
        lineRef.current.clear();

        // Keep snap guides above displaySprite/container while dragging.
        if (lineRef.current.parent === stage) {
          stage.setChildIndex(lineRef.current, stage.children.length - 1);
        }

        if (xSnap) {
          if (xSnap.guide === "v-left") drawVerticalGuide(0, height);
          if (xSnap.guide === "v-right") drawVerticalGuide(width, height);
          if (xSnap.guide === "v-center") drawVerticalGuide(width / 2, height);
        }

        if (ySnap) {
          if (ySnap.guide === "h-top") drawHorizontalGuide(0, width);
          if (ySnap.guide === "h-bottom") drawHorizontalGuide(height, width);
          if (ySnap.guide === "h-center")
            drawHorizontalGuide(height / 2, width);
        }
      }

      moveLogCounterRef.current += 1;
      if (moveLogCounterRef.current % 10 === 0) {
        debugMove("drag move", {
          layerId: dragLayerRef.current.id,
          x: dragSprite.position.x,
          y: dragSprite.position.y,
        });
      }

      container.compositeNeeded = true;
    };

    const detachDragListeners = () => {
      debugMove("detach drag listeners");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerCancel);
    };

    const attachDragListeners = () => {
      // Native pointer listeners avoid Pixi federated hit-routing issues with RT.
      debugMove("attach drag listeners");
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onWindowPointerUp);
      window.addEventListener("pointercancel", onWindowPointerCancel);
    };

    const startDrag = (
      layer: ImageLayer,
      sprite: ImageLayer["sprite"],
      event: PointerEvent,
      globalX: number,
      globalY: number,
    ) => {
      setLayerManager((draft) => {
        if (draft.target !== layer.id) {
          draft.target = layer.id;
        }
      });

      previousAlphaRef.current = sprite.alpha;
      dragLayerRef.current = layer;
      draggingRef.current = true;
      activePointerIdRef.current = event.pointerId;

      const localOnSprite = sprite.toLocal({ x: globalX, y: globalY });
      dragOffsetRef.current = { x: localOnSprite.x, y: localOnSprite.y };

      sprite.alpha = 0.75;
      sprite.cursor = "grabbing";

      moveLogCounterRef.current = 0;
      debugMove("drag start", {
        layerId: layer.id,
        targetBeforeDrag: layerManager.target,
        pointerGlobalX: globalX,
        pointerGlobalY: globalY,
        offsetX: dragOffsetRef.current.x,
        offsetY: dragOffsetRef.current.y,
      });

      attachDragListeners();
      container.compositeNeeded = true;
    };

    const finishDrag = (reason = "unknown") => {
      if (!draggingRef.current || !dragLayerRef.current) {
        return;
      }

      const dragSprite = dragLayerRef.current.sprite;
      debugMove("drag end", {
        layerId: dragLayerRef.current.id,
        reason,
        finalX: dragSprite.position.x,
        finalY: dragSprite.position.y,
      });
      dragSprite.alpha = previousAlphaRef.current;
      dragSprite.cursor = "grab";

      draggingRef.current = false;
      dragLayerRef.current = null;
      activePointerIdRef.current = null;
      lineRef.current?.clear();

      detachDragListeners();
      container.compositeNeeded = true;
    };

    const onWindowPointerUp = (event: PointerEvent) => {
      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      finishDrag("pointerup");
    };

    const onWindowPointerCancel = (event: PointerEvent) => {
      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      finishDrag("pointercancel");
    };

    const onCanvasPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (draggingRef.current) {
        finishDrag("restart");
      }

      const { x: globalX, y: globalY } = getGlobalFromPointerEvent(event);

      debugMove("canvas pointerdown", {
        x: globalX,
        y: globalY,
        pointerId: event.pointerId,
        eventTargetTag: (event.target as { tagName?: string })?.tagName,
        imageLayerCount: imageLayers.length,
      });

      const hitLayer = [...imageLayers]
        .sort((a, b) => b.zIndex - a.zIndex)
        .find((layer) => {
          if (!layer.visible) {
            return false;
          }

          const bounds = layer.sprite.getBounds();
          const withinX =
            globalX >= bounds.x && globalX <= bounds.x + bounds.width;
          const withinY =
            globalY >= bounds.y && globalY <= bounds.y + bounds.height;
          return withinX && withinY;
        });

      if (!hitLayer) {
        debugMove("hit-test miss");
        return;
      }

      debugMove("hit-test hit", {
        layerId: hitLayer.id,
        zIndex: hitLayer.zIndex,
      });

      // Selected-only dragging rule: click selects, second press-drag moves.
      if (hitLayer.id !== layerManager.target) {
        debugMove("selected-only: selecting layer, drag blocked this gesture", {
          selected: layerManager.target,
          clicked: hitLayer.id,
        });
        setLayerManager((draft) => {
          draft.target = hitLayer.id;
        });
        container.compositeNeeded = true;
        return;
      }

      event.preventDefault();
      startDrag(hitLayer, hitLayer.sprite, event, globalX, globalY);
    };

    debugMove("bind canvas pointerdown");
    canvasEl.addEventListener("pointerdown", onCanvasPointerDown);

    imageLayers.forEach((layer) => {
      const sprite = layer.sprite;
      previousCursorByLayerId.set(layer.id, sprite.cursor);
      sprite.eventMode = "static";
      sprite.cursor = layer.id === layerManager.target ? "grab" : "pointer";
    });

    return () => {
      debugMove("cleanup start");
      finishDrag("cleanup");
      canvasEl.removeEventListener("pointerdown", onCanvasPointerDown);
      lineRef.current?.clear();

      imageLayers.forEach((layer) => {
        const previousCursor = previousCursorByLayerId.get(layer.id);
        layer.sprite.cursor = previousCursor ?? "pointer";
      });

      container.eventMode = previousContainerEventMode;
      container.interactiveChildren = previousInteractiveChildren;
      container.compositeNeeded = true;
      debugMove("cleanup end");
    };
  }, [
    app,
    container,
    editMode,
    layerManager.layers,
    layerManager.target,
    setLayerManager,
  ]);

  return null;
};

export default MoveTool;
