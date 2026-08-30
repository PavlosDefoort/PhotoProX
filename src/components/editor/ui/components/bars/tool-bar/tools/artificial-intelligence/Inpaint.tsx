import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/hooks/useProject";
import { useCanvas } from "@/hooks/useCanvas";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { base64StringToTexture, setFullResolutionWorkingSource } from "@/utils/ImageUtils";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Graphics, Container } from "pixi.js";
import { fitImageToScreen } from "@/utils/CalcUtils";

interface SelectSamplerProps {
  sampler: string;
  setSampler: (sampler: string) => void;
}

const SelectSampler: React.FC<SelectSamplerProps> = ({
  sampler,
  setSampler,
}) => {
  return (
    <Select value={sampler} onValueChange={(value) => setSampler(value)}>
      <SelectTrigger className="w-[180px] bg-input dark:bg-input border-border dark:text-white">
        <SelectValue placeholder="Sampler" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Samplers</SelectLabel>
          <SelectSeparator />
          <SelectItem value="Euler">Euler</SelectItem>
          <SelectItem value="Euler a">Euler a</SelectItem>
          <SelectItem value="DPM++ 2M">DPM++ 2M</SelectItem>
          <SelectItem value="DPM++ 2M Karras">DPM++ 2M Karras</SelectItem>
          <SelectItem value="DPM++ SDE">DPM++ SDE</SelectItem>
          <SelectItem value="DPM++ SDE Karras">DPM++ SDE Karras</SelectItem>
          <SelectItem value="DDIM">DDIM</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const Inpaint: React.FC = () => {
  const {
    project,
    loading,
    layerManager,
    setLayerManager,
    setLoading,
    trigger,
    setTrigger,
    editMode,
    setEditMode,
    setLoadingTask,
    setLoadingProgress,
    setLoadingProgressText,
  } = useProject();

  const { app, container, canvas, setTargetZoom, targetPosition, currentZoom } =
    useCanvas();

  // Inpainting parameters
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [sampler, setSampler] = useState("Euler a");
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);
  const [seed, setSeed] = useState(-1);

  // Brush settings
  const [brushSize, setBrushSize] = useState(30);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  // State management
  const [hasDrawn, setHasDrawn] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Progress polling ref
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // History management - stores all iterations
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1); // -1 means original image

  // Mask graphics reference
  const maskGraphicsRef = useRef<Graphics | null>(null);
  const maskPreviewGraphicsRef = useRef<Graphics | null>(null);
  const cursorGraphicsRef = useRef<Graphics | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Store original view state for restoration
  const originalViewRef = useRef<{
    zoom: number;
    position: { x: number; y: number };
    targetId: string; // Track which target the view was fitted for
  } | null>(null);

  // Store original sprite rotation for restoration
  const originalRotationRef = useRef<{
    rotation: number;
    targetId: string;
  } | null>(null);

  // Track last viewport size to detect resize
  const lastViewportRef = useRef<{ width: number; height: number } | null>(
    null,
  );

  const target = findLayer(layerManager.layers, layerManager.target);

  // In inpaint mode, render container directly so the selected image is not clipped
  // by the project RenderTexture bounds.
  useEffect(() => {
    if (!container) {
      return;
    }

    if (editMode === "inpaint") {
      container.directRenderMode = true;
      container.renderable = true;
      container.mask = null;
      container.compositeNeeded = false;
      if (container.displaySprite) {
        container.displaySprite.visible = false;
      }
      return;
    }

    container.directRenderMode = false;
    container.renderable = false;
    if (container.children[1]) {
      container.mask = container.children[1] as Graphics;
    }
    if (container.displaySprite) {
      container.displaySprite.visible = true;
    }
    container.compositeNeeded = true;
  }, [container, editMode]);

  // Function to fit view to the target layer
  const fitViewToTarget = useCallback(() => {
    if (
      editMode !== "inpaint" ||
      !(target instanceof ImageLayer) ||
      !app.current ||
      !container
    ) {
      return;
    }

    const sprite = target.sprite;
    const renderer = app.current.renderer;

    // Calculate zoom to fit the layer's displayed size
    const layerWidth = sprite.width;
    const layerHeight = sprite.height;

    // Get viewport dimensions
    const viewportWidth = renderer.width;
    const viewportHeight = renderer.height;

    // Calculate zoom to fit the layer with some padding
    const padding = 0.9; // 90% of viewport
    const newZoom = fitImageToScreen(
      layerWidth,
      layerHeight,
      viewportWidth * padding,
      viewportHeight * padding,
      0,
    );

    // Center the view on the sprite position
    // Container pivot is at center of original dimensions
    // Sprite anchor is 0.5, so sprite.x/y is the center of the sprite
    const pivotX = container.originalWidth / 2;
    const pivotY = container.originalHeight / 2;

    const newX = viewportWidth / 2 - (sprite.x - pivotX) * newZoom;
    const newY = viewportHeight / 2 - (sprite.y - pivotY) * newZoom;

    targetPosition.current = { x: newX, y: newY };
    setTargetZoom(newZoom);
    // Let MovementLogic apply transform from target state to avoid jumpy swaps.
    container.compositeNeeded = true;

    // Update last viewport size
    lastViewportRef.current = { width: viewportWidth, height: viewportHeight };
  }, [editMode, target, app, container, setTargetZoom, targetPosition]);

  // Adjust view to fit selected layer when entering inpaint mode
  useEffect(() => {
    if (
      editMode === "inpaint" &&
      target instanceof ImageLayer &&
      app.current &&
      container
    ) {
      // Store original view state only once, or re-fit if target changed
      const needsViewFit =
        !originalViewRef.current ||
        originalViewRef.current.targetId !== target.id;

      if (needsViewFit) {
        // Only save original state the very first time
        if (!originalViewRef.current) {
          originalViewRef.current = {
            zoom: currentZoom,
            position: { ...targetPosition.current },
            targetId: target.id,
          };
        } else {
          // Update target ID but keep original view state
          originalViewRef.current.targetId = target.id;
        }

        // Switching target while inpainting should start with a fresh mask/history.
        if (maskGraphicsRef.current) {
          maskGraphicsRef.current.clear();
        }
        if (maskPreviewGraphicsRef.current) {
          maskPreviewGraphicsRef.current.clear();
        }
        setHasDrawn(false);
        setHasGenerated(false);
        setHistory([]);
        setHistoryIndex(-1);
        container.compositeNeeded = true;

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          fitViewToTarget();
        });
      }
    } else if (editMode !== "inpaint" && originalViewRef.current) {
      // Restore original view when exiting inpaint mode
      setTargetZoom(originalViewRef.current.zoom);
      targetPosition.current = { ...originalViewRef.current.position };
      originalViewRef.current = null;
      lastViewportRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, target, app, container, fitViewToTarget]);

  // Handle viewport resize while in inpaint mode
  useEffect(() => {
    if (editMode !== "inpaint" || !app.current) return;

    const handleResize = () => {
      if (!app.current) return;
      const renderer = app.current.renderer;
      const currentWidth = renderer.width;
      const currentHeight = renderer.height;

      // Check if viewport actually changed
      if (
        lastViewportRef.current &&
        (lastViewportRef.current.width !== currentWidth ||
          lastViewportRef.current.height !== currentHeight)
      ) {
        fitViewToTarget();
      }
    };

    // Listen for window resize
    window.addEventListener("resize", handleResize);

    // Also check periodically in case renderer resizes without window resize
    const resizeCheckInterval = setInterval(handleResize, 200);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(resizeCheckInterval);
    };
  }, [editMode, app, fitViewToTarget]);

  // Remove rotation when entering inpaint mode, restore when exiting
  useEffect(() => {
    if (editMode === "inpaint" && target instanceof ImageLayer) {
      const sprite = target.sprite;

      // Check if we need to restore a previous target's rotation first
      if (
        originalRotationRef.current &&
        originalRotationRef.current.targetId !== target.id
      ) {
        // Find the old layer and restore its rotation
        const oldLayer = findLayer(
          layerManager.layers,
          originalRotationRef.current.targetId,
        );
        if (oldLayer instanceof ImageLayer) {
          oldLayer.sprite.rotation = originalRotationRef.current.rotation;
        }
        originalRotationRef.current = null;
      }

      // Store and remove rotation for new target
      if (!originalRotationRef.current) {
        originalRotationRef.current = {
          rotation: sprite.rotation,
          targetId: target.id,
        };
        // Remove rotation for inpainting
        sprite.rotation = 0;
      }
    } else if (editMode !== "inpaint" && originalRotationRef.current) {
      // Restore rotation when exiting inpaint mode
      const oldLayer = findLayer(
        layerManager.layers,
        originalRotationRef.current.targetId,
      );
      if (oldLayer instanceof ImageLayer) {
        oldLayer.sprite.rotation = originalRotationRef.current.rotation;
      }
      originalRotationRef.current = null;
      if (container) {
        container.compositeNeeded = true;
      }
    }
  }, [editMode, target, layerManager.layers, container]);

  // Initialize mask graphics and cursor when entering inpaint mode
  useEffect(() => {
    if (
      editMode === "inpaint" &&
      container &&
      target instanceof ImageLayer &&
      app.current?.stage
    ) {
      const stage = app.current.stage;

      // Create mask graphics in document space (composited into RenderTexture)
      if (!maskGraphicsRef.current) {
        const maskGraphics = new Graphics();
        maskGraphics.alpha = 0.5;
        maskGraphics.zIndex = 999;
        container.addChild(maskGraphics);
        maskGraphicsRef.current = maskGraphics;
      }

      // Create visible paint preview on stage so strokes are always visible.
      if (!maskPreviewGraphicsRef.current) {
        const previewGraphics = new Graphics();
        previewGraphics.zIndex = 1500;
        previewGraphics.eventMode = "none";
        stage.addChild(previewGraphics);
        maskPreviewGraphicsRef.current = previewGraphics;
      } else if (maskPreviewGraphicsRef.current.parent !== stage) {
        maskPreviewGraphicsRef.current.removeFromParent();
        stage.addChild(maskPreviewGraphicsRef.current);
      }

      // Create cursor graphics on stage as an overlay (always visible)
      if (!cursorGraphicsRef.current) {
        const cursorGraphics = new Graphics();
        cursorGraphics.zIndex = 2000;
        cursorGraphics.eventMode = "none";
        stage.addChild(cursorGraphics);
        cursorGraphicsRef.current = cursorGraphics;
      } else if (
        cursorGraphicsRef.current &&
        cursorGraphicsRef.current.parent !== stage
      ) {
        cursorGraphicsRef.current.removeFromParent();
        stage.addChild(cursorGraphicsRef.current);
      }
    }

    return () => {
      if (maskGraphicsRef.current && container) {
        container.removeChild(maskGraphicsRef.current);
        maskGraphicsRef.current.destroy();
        maskGraphicsRef.current = null;
      }
      if (maskPreviewGraphicsRef.current) {
        maskPreviewGraphicsRef.current.removeFromParent();
        maskPreviewGraphicsRef.current.destroy();
        maskPreviewGraphicsRef.current = null;
      }
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.removeFromParent();
        cursorGraphicsRef.current.destroy();
        cursorGraphicsRef.current = null;
      }
    };
  }, [editMode, container, target, app]);

  // Set up drawing events
  useEffect(() => {
    if (
      editMode !== "inpaint" ||
      !container ||
      !maskGraphicsRef.current ||
      !maskPreviewGraphicsRef.current ||
      !app.current
    ) {
      return;
    }

    const maskGraphics = maskGraphicsRef.current;
    const maskPreviewGraphics = maskPreviewGraphicsRef.current;
    const stage = app.current.stage;
    const canvasEl = app.current.canvas as HTMLCanvasElement | null;

    if (!canvasEl) {
      return;
    }

    const previousContainerCursor = container.cursor;
    const previousContainerEventMode = container.eventMode;
    const previousStageCursor = stage.cursor;
    const previousStageEventMode = stage.eventMode;
    const previousStageHitArea = stage.hitArea;
    const previousCanvasCursor = canvasEl.style.cursor;
    const previousWrapperCanvasCursor = canvas.current?.style.cursor;

    const previousChildCursors = new Map<any, string | undefined>();
    container.children.forEach((child: any) => {
      if (child.cursor !== undefined) {
        previousChildCursors.set(child, child.cursor);
      }
    });

    const requestPreviewComposite = () => {
      container.compositeNeeded = true;
    };

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

    const getGlobalFromClient = (clientX: number, clientY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      const x =
        ((clientX - rect.left) / rect.width) * app.current!.renderer.width;
      const y =
        ((clientY - rect.top) / rect.height) * app.current!.renderer.height;
      return { x, y };
    };

    const toContainerLocal = (globalX: number, globalY: number) => {
      return {
        x: (globalX - container.x) / container.scale.x + container.pivot.x,
        y: (globalY - container.y) / container.scale.y + container.pivot.y,
      };
    };

    const toStagePoint = (localX: number, localY: number) => {
      return {
        x: container.x + (localX - container.pivot.x) * container.scale.x,
        y: container.y + (localY - container.pivot.y) * container.scale.y,
      };
    };

    const isPointerInsideCanvas = (event: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    };

    const isClientInsideCanvas = (clientX: number, clientY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    };

    const drawCircle = (x: number, y: number) => {
      maskGraphics.circle(x, y, brushSize / 2);
      maskGraphics.fill({ color: 0xffffff }); // White color for A1111 mask (alpha makes it visible as gray)

      const stagePoint = toStagePoint(x, y);
      const radius = Math.max(1, (brushSize / 2) * Math.abs(container.scale.x));
      maskPreviewGraphics.circle(stagePoint.x, stagePoint.y, radius);
      maskPreviewGraphics.fill({ color: 0xffffff, alpha: 0.5 });
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      // Draw circles along the line for smooth strokes
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const steps = Math.max(1, Math.ceil(dist / (brushSize / 4)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        drawCircle(x, y);
      }
    };

    const beginStroke = (
      event: PointerEvent,
      localPos: { x: number; y: number },
    ) => {
      isDrawingRef.current = true;
      activePointerIdRef.current = event.pointerId;
      drawCircle(localPos.x, localPos.y);
      lastPosRef.current = { x: localPos.x, y: localPos.y };
      setHasDrawn(true);
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.visible = true;
      }
      requestPreviewComposite();
    };

    const beginStrokeFromClient = (
      clientX: number,
      clientY: number,
      pointerId: number,
    ) => {
      const { x: globalX, y: globalY } = getGlobalFromClient(clientX, clientY);
      const localPos = toContainerLocal(globalX, globalY);

      isDrawingRef.current = true;
      activePointerIdRef.current = pointerId;
      drawCircle(localPos.x, localPos.y);
      lastPosRef.current = { x: localPos.x, y: localPos.y };
      setHasDrawn(true);
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.visible = true;
      }
      requestPreviewComposite();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType !== "touch") {
        return;
      }

      if (!isPointerInsideCanvas(event)) {
        return;
      }

      if (activePointerIdRef.current !== null) {
        return;
      }

      event.preventDefault();
      const { x: globalX, y: globalY } = getGlobalFromPointerEvent(event);
      const localPos = toContainerLocal(globalX, globalY);
      beginStroke(event, localPos);
    };

    const updateCursor = (x: number, y: number) => {
      if (!cursorGraphicsRef.current) return;
      const cursor = cursorGraphicsRef.current;
      const stagePoint = toStagePoint(x, y);
      const radius = Math.max(2, (brushSize / 2) * Math.abs(container.scale.x));

      if (cursor.parent === stage) {
        stage.setChildIndex(cursor, stage.children.length - 1);
      }

      cursor.clear();
      cursor.circle(stagePoint.x, stagePoint.y, radius);
      cursor.stroke({ color: 0x000000, width: 2 });
      cursor.circle(stagePoint.x, stagePoint.y, radius);
      cursor.stroke({ color: 0xffffff, width: 1 });
    };

    const onPointerMove = (event: PointerEvent) => {
      const { x: globalX, y: globalY } = getGlobalFromPointerEvent(event);
      const localPos = toContainerLocal(globalX, globalY);
      const isInsideCanvas = isPointerInsideCanvas(event);
      const primaryButtonPressed = (event.buttons & 1) === 1;

      // Always update cursor position
      updateCursor(localPos.x, localPos.y);
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.visible =
          isInsideCanvas || activePointerIdRef.current === event.pointerId;
      }

      // Fallback: if pointerdown was missed, begin stroke from move while pressed.
      if (
        !isDrawingRef.current &&
        activePointerIdRef.current === null &&
        primaryButtonPressed &&
        isInsideCanvas
      ) {
        beginStroke(event, localPos);
      }

      if (!isDrawingRef.current) return;

      if (
        activePointerIdRef.current !== null &&
        activePointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();

      if (lastPosRef.current) {
        drawLine(
          lastPosRef.current.x,
          lastPosRef.current.y,
          localPos.x,
          localPos.y,
        );
      } else {
        drawCircle(localPos.x, localPos.y);
      }

      lastPosRef.current = { x: localPos.x, y: localPos.y };
      requestPreviewComposite();
    };

    const onPointerUp = (event?: PointerEvent) => {
      if (
        event &&
        activePointerIdRef.current !== null &&
        activePointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      lastPosRef.current = null;
      requestPreviewComposite();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      if (!isClientInsideCanvas(event.clientX, event.clientY)) {
        return;
      }

      if (activePointerIdRef.current !== null) {
        return;
      }

      event.preventDefault();
      beginStrokeFromClient(event.clientX, event.clientY, -1);
    };

    const onMouseMove = (event: MouseEvent) => {
      const { x: globalX, y: globalY } = getGlobalFromClient(
        event.clientX,
        event.clientY,
      );
      const localPos = toContainerLocal(globalX, globalY);
      const isInsideCanvas = isClientInsideCanvas(event.clientX, event.clientY);
      const primaryButtonPressed = (event.buttons & 1) === 1;

      updateCursor(localPos.x, localPos.y);
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.visible =
          isInsideCanvas || isDrawingRef.current;
      }

      if (
        !isDrawingRef.current &&
        activePointerIdRef.current === null &&
        primaryButtonPressed &&
        isInsideCanvas
      ) {
        beginStrokeFromClient(event.clientX, event.clientY, -1);
      }

      if (!isDrawingRef.current) {
        return;
      }

      if (
        activePointerIdRef.current !== null &&
        activePointerIdRef.current !== -1
      ) {
        return;
      }

      if (lastPosRef.current) {
        drawLine(
          lastPosRef.current.x,
          lastPosRef.current.y,
          localPos.x,
          localPos.y,
        );
      } else {
        drawCircle(localPos.x, localPos.y);
      }

      lastPosRef.current = { x: localPos.x, y: localPos.y };
      requestPreviewComposite();
    };

    const onMouseUp = () => {
      if (
        activePointerIdRef.current !== -1 &&
        activePointerIdRef.current !== null
      ) {
        return;
      }

      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      lastPosRef.current = null;
      requestPreviewComposite();
    };

    container.eventMode = "static";
    container.cursor = "none";

    // Hide cursor on the target sprite (sprites have cursor: "pointer" by default)
    let originalSpriteCursor: string | undefined;
    if (target instanceof ImageLayer) {
      originalSpriteCursor = target.sprite.cursor;
      target.sprite.cursor = "none";
    }

    // Hide default cursor on all interactive children.
    container.children.forEach((child: any) => {
      if (child.cursor !== undefined) {
        child.cursor = "none";
      }
    });

    // Hide stage pointer so only brush ring is visible.
    stage.eventMode = "static";
    stage.cursor = "none";
    stage.hitArea = app.current.screen;

    // Hide native cursor on canvas surfaces.
    if (app.current?.canvas) {
      (app.current.canvas as HTMLCanvasElement).style.cursor = "none";
    }
    if (canvas.current) {
      canvas.current.style.cursor = "none";
    }

    const onCanvasPointerLeave = () => {
      if (cursorGraphicsRef.current && !isDrawingRef.current) {
        cursorGraphicsRef.current.visible = false;
      }
    };

    if (cursorGraphicsRef.current) {
      cursorGraphicsRef.current.visible = false;
    }

    window.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("pointerleave", onCanvasPointerLeave);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      lastPosRef.current = null;

      window.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointerleave", onCanvasPointerLeave);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      container.cursor = previousContainerCursor;
      container.eventMode = previousContainerEventMode;

      // Restore cursor on the target sprite
      if (target instanceof ImageLayer && originalSpriteCursor !== undefined) {
        target.sprite.cursor = originalSpriteCursor;
      }

      // Restore cursor on all children in container
      previousChildCursors.forEach((previousCursor, child) => {
        if (child.cursor !== undefined) {
          child.cursor = previousCursor;
        }
      });

      // Restore cursor and interaction state on stage
      stage.cursor = previousStageCursor;
      stage.eventMode = previousStageEventMode;
      stage.hitArea = previousStageHitArea;

      // Restore cursor on canvas elements
      canvasEl.style.cursor = previousCanvasCursor;
      if (canvas.current) {
        canvas.current.style.cursor = previousWrapperCanvasCursor ?? "";
      }

      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.clear();
        cursorGraphicsRef.current.visible = false;
      }

      requestPreviewComposite();
    };
  }, [editMode, container, brushSize, app, canvas, target]);

  // Get current image source based on history index
  const getCurrentImageSrc = useCallback(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      return history[historyIndex];
    }
    // Return original image
    if (target instanceof ImageLayer) {
      return target.imageData.src;
    }
    return null;
  }, [historyIndex, history, target]);

  // Reset state when exiting inpaint mode
  useEffect(() => {
    if (editMode !== "inpaint") {
      setPrompt("");
      setNegativePrompt("");
      setHasDrawn(false);
      setHasGenerated(false);
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [editMode]);

  const clearMask = useCallback(() => {
    if (maskGraphicsRef.current) {
      maskGraphicsRef.current.clear();
      setHasDrawn(false);
    }
    if (maskPreviewGraphicsRef.current) {
      maskPreviewGraphicsRef.current.clear();
    }
    if (container) {
      container.compositeNeeded = true;
    }
  }, [container]);

  const normalizeImageDimensions = useCallback(
    async (
      src: string,
      targetWidth: number,
      targetHeight: number,
      backgroundSrc?: string,
    ): Promise<string> => {
      const loadImage = (imageSrc: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Failed to load image"));
          image.src = imageSrc;
        });
      };

      try {
        const image = await loadImage(src);
        if (image.width === targetWidth && image.height === targetHeight) {
          return src;
        }

        const resizeCanvas = document.createElement("canvas");
        resizeCanvas.width = targetWidth;
        resizeCanvas.height = targetHeight;

        const context = resizeCanvas.getContext("2d");
        if (!context) {
          return src;
        }

        context.clearRect(0, 0, targetWidth, targetHeight);

        // Keep missing edge pixels from the pre-inpaint image rather than
        // globally resampling the result (which softens the whole image).
        if (backgroundSrc) {
          try {
            const backgroundImage = await loadImage(backgroundSrc);
            context.drawImage(backgroundImage, 0, 0, targetWidth, targetHeight);
          } catch {
            // If fallback source fails, continue with transparent background.
          }
        }

        const drawWidth = Math.min(image.width, targetWidth);
        const drawHeight = Math.min(image.height, targetHeight);
        const sourceX = Math.max(0, Math.floor((image.width - drawWidth) / 2));
        const sourceY = Math.max(
          0,
          Math.floor((image.height - drawHeight) / 2),
        );
        const destX = Math.max(0, Math.floor((targetWidth - drawWidth) / 2));
        const destY = Math.max(0, Math.floor((targetHeight - drawHeight) / 2));

        context.imageSmoothingEnabled = false;
        context.drawImage(
          image,
          sourceX,
          sourceY,
          drawWidth,
          drawHeight,
          destX,
          destY,
          drawWidth,
          drawHeight,
        );

        return resizeCanvas.toDataURL("image/png");
      } catch {
        return src;
      }
    },
    [],
  );

  const applyImageToTargetSprite = useCallback(
    async (src: string) => {
      if (!(target instanceof ImageLayer)) {
        return;
      }

      const sprite = target.sprite;
      const previousWidth = Math.abs(sprite.width);
      const previousHeight = Math.abs(sprite.height);
      const previousScaleX = sprite.scale.x;
      const previousScaleY = sprite.scale.y;
      const previousPositionX = sprite.position.x;
      const previousPositionY = sprite.position.y;
      const previousRotation = sprite.rotation;
      const previousSkewX = sprite.skew.x;
      const previousSkewY = sprite.skew.y;
      const texture = await base64StringToTexture(src);

      sprite.texture = texture;

      // Restore the exact transform first.
      sprite.scale.set(previousScaleX, previousScaleY);
      sprite.position.set(previousPositionX, previousPositionY);
      sprite.rotation = previousRotation;
      sprite.skew.set(previousSkewX, previousSkewY);

      // If source dimensions still differ, force displayed bounds to match exactly.
      const nextWidth = Math.abs(sprite.width);
      const nextHeight = Math.abs(sprite.height);

      if (nextWidth > 0 && Math.abs(nextWidth - previousWidth) > 0.0001) {
        const widthCorrection = previousWidth / nextWidth;
        sprite.scale.x *= widthCorrection;
      }

      if (nextHeight > 0 && Math.abs(nextHeight - previousHeight) > 0.0001) {
        const heightCorrection = previousHeight / nextHeight;
        sprite.scale.y *= heightCorrection;
      }

      if (container) {
        container.compositeNeeded = true;
      }
    },
    [container, target],
  );

  const getMaskAsBase64 = useCallback(async (): Promise<string | null> => {
    if (!app.current || !maskGraphicsRef.current || !target) return null;
    if (!(target instanceof ImageLayer)) return null;

    const renderer = app.current.renderer;
    const maskGraphics = maskGraphicsRef.current;

    // Get the layer's position and scale in container coordinates
    const sprite = target.sprite;
    const layerX = sprite.x;
    const layerY = sprite.y;
    const layerScaleX = sprite.scale.x;
    const layerScaleY = sprite.scale.y;

    // Original image dimensions (what we're sending to A1111)
    const imgWidth = target.imageData.imageWidth;
    const imgHeight = target.imageData.imageHeight;

    try {
      // Create container for mask extraction at original image size
      const maskOnlyContainer = new Container();

      // Black background (areas NOT to inpaint)
      const bg = new Graphics();
      bg.rect(0, 0, imgWidth, imgHeight);
      bg.fill({ color: 0x000000 });
      maskOnlyContainer.addChild(bg);

      // Clone the mask and transform it to match the original image coordinates
      // The mask was drawn in container space, we need to transform it to image space
      maskGraphics.alpha = 1;

      // Remove mask from container temporarily
      if (container) {
        container.removeChild(maskGraphics);
      }

      // Transform mask from container coords to image coords
      // Sprite anchor is 0.5, so sprite.x/y is the CENTER of the image
      // After scaling by 1/scale, we need to offset so the sprite center maps to image center
      // imageCoord = (containerCoord / scale) + offset
      // where offset = imgSize/2 - spritePos/scale
      maskGraphics.x = imgWidth / 2 - layerX / layerScaleX;
      maskGraphics.y = imgHeight / 2 - layerY / layerScaleY;
      maskGraphics.scale.set(1 / layerScaleX, 1 / layerScaleY);

      maskOnlyContainer.addChild(maskGraphics);

      const base64 = await renderer.extract.base64({
        target: maskOnlyContainer,
        format: "png",
        resolution: 1,
      });

      // Restore mask position/scale and alpha
      maskGraphics.x = 0;
      maskGraphics.y = 0;
      maskGraphics.scale.set(1, 1);
      maskGraphics.alpha = 0.5;

      // Re-add mask to main container
      maskOnlyContainer.removeChild(maskGraphics);
      if (container) {
        container.addChild(maskGraphics);
      }

      bg.destroy();
      maskOnlyContainer.destroy();

      return base64;
    } catch (error) {
      console.error("Error extracting mask:", error);
      // Restore mask state in case of error
      maskGraphics.x = 0;
      maskGraphics.y = 0;
      maskGraphics.scale.set(1, 1);
      maskGraphics.alpha = 0.5;
      if (container && maskGraphics.parent !== container) {
        container.addChild(maskGraphics);
      }
      return null;
    }
  }, [app, container, target]);

  const saveResult = async () => {
    setEditMode("move");
    const currentSrc = getCurrentImageSrc();
    if (currentSrc && target instanceof ImageLayer && historyIndex >= 0) {
      setLayerManager((draft) => {
        draft.layers = draft.layers.map((layer) => {
          if (layer.id === target.id) {
            const imageLayer = layer as ImageLayer;
            setFullResolutionWorkingSource(
              imageLayer,
              currentSrc,
              target.imageData.imageWidth,
              target.imageData.imageHeight,
            );
          }
          return layer;
        });
      });
    }
  };

  const goToHistoryIndex = async (index: number) => {
    if (!target || !(target instanceof ImageLayer)) return;

    setHistoryIndex(index);

    let newSrc: string;
    if (index >= 0 && index < history.length) {
      newSrc = history[index];
    } else {
      // Go back to original
      newSrc = target.imageData.src;
    }

    await applyImageToTargetSprite(newSrc);
    setTrigger(!trigger);
  };

  const goToPrevious = async () => {
    const newIndex = historyIndex - 1;
    if (newIndex >= -1) {
      await goToHistoryIndex(newIndex);
    }
  };

  const goToNext = async () => {
    const newIndex = historyIndex + 1;
    if (newIndex < history.length) {
      await goToHistoryIndex(newIndex);
    }
  };

  const revertToOriginal = async () => {
    await goToHistoryIndex(-1);
    setHasGenerated(false);
    clearMask();
  };

  const startProgressPolling = useCallback(() => {
    setLoadingProgress(0);
    setLoadingProgressText("Starting...");

    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("/api/inpaint-progress");
        if (response.ok) {
          const data = await response.json();
          const progressPercent = Math.round((data.progress || 0) * 100);
          setLoadingProgress(progressPercent);
          if (data.textinfo) {
            setLoadingProgressText(data.textinfo);
          } else if (data.progress > 0) {
            const eta = data.eta ? `~${Math.round(data.eta)}s remaining` : "";
            setLoadingProgressText(`${progressPercent}% ${eta}`);
          }
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 500);
  }, [setLoadingProgress, setLoadingProgressText]);

  const stopProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setLoadingProgress(0);
    setLoadingProgressText("");
  }, [setLoadingProgress, setLoadingProgressText]);

  const callInpaint = async () => {
    if (!target || !(target instanceof ImageLayer)) return;
    if (!hasDrawn) {
      alert("Please draw a mask first");
      return;
    }

    const initImageSource = getCurrentImageSrc() || target.imageData.src;

    setLoading(true);
    setLoadingTask("inpainting");
    startProgressPolling();

    try {
      const maskBase64 = await getMaskAsBase64();
      if (!maskBase64) {
        throw new Error("Failed to generate mask");
      }

      const response = await fetch("/api/inpaint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          // Use current history position (could be previous generation or original)
          init_images: [initImageSource],
          mask: maskBase64,
          width: target.imageData.imageWidth,
          height: target.imageData.imageHeight,
          steps,
          cfg_scale: cfgScale,
          denoising_strength: denoisingStrength,
          sampler_name: sampler,
          seed,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to inpaint");
      }

      const data = await response.json();
      console.log("Inpaint response received:", {
        hasImages: !!data.images,
        imageCount: data.images?.length,
        firstImageLength: data.images?.[0]?.length,
        info: data.info,
      });

      if (data.images && data.images.length > 0) {
        console.log("Applying new texture to sprite...");

        const normalizedImage = await normalizeImageDimensions(
          data.images[0],
          target.imageData.imageWidth,
          target.imageData.imageHeight,
          initImageSource,
        );

        await applyImageToTargetSprite(normalizedImage);

        // Add to history - truncate any "future" history if we're not at the end
        const newHistory = [
          ...history.slice(0, historyIndex + 1),
          normalizedImage,
        ];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        setHasGenerated(true);
        clearMask();
        console.log("Inpaint complete! History length:", newHistory.length);
      } else {
        console.warn("No images in response");
      }
    } catch (error) {
      console.error("Inpainting error:", error);
      alert("Failed to inpaint: " + (error as Error).message);
    } finally {
      stopProgressPolling();
      setLoadingTask("regular");
      setLoading(false);
      setTrigger(!trigger);
    }
  };

  return (
    <Sheet modal={false} open={editMode === "inpaint"}>
      <SheetContent
        side={"left"}
        className="h-full top-10 w-80 border-r-2 border-[#cdcdcd] dark:border-[#252525] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Inpaint</SheetTitle>
          <SheetDescription>
            Draw a mask over the area you want to modify, then describe what you
            want.
          </SheetDescription>
        </SheetHeader>
        <SelectSeparator className="m-3" />

        <div className="flex flex-col space-y-5 mt-5 items-start">
          {/* Brush Settings */}
          <div className="flex flex-col space-y-2 w-full">
            <Label>Brush Size: {brushSize}px</Label>
            <Slider
              value={[brushSize]}
              onValueChange={(v) => setBrushSize(v[0])}
              min={5}
              max={100}
              step={1}
              className="w-full"
            />
            <Button
              variant="outline"
              onClick={clearMask}
              disabled={!hasDrawn}
              className="w-full"
            >
              Clear Mask
            </Button>
          </div>

          <SelectSeparator className="w-full" />

          {/* Prompt Settings */}
          <div className="flex flex-col space-y-2 w-full">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="Describe what to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-input dark:bg-input border-border"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label htmlFor="negative-prompt">Negative Prompt</Label>
            <Input
              id="negative-prompt"
              placeholder="What to avoid..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="bg-input dark:bg-input border-border"
            />
          </div>

          <SelectSeparator className="w-full" />

          {/* Generation Settings */}
          <div className="flex flex-col space-y-2 w-full">
            <div className="flex flex-row space-x-2 items-center">
              <Label>Sampler</Label>
              <div className="flex flex-row items-center space-x-1">
                <InfoCircledIcon className="text-xs cursor-pointer text-muted-foreground" />
                <Link
                  href="https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#sampling-method-selection"
                  target="_blank"
                >
                  <p className="text-muted-foreground text-xs">Learn more</p>
                </Link>
              </div>
            </div>
            <SelectSampler sampler={sampler} setSampler={setSampler} />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label>Steps: {steps}</Label>
            <Slider
              value={[steps]}
              onValueChange={(v) => setSteps(v[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label>CFG Scale: {cfgScale}</Label>
            <Slider
              value={[cfgScale]}
              onValueChange={(v) => setCfgScale(v[0])}
              min={1}
              max={20}
              step={0.5}
              className="w-full"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label>Denoising Strength: {denoisingStrength.toFixed(2)}</Label>
            <Slider
              value={[denoisingStrength]}
              onValueChange={(v) => setDenoisingStrength(v[0])}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label htmlFor="seed">Seed (-1 for random)</Label>
            <Input
              id="seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
              className="bg-input dark:bg-input border-border"
            />
          </div>

          <SelectSeparator className="w-full" />

          {/* History Navigation */}
          {history.length > 0 && (
            <div className="flex flex-col space-y-2 w-full">
              <Label>
                History:{" "}
                {historyIndex === -1
                  ? "Original"
                  : `${historyIndex + 1} of ${history.length}`}
              </Label>
              <div className="flex flex-row space-x-2 w-full">
                <Button
                  onClick={goToPrevious}
                  disabled={historyIndex === -1}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  ← Prev
                </Button>
                <Button
                  onClick={goToNext}
                  disabled={historyIndex >= history.length - 1}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Next →
                </Button>
              </div>
              <Button
                onClick={revertToOriginal}
                disabled={historyIndex === -1}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Revert to Original
              </Button>
            </div>
          )}

          <SelectSeparator className="w-full" />

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 w-full">
            <Button
              onClick={callInpaint}
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 w-full"
              disabled={!hasDrawn || loading}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>

          <SheetFooter className="w-full">
            <SheetClose asChild>
              <Button
                variant="ghost"
                type="submit"
                onClick={saveResult}
                className="w-full text-muted-foreground bg-black text-white"
              >
                Save Current & Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Inpaint;
