import { Button } from "@/components/ui/button";
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
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { base64StringToTexture } from "@/utils/ImageUtils";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import {
  CanvasSource,
  FederatedPointerEvent,
  Graphics,
  Point,
  Texture,
} from "pixi.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const REMBG_MODELS = [
  "isnet-general-use",
  "u2net",
  "u2net_human_seg",
  "u2net_cloth_seg",
  "silueta",
  "isnet-anime",
] as const;

type RembgModel = (typeof REMBG_MODELS)[number];
type PreviewMode = "before" | "after";
type BrushMode = "remove" | "repair";

interface SelectModelProps {
  model: RembgModel;
  setModel: (model: RembgModel) => void;
}

const SelectModel: React.FC<SelectModelProps> = ({ model, setModel }) => {
  return (
    <Select
      value={model}
      onValueChange={(value) => setModel(value as RembgModel)}
    >
      <SelectTrigger className="w-[180px] bg-input dark:bg-input border-border dark:text-white">
        <SelectValue placeholder="Models" />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          <SelectLabel>Models</SelectLabel>
          <SelectSeparator />
          {REMBG_MODELS.map((rembgModel) => (
            <SelectItem key={rembgModel} value={rembgModel}>
              {rembgModel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const BackgroundRemover: React.FC = () => {
  const {
    loading,
    layerManager,
    setLayerManager,
    setLoading,
    trigger,
    setTrigger,
    editMode,
    setEditMode,
  } = useProject();
  const { container, app } = useCanvas();
  const [model, setModel] = useState<RembgModel>("isnet-anime");
  const [originalSrc, setOriginalSrc] = useState("");
  const [resultSrc, setResultSrc] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("before");
  const [brushMode, setBrushMode] = useState<BrushMode>("remove");
  const [brushSize, setBrushSize] = useState(28);

  const target = findLayer(layerManager.layers, layerManager.target);
  const hasResult = resultSrc.length > 0;
  const canRun = target instanceof ImageLayer && !loading;
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workingTextureRef = useRef<Texture | null>(null);
  const isPaintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const liveSwapRafRef = useRef<number | null>(null);
  const brushCursorRef = useRef<Graphics | null>(null);

  const createWorkingTextureFromCanvas = useCallback(
    (canvas: HTMLCanvasElement): Texture => {
      const source = new CanvasSource({
        resource: canvas,
        width: canvas.width,
        height: canvas.height,
        antialias: true,
        autoDensity: true,
        scaleMode: "linear",
        mipmapFilter: "linear",
      });

      return new Texture(source);
    },
    [],
  );

  const loadCanvasFromSource = useCallback(async (src: string) => {
    const image = new Image();
    image.src = src;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Failed to load image for brush editing"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to initialize brush canvas context");
    }

    context.drawImage(image, 0, 0);
    return canvas;
  }, []);

  const updateWorkingTexture = useCallback(() => {
    if (!(target instanceof ImageLayer)) {
      return;
    }

    const workingCanvas = workingCanvasRef.current;
    if (!workingCanvas) {
      return;
    }

    const texture = workingTextureRef.current;
    if (!texture) {
      workingTextureRef.current = createWorkingTextureFromCanvas(workingCanvas);
      target.sprite.texture = workingTextureRef.current;
      setPreviewMode("after");
      app.current?.render();
      return;
    }

    // Keep the sprite bound to the mutable working texture while brushing.
    target.sprite.texture = texture;

    // PixiJS v8: CanvasSource has update() method on the source
    const textureSource = texture.source as CanvasSource;
    if (textureSource && typeof textureSource.update === "function") {
      textureSource.update();
      app.current?.render();
      return;
    }

    // Fallback: recreate texture if source update unavailable
    const oldTexture = workingTextureRef.current;
    workingTextureRef.current = createWorkingTextureFromCanvas(workingCanvas);
    target.sprite.texture = workingTextureRef.current;
    if (oldTexture) {
      oldTexture.destroy(true);
    }
    setPreviewMode("after");
    app.current?.render();
  }, [app, createWorkingTextureFromCanvas, target]);

  const scheduleLiveCanvasSwap = useCallback(() => {
    if (liveSwapRafRef.current !== null) {
      return;
    }

    liveSwapRafRef.current = requestAnimationFrame(() => {
      liveSwapRafRef.current = null;

      if (!(target instanceof ImageLayer)) {
        return;
      }

      const workingCanvas = workingCanvasRef.current;
      if (!workingCanvas) {
        return;
      }

      // Destroy the previous texture to free GPU memory, then create a fresh
      // one from the painted canvas.  The RAF guard ensures at most one
      // create+destroy cycle per frame, so GPU memory stays constant.
      const old = workingTextureRef.current;
      const liveTexture = createWorkingTextureFromCanvas(workingCanvas);
      workingTextureRef.current = liveTexture;
      target.sprite.texture = liveTexture;
      if (old) {
        old.destroy(true);
      }
      setPreviewMode("after");
      app.current?.render();
    });
  }, [app, createWorkingTextureFromCanvas, target]);

  const applyWorkingCanvasTexture = useCallback(() => {
    if (!(target instanceof ImageLayer)) {
      return;
    }

    const workingCanvas = workingCanvasRef.current;
    if (!workingCanvas) {
      return;
    }

    if (!workingTextureRef.current) {
      workingTextureRef.current = createWorkingTextureFromCanvas(workingCanvas);
    }

    target.sprite.texture = workingTextureRef.current;
    updateWorkingTexture();
  }, [createWorkingTextureFromCanvas, target, updateWorkingTexture]);

  const persistWorkingResult = useCallback(() => {
    const workingCanvas = workingCanvasRef.current;
    if (!workingCanvas) {
      return undefined;
    }

    const dataUrl = workingCanvas.toDataURL("image/png");
    setResultSrc(dataUrl);
    setPreviewMode("after");
    return dataUrl;
  }, []);

  const prepareBrushCanvases = useCallback(async () => {
    if (!originalSrc || !resultSrc) {
      return;
    }

    try {
      const [originalCanvas, resultCanvas] = await Promise.all([
        loadCanvasFromSource(originalSrc),
        loadCanvasFromSource(resultSrc),
      ]);

      originalCanvasRef.current = originalCanvas;
      workingCanvasRef.current = resultCanvas;
      applyWorkingCanvasTexture();
    } catch (error) {
      console.error(error);
      toast.error("Unable to initialize brush editing for this image.");
    }
  }, [applyWorkingCanvasTexture, loadCanvasFromSource, originalSrc, resultSrc]);

  const getCanvasPointFromEvent = useCallback(
    (event: FederatedPointerEvent) => {
      if (!(target instanceof ImageLayer)) {
        return null;
      }

      const workingCanvas = workingCanvasRef.current;
      if (!workingCanvas) {
        return null;
      }

      const local = target.sprite.worldTransform.applyInverse(
        event.global,
        new Point(),
      );

      const normX = local.x / target.sprite.width + target.sprite.anchor.x;
      const normY = local.y / target.sprite.height + target.sprite.anchor.y;

      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
        return null;
      }

      return {
        x: Math.round(normX * workingCanvas.width),
        y: Math.round(normY * workingCanvas.height),
      };
    },
    [target],
  );

  const paintCircle = useCallback(
    (x: number, y: number) => {
      const workingCanvas = workingCanvasRef.current;
      if (!workingCanvas) {
        return;
      }

      const context = workingCanvas.getContext("2d");
      if (!context) {
        return;
      }

      const brushRadius = Math.max(1, brushSize / 2);

      context.save();
      context.beginPath();
      context.arc(x, y, brushRadius, 0, Math.PI * 2);
      context.closePath();
      context.clip();

      if (brushMode === "remove") {
        context.globalCompositeOperation = "destination-out";
        context.fillStyle = "rgba(0, 0, 0, 1)";
        context.fillRect(
          x - brushRadius,
          y - brushRadius,
          brushRadius * 2,
          brushRadius * 2,
        );
      } else {
        const originalCanvas = originalCanvasRef.current;
        if (originalCanvas) {
          context.globalCompositeOperation = "source-over";
          context.drawImage(
            originalCanvas,
            x - brushRadius,
            y - brushRadius,
            brushRadius * 2,
            brushRadius * 2,
            x - brushRadius,
            y - brushRadius,
            brushRadius * 2,
            brushRadius * 2,
          );
        }
      }

      context.restore();
    },
    [brushMode, brushSize],
  );

  const paintStroke = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, brushSize / 3)));

      for (let index = 0; index <= steps; index++) {
        const t = index / steps;
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        paintCircle(x, y);
      }

      // Use scheduleLiveCanvasSwap for smooth visual updates during painting.
      // It creates a fresh texture from the modified canvas on each animation frame.
      scheduleLiveCanvasSwap();
    },
    [brushSize, paintCircle, scheduleLiveCanvasSwap],
  );

  useEffect(() => {
    if (editMode === "rembg" && target instanceof ImageLayer) {
      setOriginalSrc(target.imageData.src);
      setResultSrc("");
      setPreviewMode("before");
      setBrushMode("remove");
      setBrushSize(28);
      originalCanvasRef.current = null;
      workingCanvasRef.current = null;
      workingTextureRef.current = null;
      if (liveSwapRafRef.current !== null) {
        cancelAnimationFrame(liveSwapRafRef.current);
        liveSwapRafRef.current = null;
      }
      isPaintingRef.current = false;
      lastPointRef.current = null;
    }

    if (editMode !== "rembg") {
      setModel("isnet-anime");
      setOriginalSrc("");
      setResultSrc("");
      setPreviewMode("before");
      setBrushMode("remove");
      setBrushSize(28);
      originalCanvasRef.current = null;
      workingCanvasRef.current = null;
      workingTextureRef.current = null;
      if (liveSwapRafRef.current !== null) {
        cancelAnimationFrame(liveSwapRafRef.current);
        liveSwapRafRef.current = null;
      }
      isPaintingRef.current = false;
      lastPointRef.current = null;
    }
  }, [editMode, target]);

  useEffect(() => {
    if (editMode !== "rembg" || !hasResult) {
      return;
    }

    if (originalCanvasRef.current && workingCanvasRef.current) {
      return;
    }

    void prepareBrushCanvases();
  }, [editMode, hasResult, prepareBrushCanvases]);

  useEffect(() => {
    if (
      editMode !== "rembg" ||
      !hasResult ||
      !(target instanceof ImageLayer) ||
      !container
    ) {
      return;
    }

    const sprite = target.sprite;
    const originalCursor = sprite.cursor;

    const onPointerDown = (event: FederatedPointerEvent) => {
      const point = getCanvasPointFromEvent(event);
      if (!point) {
        return;
      }

      applyWorkingCanvasTexture();
      isPaintingRef.current = true;
      lastPointRef.current = point;
      paintStroke(point, point);
      setPreviewMode("after");
    };

    const onPointerUp = () => {
      isPaintingRef.current = false;
      lastPointRef.current = null;
      // Persist the current working canvas state to resultSrc for undo/preview.
      // The working texture is already showing the correct result on canvas.
      persistWorkingResult();
    };

    // Create brush cursor circle
    const brushCursor = new Graphics();
    brushCursorRef.current = brushCursor;
    brushCursor.visible = false;
    brushCursor.eventMode = "none";
    brushCursor.interactiveChildren = false;
    app.current?.stage.addChild(brushCursor);

    const drawBrushCursor = (globalX: number, globalY: number) => {
      if (!brushCursor || !(target instanceof ImageLayer)) {
        return;
      }

      // Calculate the brush radius in screen space based on sprite scale
      const spriteScaleX = target.sprite.worldTransform.a;
      const spriteScaleY = target.sprite.worldTransform.d;
      const avgScale = (Math.abs(spriteScaleX) + Math.abs(spriteScaleY)) / 2;

      // Convert brush size from canvas pixels to screen pixels
      const workingCanvas = workingCanvasRef.current;
      if (!workingCanvas) {
        return;
      }

      const canvasToSpriteRatio = target.sprite.width / workingCanvas.width;
      const screenRadius = (brushSize / 2) * canvasToSpriteRatio * avgScale;

      brushCursor.clear();
      brushCursor.circle(0, 0, screenRadius);
      brushCursor.stroke({
        width: 1.5,
        color: brushMode === "remove" ? 0xff4444 : 0x44ff44,
        alpha: 0.9,
      });
      brushCursor.circle(0, 0, screenRadius);
      brushCursor.fill({
        color: brushMode === "remove" ? 0xff4444 : 0x44ff44,
        alpha: 0.15,
      });
      brushCursor.position.set(globalX, globalY);
      brushCursor.visible = true;
    };

    const hideBrushCursor = () => {
      if (brushCursor) {
        brushCursor.visible = false;
      }
    };

    const onPointerMoveGlobal = (event: FederatedPointerEvent) => {
      const point = getCanvasPointFromEvent(event);
      if (point) {
        drawBrushCursor(event.global.x, event.global.y);
      } else {
        hideBrushCursor();
      }

      // Handle painting
      if (isPaintingRef.current && point) {
        const start = lastPointRef.current ?? point;
        lastPointRef.current = point;
        paintStroke(start, point);
      }
    };

    const onPointerLeave = () => {
      hideBrushCursor();
    };

    sprite.cursor = "none";
    sprite.on("pointerdown", onPointerDown);
    sprite.on("pointermove", onPointerMoveGlobal);
    sprite.on("pointerup", onPointerUp);
    sprite.on("pointerupoutside", onPointerUp);
    sprite.on("pointerleave", onPointerLeave);

    return () => {
      sprite.cursor = originalCursor;
      sprite.off("pointerdown", onPointerDown);
      sprite.off("pointermove", onPointerMoveGlobal);
      sprite.off("pointerup", onPointerUp);
      sprite.off("pointerupoutside", onPointerUp);
      sprite.off("pointerleave", onPointerLeave);
      isPaintingRef.current = false;
      lastPointRef.current = null;

      // Remove brush cursor
      if (brushCursorRef.current) {
        brushCursorRef.current.destroy();
        brushCursorRef.current = null;
      }
    };
  }, [
    app,
    applyWorkingCanvasTexture,
    brushMode,
    brushSize,
    container,
    editMode,
    getCanvasPointFromEvent,
    hasResult,
    paintStroke,
    persistWorkingResult,
    target,
  ]);

  const applyTexturePreview = useCallback(
    async (src: string) => {
      if (!(target instanceof ImageLayer)) {
        return;
      }

      const texture = await base64StringToTexture(src);
      target.sprite.texture = texture;
      setTrigger(!trigger);
    },
    [target, setTrigger, trigger],
  );

  const applyResultAndClose = async () => {
    const workingResult =
      workingCanvasRef.current?.toDataURL("image/png") || resultSrc;
    if (!workingResult || !(target instanceof ImageLayer)) {
      setEditMode("view");
      return;
    }

    setLayerManager((draft) => {
      draft.layers = draft.layers.map((layer) => {
        if (layer.id === target.id) {
          (layer as ImageLayer).imageData.src = workingResult;
        }
        return layer;
      });
    });

    setResultSrc(workingResult);
    setEditMode("view");
  };

  const showBefore = async () => {
    if (originalSrc.length === 0) {
      return;
    }

    await applyTexturePreview(originalSrc);
    setPreviewMode("before");
  };

  const showAfter = async () => {
    if (workingCanvasRef.current) {
      applyWorkingCanvasTexture();
      setPreviewMode("after");
      return;
    }

    if (resultSrc.length === 0) {
      return;
    }

    await applyTexturePreview(resultSrc);
    setPreviewMode("after");
  };

  const revertResult = async () => {
    await showBefore();
    setResultSrc("");
    workingCanvasRef.current = null;
    originalCanvasRef.current = null;
    workingTextureRef.current = null;
  };

  async function removeImageBackground(
    imgSource: string,
    rembgModel: RembgModel,
  ) {
    const response = await fetch("/api/rembg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageSrc: imgSource,
        model: rembgModel,
        returnMask: false,
        alphaMatting: false,
        alphaMattingForegroundThreshold: 240,
        alphaMattingBackgroundThreshold: 10,
        alphaMattingErodeSize: 10,
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      let data: { error?: string } | null = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      const errorMessage =
        data?.error ||
        raw ||
        `Failed to remove background with local A1111 service (status ${response.status}).`;
      toast.error(errorMessage);
      return null;
    }

    const data = await response.json();
    return data.data;
  }

  const callRembg = async () => {
    if (!(target instanceof ImageLayer)) {
      toast.warning(
        "Please select an image layer before using remove background.",
      );
      return;
    }

    setLoading(true);

    const response = await removeImageBackground(target.imageData.src, model);
    if (response === null || typeof response !== "string") {
      setLoading(false);
      return;
    }

    setResultSrc(response);
    setPreviewMode("after");
    originalCanvasRef.current = await loadCanvasFromSource(originalSrc);
    workingCanvasRef.current = await loadCanvasFromSource(response);
    applyWorkingCanvasTexture();
    setLoading(false);
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    void showBefore();
    setEditMode("view");
  };

  return (
    <Sheet
      modal={false}
      open={editMode === "rembg"}
      onOpenChange={handleSheetOpenChange}
    >
      <SheetContent
        side={"left"}
        className="h-full top-10 w-80 border-r-2 border-[#cdcdcd] dark:border-[#252525]"
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>Remove Background</SheetTitle>
          <SheetDescription>
            Run local A1111 rembg, compare before and after, then apply.
          </SheetDescription>
        </SheetHeader>
        <SelectSeparator className="m-3" />
        <div className="flex flex-col space-y-6 mt-5 items-start">
          <div className="flex flex-col items-start space-y-2 w-full">
            <div className="flex flex-col items-start space-y-1">
              <div className="flex flex-row space-x-2 text-black dark:text-white items-center">
                <Label htmlFor="model" className="text-black dark:text-white">
                  Model
                </Label>
              </div>
              <div
                className="flex flex-row justify-center items-center space-x-1 "
                id="help-model-container"
              >
                <InfoCircledIcon className="text-xs cursor-pointer text-muted-foreground" />
                <Link
                  href={
                    "https://photoproxdocs.vercel.app/technical/algorithms_and_models#background-remover-models"
                  }
                  target="_blank"
                >
                  <p className="text-muted-foreground text-xs">
                    Help choosing a model
                  </p>
                </Link>
              </div>
            </div>
            <SelectModel model={model} setModel={setModel} />
          </div>

          <div className="w-full space-y-2">
            <Label className="text-black dark:text-white">Canvas Preview</Label>
            <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
              {previewMode === "before"
                ? "Showing original image on the main canvas"
                : "Showing background-removed result on the main canvas"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => showBefore()}
                disabled={originalSrc.length === 0 || loading}
                className={`rounded-md overflow-hidden border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  {
                    before: "border-blue-500 ring-2 ring-blue-400/40",
                    after: "border-border",
                  }[previewMode]
                }`}
              >
                <div className="px-2 py-1 text-xs bg-muted text-foreground">
                  Original
                </div>
                <div
                  className="h-20 w-full"
                  style={{
                    background:
                      "repeating-conic-gradient(#b8b8b8 0% 25%, #ececec 0% 50%) 50% / 12px 12px",
                  }}
                >
                  {originalSrc.length > 0 && (
                    <img
                      src={originalSrc}
                      alt="Original image preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => showAfter()}
                disabled={!hasResult || loading}
                className={`rounded-md overflow-hidden border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  {
                    after: "border-blue-500 ring-2 ring-blue-400/40",
                    before: "border-border",
                  }[previewMode]
                }`}
              >
                <div className="px-2 py-1 text-xs bg-muted text-foreground">
                  Result
                </div>
                <div
                  className="h-20 w-full"
                  style={{
                    background:
                      "repeating-conic-gradient(#b8b8b8 0% 25%, #ececec 0% 50%) 50% / 12px 12px",
                  }}
                >
                  {hasResult ? (
                    <img
                      src={resultSrc}
                      alt="Background removed preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">
                      Run remove first
                    </div>
                  )}
                </div>
              </button>
            </div>
            <div className="flex flex-row space-x-2">
              <Button
                type="button"
                onClick={() => showBefore()}
                variant={previewMode === "before" ? "default" : "outline"}
                disabled={originalSrc.length === 0 || loading}
                className="text-xs"
              >
                Preview Original
              </Button>
              <Button
                type="button"
                onClick={() => showAfter()}
                variant={previewMode === "after" ? "default" : "outline"}
                disabled={!hasResult || loading}
                className="text-xs"
              >
                Preview Result
              </Button>
            </div>
          </div>

          <div className="w-full space-y-2">
            <Label className="text-black dark:text-white">Touch Up Brush</Label>
            <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
              Paint directly on the main canvas. Remove erases pixels to
              transparent, Repair brings pixels back from the original image.
            </div>
            <div className="flex flex-row space-x-2 w-full">
              <Button
                type="button"
                variant={brushMode === "remove" ? "default" : "outline"}
                className="flex-1 text-xs"
                disabled={!hasResult || loading}
                onClick={() => setBrushMode("remove")}
              >
                Remove
              </Button>
              <Button
                type="button"
                variant={brushMode === "repair" ? "default" : "outline"}
                className="flex-1 text-xs"
                disabled={!hasResult || loading}
                onClick={() => setBrushMode("repair")}
              >
                Repair
              </Button>
            </div>
            <div className="w-full space-y-1">
              <div className="flex flex-row justify-between items-center text-xs text-muted-foreground">
                <span>Brush Size</span>
                <span>{brushSize}px</span>
              </div>
              <Slider
                min={4}
                max={120}
                step={1}
                value={[brushSize]}
                disabled={!hasResult || loading}
                onValueChange={(value) => setBrushSize(value[0] ?? 28)}
              />
            </div>
          </div>

          <div className="flex flex-row space-x-2 w-full">
            <Button
              type="button"
              onClick={() => revertResult()}
              disabled={!hasResult || loading}
              className="text-xs"
            >
              Revert
            </Button>
            <Button
              type="button"
              onClick={() => callRembg()}
              className="bg-green-500 hover:bg-green-600 dark:bg-white text-xs flex-1"
              disabled={!canRun}
            >
              {loading ? "Removing..." : "Remove Background"}
            </Button>
          </div>

          <SheetFooter className="w-full">
            <div className="flex flex-row space-x-2 w-full">
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={async () => {
                  await showBefore();
                  setEditMode("view");
                }}
              >
                Close Without Applying
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => applyResultAndClose()}
                disabled={!hasResult || loading}
                className="w-full text-muted-foreground bg-black text-white"
              >
                Apply and Close
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};
export default BackgroundRemover;
