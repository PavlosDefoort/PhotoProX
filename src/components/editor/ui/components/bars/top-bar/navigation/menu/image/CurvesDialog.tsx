/**
 * CurvesDialog.tsx
 *
 * Photoshop-style Curves adjustment dialog.
 *
 * Key behaviours
 * --------------
 * • Four independent channel curves: RGB (composite), Red, Green, Blue.
 * • Monotone Hermite cubic spline rendered on a canvas graph.
 * • Luminance histogram drawn from the immutable original raster.
 * • Live preview derived from the immutable original raster on every change.
 * • Apply commits one undoable EditorStateCommand.
 * • Cancel restores the original raster without adding to history.
 * • Dragging a non-endpoint point outside the graph bounds removes it
 *   (Photoshop-style interaction).
 * • Backspace / Delete removes the selected non-endpoint point.
 * • Channel switching preserves all independent control-point collections.
 * • Alpha channel is never touched.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCanvas } from "@/hooks/useCanvas";
import { useDirectCanvasPreview } from "@/hooks/useDirectCanvasPreview";
import { useProject } from "@/hooks/useProject";
import { ImageSelectionState } from "@/interfaces/editor/EditDocument";
import { EditorStateCommand } from "@/models/commands/editor/EditorStateCommand";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import {
  ControlPoint,
  buildCurvesLUTs,
  buildLUT,
  computeHistogram,
  identityPoints,
  normalizePoints,
} from "@/utils/CurvesMath";
import {
  applySelectionAwareRasterOperation,
  curvesOperation,
} from "@/utils/RasterOperations";
import { GpuAdjustmentPreviewFilter } from "@/utils/GpuAdjustmentPreview";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { CanvasSource, Filter, Texture } from "pixi.js";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { setFullResolutionWorkingSource } from "@/utils/ImageUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Channel = "rgb" | "red" | "green" | "blue";
type RasterState = { texture: Texture; src: string };

interface ChannelCurves {
  rgb: ControlPoint[];
  red: ControlPoint[];
  green: ControlPoint[];
  blue: ControlPoint[];
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

// ---------------------------------------------------------------------------
// Raster helpers (shared with BrightnessContrastDialog pattern)
// ---------------------------------------------------------------------------

const sourceToRaster = (layer: ImageLayer) => {
  const source = layer.sprite.texture.source.resource;
  if (
    !(
      source instanceof HTMLCanvasElement ||
      source instanceof HTMLImageElement ||
      source instanceof ImageBitmap
    )
  )
    return null;
  const width = Math.max(1, Math.round(layer.sprite.texture.width));
  const height = Math.max(1, Math.round(layer.sprite.texture.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  const pixels = new Uint8ClampedArray(
    ctx.getImageData(0, 0, width, height).data,
  );
  return { width, height, pixels };
};

const pixelsToCanvas = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create adjustment raster.");
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas;
};

const canvasToTexture = (canvas: HTMLCanvasElement): Texture => {
  const source = new CanvasSource({
    resource: canvas,
    width: canvas.width,
    height: canvas.height,
    antialias: true,
    scaleMode: "linear",
    // Keep adjustment output dimensions in image pixels so selection masks
    // remain aligned on HiDPI displays and after successive adjustments.
    autoDensity: false,
    mipmapFilter: "linear",
  });
  return new Texture(source);
};

const pixelsToState = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): RasterState => {
  const canvas = pixelsToCanvas(pixels, width, height);
  return { texture: canvasToTexture(canvas), src: canvas.toDataURL("image/png") };
};

// ---------------------------------------------------------------------------
// Curve graph rendering
// ---------------------------------------------------------------------------

const GRAPH_SIZE = 256; // canvas pixel dimensions (1:1 with tonal values)
const POINT_RADIUS = 5;

/** Map a tonal value [0,255] to canvas pixel coordinate. */
const toCanvas = (v: number) => Math.round(v);
/** Map canvas pixel coordinate to tonal value [0,255] clamped. */
const fromCanvas = (px: number) => Math.max(0, Math.min(255, Math.round(px)));

