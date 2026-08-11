import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { ImageSelectionState } from "@/interfaces/editor/EditDocument";
import { EditorStateCommand } from "@/models/commands/editor/EditorStateCommand";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { applySelectionAwareRasterOperation, brightnessContrastOperation } from "@/utils/RasterOperations";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CanvasSource, Texture } from "pixi.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type RasterState = { texture: Texture; src: string };
type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const sourceToRaster = (layer: ImageLayer) => {
  const source = layer.sprite.texture.source.resource;
  if (!(source instanceof HTMLCanvasElement || source instanceof HTMLImageElement || source instanceof ImageBitmap)) return null;
  const width = Math.max(1, Math.round(layer.sprite.texture.width));
  const height = Math.max(1, Math.round(layer.sprite.texture.height));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source as CanvasImageSource, 0, 0, width, height);
  return { width, height, pixels: new Uint8ClampedArray(context.getImageData(0, 0, width, height).data) };
};

const pixelsToCanvas = (pixels: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create adjustment raster.");
  context.putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas;
};

const canvasToTexture = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({
    resource: canvas,
    width: canvas.width,
    height: canvas.height,
    antialias: true,
    scaleMode: "linear",
    autoDensity: true,
    mipmapFilter: "linear",
  });
  return new Texture(source);
};

const pixelsToState = (pixels: Uint8ClampedArray, width: number, height: number): RasterState => {
  const canvas = pixelsToCanvas(pixels, width, height);
  return { texture: canvasToTexture(canvas), src: canvas.toDataURL("image/png") };
};

const pixelsToPreviewTexture = (pixels: Uint8ClampedArray, width: number, height: number): Texture => {
  const canvas = pixelsToCanvas(pixels, width, height);
  return canvasToTexture(canvas);
};

const BrightnessContrastDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { container } = useCanvas();
  const { layerManager, setLayerManager, editDocument, setUndoRedoManager } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);
  const [brightness, setBrightness] = useState(0); const [contrast, setContrast] = useState(0); const [preview, setPreview] = useState(true);
  const originalRef = useRef<{ layerId: string; raster: NonNullable<ReturnType<typeof sourceToRaster>>; state: RasterState; selection?: ImageSelectionState } | null>(null);
  const previewTextureRef = useRef<Texture | null>(null);
  const frameRef = useRef<number | null>(null);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const dialogOffsetRef = useRef({ x: 0, y: 0 });
  const dragHandlersRef = useRef<{ move: (event: PointerEvent) => void; up: (event: PointerEvent) => void } | null>(null);
  const dragFrameRef = useRef<number | null>(null);

  const renderDialogPosition = useCallback((x: number, y: number) => {
    dialogOffsetRef.current = { x, y };
    if (dialogContentRef.current) {
      dialogContentRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
  }, []);

  const stopDragging = useCallback(() => {
    if (dragHandlersRef.current) {
      window.removeEventListener("pointermove", dragHandlersRef.current.move);
      window.removeEventListener("pointerup", dragHandlersRef.current.up);
      dragHandlersRef.current = null;
    }
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = dialogOffsetRef.current.x;
    const originY = dialogOffsetRef.current.y;
    let nextX = originX;
    let nextY = originY;
    stopDragging();
    const move = (moveEvent: PointerEvent) => {
      nextX = originX + moveEvent.clientX - startX;
      nextY = originY + moveEvent.clientY - startY;
      if (dragFrameRef.current !== null) return;
      dragFrameRef.current = window.requestAnimationFrame(() => {
        renderDialogPosition(nextX, nextY);
        dragFrameRef.current = null;
      });
    };
    const up = () => {
      stopDragging();
    };
    dragHandlersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [renderDialogPosition, stopDragging]);
  const applyState = useCallback((layerId: string, state: RasterState) => {
    setLayerManager(draft => { const layer = findLayer(draft.layers, layerId); if (!(layer instanceof ImageLayer)) return; layer.sprite.texture = state.texture; layer.imageData.src = state.src; });
    if (container) container.compositeNeeded = true;
  }, [container, setLayerManager]);
  const applyPreviewTexture = useCallback((layerId: string, texture: Texture) => {
    setLayerManager((draft) => {
      const layer = findLayer(draft.layers, layerId);
      if (!(layer instanceof ImageLayer)) return;
      layer.sprite.texture = texture;
    });
    if (container) container.compositeNeeded = true;
  }, [container, setLayerManager]);

  useEffect(() => {
    if (!open) return;
    if (!(target instanceof ImageLayer)) { toast.error("Select an editable image layer first."); onOpenChange(false); return; }
    const raster = sourceToRaster(target); if (!raster) { toast.error("This layer does not expose an editable browser raster."); onOpenChange(false); return; }
    const selection = editDocument.selections[target.id];
    originalRef.current = { layerId: target.id, raster, state: { texture: target.sprite.texture, src: target.imageData.src }, selection: selection ? structuredClone(selection) : undefined };
    setBrightness(0); setContrast(0); setPreview(true); renderDialogPosition(0, 0); previewTextureRef.current = null;
  }, [editDocument.selections, onOpenChange, open, renderDialogPosition, target]);

  useEffect(() => {
    if (!open) renderDialogPosition(0, 0);
  }, [open, renderDialogPosition]);

  useEffect(() => () => {
    stopDragging();
  }, [stopDragging]);

  useEffect(() => {
    const original = originalRef.current; if (!open || !original?.raster) return;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!preview || (brightness === 0 && contrast === 0)) {
      if (previewTextureRef.current && previewTextureRef.current !== original.state.texture) {
        previewTextureRef.current.destroy(true);
      }
      previewTextureRef.current = null;
      applyState(original.layerId, original.state);
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      const output = applySelectionAwareRasterOperation(
        original.raster.pixels,
        original.raster.width,
        original.raster.height,
        original.selection,
        brightnessContrastOperation(brightness / 100, contrast / 100),
      );
      const texture = pixelsToPreviewTexture(
        output,
        original.raster.width,
        original.raster.height,
      );
      if (previewTextureRef.current && previewTextureRef.current !== original.state.texture) {
        previewTextureRef.current.destroy(true);
      }
      previewTextureRef.current = texture;
      applyPreviewTexture(original.layerId, texture);
      frameRef.current = null;
    });

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [applyPreviewTexture, applyState, brightness, contrast, open, preview]);

  const cancel = () => {
    stopDragging();
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const original = originalRef.current;
    if (original) applyState(original.layerId, original.state);
    if (previewTextureRef.current && original && previewTextureRef.current !== original.state.texture) {
      previewTextureRef.current.destroy(true);
    }
    previewTextureRef.current = null;
    originalRef.current = null;
    onOpenChange(false);
  };

  const apply = () => {
    stopDragging();
    const original = originalRef.current; if (!original?.raster) return;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const pixels = applySelectionAwareRasterOperation(original.raster.pixels, original.raster.width, original.raster.height, original.selection, brightnessContrastOperation(brightness / 100, contrast / 100));
    const after = pixelsToState(pixels, original.raster.width, original.raster.height);
    const command = new EditorStateCommand("Brightness/Contrast", original.state, after, state => applyState(original.layerId, state)); command.execute();
    setUndoRedoManager(draft => { draft.undoStack.push(command); draft.redoStack = []; });
    if (previewTextureRef.current && previewTextureRef.current !== after.texture && previewTextureRef.current !== original.state.texture) {
      previewTextureRef.current.destroy(true);
    }
    previewTextureRef.current = null;
    originalRef.current = null;
    onOpenChange(false);
  };
  const control = (label: string, value: number, setter: (value: number) => void) => <label className="grid grid-cols-[90px_1fr_64px] items-center gap-2 text-sm"><span>{label}</span><input type="range" min="-100" max="100" value={value} onChange={e=>setter(Number(e.target.value))}/><input className="h-8 rounded border bg-background px-2 text-right" type="number" min="-100" max="100" value={value} onChange={e=>setter(Math.max(-100,Math.min(100,Number(e.target.value)||0)))}/></label>;
  return <Dialog open={open} onOpenChange={value => { if (!value) cancel(); }}><DialogPortal><DialogPrimitive.Content ref={dialogContentRef} className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md gap-4 border bg-background p-6 shadow-lg sm:rounded-lg data-[state=open]:animate-none data-[state=closed]:animate-none" style={{ transform: "translate(-50%, -50%)", transition: "none" }} onEscapeKeyDown={e=>{e.preventDefault();cancel()}}><DialogHeader className="-mx-6 -mt-6 mb-2 cursor-move select-none rounded-t-lg border-b bg-muted/70 px-6 py-3" onPointerDown={handleDragStart}><DialogTitle className="text-base">Brightness/Contrast</DialogTitle><p className="text-xs text-muted-foreground">Drag this top bar to move the window</p></DialogHeader><div className="space-y-4">{control("Brightness",brightness,setBrightness)}{control("Contrast",contrast,setContrast)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preview} onChange={e=>setPreview(e.target.checked)}/> Preview</label></div><DialogFooter><Button variant="outline" onClick={()=>{setBrightness(0);setContrast(0)}}>Reset</Button><Button variant="outline" onClick={cancel}>Cancel</Button><Button onClick={apply}>Apply</Button></DialogFooter><DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"><X className="h-4 w-4" /><span className="sr-only">Close</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPortal></Dialog>;
};
export default BrightnessContrastDialog;