function drawGraph(
  canvas: HTMLCanvasElement,
  points: ControlPoint[],
  lut: Uint8ClampedArray,
  histogram: Float32Array | null,
  selectedIndex: number | null,
  channel: Channel,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = GRAPH_SIZE;

  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, size, size);

  // Grid lines (4×4)
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const v = Math.round((i / 4) * size);
    ctx.beginPath();
    ctx.moveTo(v, 0);
    ctx.lineTo(v, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, v);
    ctx.lineTo(size, v);
    ctx.stroke();
  }

  // Histogram
  if (histogram) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let x = 0; x < 256; x++) {
      const barH = Math.round(histogram[x] * size);
      if (barH > 0) ctx.fillRect(x, size - barH, 1, barH);
    }
  }

  // Identity diagonal
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();

  // Spline curve
  const channelColours: Record<Channel, string> = {
    rgb: "#ffffff",
    red: "#ff6464",
    green: "#64ff64",
    blue: "#6464ff",
  };
  ctx.strokeStyle = channelColours[channel];
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < 256; x++) {
    const canvasX = toCanvas(x);
    const canvasY = size - 1 - toCanvas(lut[x]);
    if (x === 0) ctx.moveTo(canvasX, canvasY);
    else ctx.lineTo(canvasX, canvasY);
  }
  ctx.stroke();

  // Control points
  const sorted = normalizePoints(points);
  sorted.forEach((pt, i) => {
    const cx = toCanvas(pt.x);
    const cy = size - 1 - toCanvas(pt.y);
    const isSelected =
      selectedIndex !== null &&
      normalizePoints(points)[selectedIndex]?.x === pt.x &&
      normalizePoints(points)[selectedIndex]?.y === pt.y;

    ctx.beginPath();
    ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "#fff" : channelColours[channel];
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    void i;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const defaultPoints = (): ChannelCurves => ({
  rgb: [...identityPoints()],
  red: [...identityPoints()],
  green: [...identityPoints()],
  blue: [...identityPoints()],
});

const CurvesDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { container } = useCanvas();
  const { layerManager, setLayerManager, editDocument, setUndoRedoManager } =
    useProject();
  const target = findLayer(layerManager.layers, layerManager.target);

  // Channel selector
  const [channel, setChannel] = useState<Channel>("rgb");

  // Per-channel control points (all four independent)
  const [curves, setCurves] = useState<ChannelCurves>(defaultPoints());

  // Selected control point index within the *sorted* current-channel array
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Preview toggle
  const [preview, setPreview] = useState(true);

  // Immutable original captured on open
  const originalRef = useRef<{
    layerId: string;
    raster: NonNullable<ReturnType<typeof sourceToRaster>>;
    state: RasterState;
    selection?: ImageSelectionState;
    histogram: Float32Array;
    previewFilter: GpuAdjustmentPreviewFilter;
    originalFilters: Filter[];
  } | null>(null);


  // Graph canvas
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);

  // Dragging state
  const dragIndexRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Dialog dragging
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const dialogOffsetRef = useRef({ x: 0, y: 0 });
  const dragHandlersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);
  const dragFrameRef = useRef<number | null>(null);

  // Input/Output field values for selected point
  const [inputVal, setInputVal] = useState("");
  const [outputVal, setOutputVal] = useState("");

  useDirectCanvasPreview(container, open);

  // ---------------------------------------------------------------------------
  // Helpers: current channel's points and LUT
  // ---------------------------------------------------------------------------

  const getCurrentPoints = useCallback(
    (c: Channel, state: ChannelCurves) => state[c],
    [],
  );

  const buildAllLUTs = useCallback((c: ChannelCurves) => {
    return buildCurvesLUTs(c.rgb, c.red, c.green, c.blue);
  }, []);

  // ---------------------------------------------------------------------------
  // Dialog dragging
  // ---------------------------------------------------------------------------

  const renderDialogPosition = useCallback((x: number, y: number) => {
    dialogOffsetRef.current = { x, y };
    if (dialogContentRef.current) {
      dialogContentRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
  }, []);

  const stopDialogDragging = useCallback(() => {
    if (dragHandlersRef.current) {
      window.removeEventListener("pointermove", dragHandlersRef.current.move);
      window.removeEventListener("pointerup", dragHandlersRef.current.up);
      dragHandlersRef.current = null;
    }
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY;
      const ox = dialogOffsetRef.current.x, oy = dialogOffsetRef.current.y;
      let nx = ox, ny = oy;
      stopDialogDragging();
      const move = (me: PointerEvent) => {
        nx = ox + me.clientX - sx;
        ny = oy + me.clientY - sy;
        if (dragFrameRef.current !== null) return;
        dragFrameRef.current = requestAnimationFrame(() => {
          renderDialogPosition(nx, ny);
          dragFrameRef.current = null;
        });
      };
      const up = () => stopDialogDragging();
      dragHandlersRef.current = { move, up };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [renderDialogPosition, stopDialogDragging],
  );

  // ---------------------------------------------------------------------------
  // Pixi layer helpers
  // ---------------------------------------------------------------------------

  const applyState = useCallback(
    (layerId: string, state: RasterState) => {
      setLayerManager((draft) => {
        const layer = findLayer(draft.layers, layerId);
        if (!(layer instanceof ImageLayer)) return;
    layer.sprite.texture = state.texture;
    setFullResolutionWorkingSource(layer, state.src, state.texture.width, state.texture.height);
      });
      if (container) container.compositeNeeded = true;
    },
    [container, setLayerManager],
  );

  const detachPreviewFilter = useCallback(() => {
    const original = originalRef.current;
    if (!original) return;
    const layer = findLayer(layerManager.layers, original.layerId);
    if (layer instanceof ImageLayer) {
      layer.sprite.filters = original.originalFilters;
    }
    original.previewFilter.destroy();
  }, [layerManager.layers]);

  // ---------------------------------------------------------------------------
  // Open / close lifecycle
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;
    if (!(target instanceof ImageLayer)) {
      toast.error("Select an editable image layer first.");
      onOpenChange(false);
      return;
    }
    const raster = sourceToRaster(target);
    if (!raster) {
      toast.error("This layer does not expose an editable browser raster.");
      onOpenChange(false);
      return;
    }
    const selection = editDocument.selections[target.id];
    const storedSelection = selection ? structuredClone(selection) : undefined;
    const histogram = computeHistogram(raster.pixels);
    const originalFilters = target.sprite.filters
      ? [...target.sprite.filters]
      : [];
    const previewFilter = new GpuAdjustmentPreviewFilter(
      storedSelection,
      raster.width,
      raster.height,
      target.sprite,
    );
    target.sprite.filters = [...originalFilters, previewFilter];
    originalRef.current = {
      layerId: target.id,
      raster,
      state: { texture: target.sprite.texture, src: target.imageData.src },
      selection: storedSelection,
      histogram,
      previewFilter,
      originalFilters,
    };
    setCurves(defaultPoints());
    setChannel("rgb");
    setSelectedIndex(null);
    setPreview(true);
    setInputVal("");
    setOutputVal("");
    renderDialogPosition(0, 0);
  }, [editDocument.selections, onOpenChange, open, renderDialogPosition, target]);

  useEffect(() => {
    if (!open) renderDialogPosition(0, 0);
  }, [open, renderDialogPosition]);

  useEffect(
    () => () => {
      stopDialogDragging();
    },
    [stopDialogDragging],
  );

  // ---------------------------------------------------------------------------
  // Graph rendering
  // ---------------------------------------------------------------------------

  const redrawGraph = useCallback(
    (state: ChannelCurves, ch: Channel, selIdx: number | null) => {
      const canvas = graphCanvasRef.current;
      if (!canvas) return;
      const pts = getCurrentPoints(ch, state);
      const lut = buildLUT(pts);
      const histogram = originalRef.current?.histogram ?? null;
      drawGraph(canvas, pts, lut, histogram, selIdx, ch);
    },
    [getCurrentPoints],
  );

  useEffect(() => {
    if (open) redrawGraph(curves, channel, selectedIndex);
  }, [open, curves, channel, selectedIndex, redrawGraph]);

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  const schedulePreview = useCallback(
    (state: ChannelCurves, enabled: boolean) => {
      const original = originalRef.current;
      if (!original) return;
      const luts = buildAllLUTs(state);
      const isIdentity =
        luts.rgb.every((v, i) => v === i) &&
        luts.red.every((v, i) => v === i) &&
        luts.green.every((v, i) => v === i) &&
        luts.blue.every((v, i) => v === i);

      if (!enabled || isIdentity) {
        original.previewFilter.enabled = false;
        return;
      }
      original.previewFilter.enabled = true;
      original.previewFilter.setCurves(luts);
    },
    [buildAllLUTs],
  );

  // Trigger preview whenever curves or preview toggle changes
  useEffect(() => {
    if (!open) return;
    schedulePreview(curves, preview);
  }, [open, curves, preview, schedulePreview]);

  // ---------------------------------------------------------------------------
  // Control-point mutation helpers
  // ---------------------------------------------------------------------------

  const updateChannelPoints = useCallback(
    (ch: Channel, newPoints: ControlPoint[], newSelIdx: number | null) => {
      setCurves((prev) => {
        return { ...prev, [ch]: newPoints };
      });
      setSelectedIndex(newSelIdx);
      const sorted = normalizePoints(newPoints);
      if (newSelIdx !== null && sorted[newSelIdx]) {
        setInputVal(String(sorted[newSelIdx].x));
        setOutputVal(String(sorted[newSelIdx].y));
      } else {
        setInputVal("");
        setOutputVal("");
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Graph pointer interaction
  // ---------------------------------------------------------------------------

  const hitTest = (
    canvasX: number,
    canvasY: number,
    pts: ControlPoint[],
  ): number => {
    const sorted = normalizePoints(pts);
    for (let i = 0; i < sorted.length; i++) {
      const cx = toCanvas(sorted[i].x);
      const cy = GRAPH_SIZE - 1 - toCanvas(sorted[i].y);
      const dx = canvasX - cx;
      const dy = canvasY - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= POINT_RADIUS + 2) return i;
    }
    return -1;
  };

  const handleGraphPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = graphCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = GRAPH_SIZE / rect.width;
      const scaleY = GRAPH_SIZE / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const inputV = fromCanvas(cx);
      const outputV = fromCanvas(GRAPH_SIZE - 1 - cy);

      const pts = getCurrentPoints(channel, curves);
      const sorted = normalizePoints(pts);
      const hit = hitTest(cx, cy, pts);

      if (hit >= 0) {
        // Select existing point and begin drag
        setSelectedIndex(hit);
        setInputVal(String(sorted[hit].x));
        setOutputVal(String(sorted[hit].y));
        dragIndexRef.current = hit;
        isDraggingRef.current = true;
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      // Add a new point, inserting in sorted order
      const newPt: ControlPoint = { x: inputV, y: outputV };
      const newPts = [...pts, newPt];
      const newSorted = normalizePoints(newPts);
      const newIdx = newSorted.findIndex(
        (p) => p.x === clampInt(inputV) && p.y === clampInt(outputV),
      );
      updateChannelPoints(channel, newPts, newIdx >= 0 ? newIdx : null);
      dragIndexRef.current = newIdx >= 0 ? newIdx : null;
      isDraggingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
    },
    [channel, curves, getCurrentPoints, updateChannelPoints],
  );

  const handleGraphPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || dragIndexRef.current === null) return;
      const canvas = graphCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = GRAPH_SIZE / rect.width;
      const scaleY = GRAPH_SIZE / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      const pts = getCurrentPoints(channel, curves);
      const sorted = normalizePoints(pts);
      const idx = dragIndexRef.current;
      if (idx >= sorted.length) return;

      const isEndpoint = idx === 0 || idx === sorted.length - 1;

      // Photoshop: dragging a non-endpoint outside the graph removes it
      const outside = cx < -10 || cx > GRAPH_SIZE + 10 || cy < -10 || cy > GRAPH_SIZE + 10;
      if (!isEndpoint && outside) {
        const newPts = sorted.filter((_, i) => i !== idx);
        dragIndexRef.current = null;
        isDraggingRef.current = false;
        updateChannelPoints(channel, newPts, null);
        return;
      }

      const newX = fromCanvas(cx);
      const newY = fromCanvas(GRAPH_SIZE - 1 - cy);

      // Clamp endpoints to their axis
      let finalX = newX;
      let finalY = newY;
      if (isEndpoint) {
        finalX = idx === 0 ? 0 : 255;
      }

      // Prevent crossing neighbours on the input axis
      if (!isEndpoint) {
        const prevX = idx > 0 ? sorted[idx - 1].x : -1;
        const nextX = idx < sorted.length - 1 ? sorted[idx + 1].x : 256;
        finalX = Math.max(prevX + 1, Math.min(nextX - 1, finalX));
      }

      const newPts = sorted.map((p, i) =>
        i === idx ? { x: finalX, y: finalY } : p,
      );
      updateChannelPoints(channel, newPts, idx);
    },
    [channel, curves, getCurrentPoints, updateChannelPoints],
  );

  const handleGraphPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    dragIndexRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard: Delete / Backspace removes selected non-endpoint
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedIndex === null) return;
      const pts = getCurrentPoints(channel, curves);
      const sorted = normalizePoints(pts);
      const isEndpoint =
        selectedIndex === 0 || selectedIndex === sorted.length - 1;
      if (isEndpoint) return;
      const newPts = sorted.filter((_, i) => i !== selectedIndex);
      updateChannelPoints(channel, newPts, null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, channel, curves, selectedIndex, getCurrentPoints, updateChannelPoints]);

  // ---------------------------------------------------------------------------
  // Input/Output field handlers
  // ---------------------------------------------------------------------------

  const commitInputOutput = useCallback(
    (rawInput: string, rawOutput: string) => {
      if (selectedIndex === null) return;
      const x = parseInt(rawInput, 10);
      const y = parseInt(rawOutput, 10);
      if (isNaN(x) || isNaN(y)) return;
      const pts = getCurrentPoints(channel, curves);
      const sorted = normalizePoints(pts);
      if (selectedIndex >= sorted.length) return;
      const isEndpoint =
        selectedIndex === 0 || selectedIndex === sorted.length - 1;
      let finalX = clampInt(x);
      if (isEndpoint) finalX = selectedIndex === 0 ? 0 : 255;
      else {
        const prevX = selectedIndex > 0 ? sorted[selectedIndex - 1].x : -1;
        const nextX =
          selectedIndex < sorted.length - 1
            ? sorted[selectedIndex + 1].x
            : 256;
        finalX = Math.max(prevX + 1, Math.min(nextX - 1, finalX));
      }
      const finalY = Math.max(0, Math.min(255, clampInt(y)));
      const newPts = sorted.map((p, i) =>
        i === selectedIndex ? { x: finalX, y: finalY } : p,
      );
      updateChannelPoints(channel, newPts, selectedIndex);
    },
    [channel, curves, getCurrentPoints, selectedIndex, updateChannelPoints],
  );

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    const fresh = defaultPoints();
    setCurves(fresh);
    setSelectedIndex(null);
    setInputVal("");
    setOutputVal("");
  }, []);

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  const cancel = useCallback(() => {
    stopDialogDragging();
    const original = originalRef.current;
    if (original) detachPreviewFilter();
    originalRef.current = null;
    onOpenChange(false);
  }, [detachPreviewFilter, onOpenChange, stopDialogDragging]);

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------

  const apply = useCallback(() => {
    stopDialogDragging();
    const original = originalRef.current;
    if (!original?.raster) return;
    detachPreviewFilter();
    const luts = buildAllLUTs(curves);
    const pixels = applySelectionAwareRasterOperation(
      original.raster.pixels,
      original.raster.width,
      original.raster.height,
      original.selection,
      curvesOperation(luts),
    );
    const after = pixelsToState(
      pixels,
      original.raster.width,
      original.raster.height,
    );
    const command = new EditorStateCommand(
      "Curves",
      original.state,
      after,
      (state) => applyState(original.layerId, state),
    );
    command.execute();
    setUndoRedoManager((draft) => {
      draft.undoStack.push(command);
      draft.redoStack = [];
    });
    originalRef.current = null;
    onOpenChange(false);
  }, [applyState, buildAllLUTs, curves, detachPreviewFilter, onOpenChange, setUndoRedoManager, stopDialogDragging]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const channelOptions: { value: Channel; label: string }[] = [
    { value: "rgb", label: "RGB" },
    { value: "red", label: "Red" },
    { value: "green", label: "Green" },
    { value: "blue", label: "Blue" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) cancel();
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Content
          ref={dialogContentRef}
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg data-[state=open]:animate-none data-[state=closed]:animate-none"
          style={{ transform: "translate(-50%, -50%)", transition: "none" }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            cancel();
          }}
        >
          {/* Draggable title bar */}
          <DialogHeader
            className="-mx-6 -mt-6 mb-2 cursor-move select-none rounded-t-lg border-b bg-muted/70 px-6 py-3"
            onPointerDown={handleDragStart}
          >
            <DialogTitle className="text-base">Curves</DialogTitle>
            <DialogDescription className="text-xs">
              Drag this top bar to move the window
            </DialogDescription>
          </DialogHeader>

          {/* Channel selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Channel:</span>
            <select
              className="rounded border bg-background px-2 py-1 text-sm"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value as Channel);
                setSelectedIndex(null);
                setInputVal("");
                setOutputVal("");
              }}
            >
              {channelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Curves graph */}
          <div className="flex gap-4">
            {/* Output axis label */}
            <div className="flex flex-col justify-between text-xs text-muted-foreground select-none w-4">
              <span>255</span>
              <span className="rotate-[-90deg] origin-center translate-x-[-4px]">Output</span>
              <span>0</span>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <canvas
                ref={graphCanvasRef}
                width={GRAPH_SIZE}
                height={GRAPH_SIZE}
                className="w-full rounded border cursor-crosshair"
                style={{ imageRendering: "pixelated", aspectRatio: "1 / 1" }}
                onPointerDown={handleGraphPointerDown}
                onPointerMove={handleGraphPointerMove}
                onPointerUp={handleGraphPointerUp}
                onPointerLeave={handleGraphPointerUp}
              />
              {/* Input axis label */}
              <div className="flex justify-between text-xs text-muted-foreground select-none">
                <span>0</span>
                <span>Input</span>
                <span>255</span>
              </div>
            </div>
          </div>

          {/* Input / Output fields */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              Input:
              <input
                type="number"
                min={0}
                max={255}
                value={inputVal}
                className="h-8 w-16 rounded border bg-background px-2 text-right text-sm"
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={() => commitInputOutput(inputVal, outputVal)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitInputOutput(inputVal, outputVal);
                }}
                disabled={selectedIndex === null}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Output:
              <input
                type="number"
                min={0}
                max={255}
                value={outputVal}
                className="h-8 w-16 rounded border bg-background px-2 text-right text-sm"
                onChange={(e) => setOutputVal(e.target.value)}
                onBlur={() => commitInputOutput(inputVal, outputVal)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitInputOutput(inputVal, outputVal);
                }}
                disabled={selectedIndex === null}
              />
            </label>
          </div>

          {/* Preview toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preview}
              onChange={(e) => setPreview(e.target.checked)}
            />
            Preview
          </label>

          {/* Action buttons */}
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button variant="outline" onClick={cancel}>
              Cancel
            </Button>
            <Button onClick={apply}>Apply</Button>
          </DialogFooter>

          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={cancel}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default CurvesDialog;

// ---------------------------------------------------------------------------
// Private helper
// ---------------------------------------------------------------------------

function clampInt(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
