import { Button } from "@/components/ui/button";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { closeSelectionPath, commitSelectionOperand, createFullLayerSelection, rasterizeSelectionMask, sampleSelectionCoverage, sampleSelectionPoint, sourcePixelFromSpriteLocal, traceSelectionMaskBoundary, translateSelection } from "@/utils/SelectionGeometry";
import { Graphics } from "pixi.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BEFORE_DOCUMENT_SWITCH_EVENT } from "@/components/editor/editorEvents";
import type { SelectionCombineMode } from "@/interfaces/editor/EditDocument";
import { scaleSelectionForPreview } from "@/utils/RasterPreview";

export type LassoVariant = "lasso" | "polygonal" | "magnetic";
type Point = { x: number; y: number };
export const lassoVariants: Array<[LassoVariant, string]> = [["lasso", "Lasso"], ["polygonal", "Polygonal"], ["magnetic", "Magnetic"]];

interface LassoToolProps {
  variant: LassoVariant;
  mode: SelectionCombineMode;
  setMode: React.Dispatch<React.SetStateAction<SelectionCombineMode>>;
  showToolOptions?: boolean;
}

const LassoTool: React.FC<LassoToolProps> = ({ variant, mode, setMode, showToolOptions = true }) => {
  const { app, container } = useCanvas();
  const { editMode, setEditMode, layerManager, editDocument, setEditDocument } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);
  const [feather, setFeather] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]); const dragging = useRef<number | null>(null); const pathOverlay = useRef<Graphics | null>(null); const committedOverlay = useRef<Graphics | null>(null);
  const selectionPreviewOffset = useRef({ x: 0, y: 0 });
  const selectionDrag = useRef<{ pointerId: number; start: Point; dx: number; dy: number } | null>(null);
  const setPath = (value: Point[]) => { pointsRef.current = value; setPoints(value); };
  const pointFor = useCallback((event: PointerEvent) => {
    if (!(target instanceof ImageLayer) || !app.current) return null;
    const canvas = app.current.canvas as HTMLCanvasElement; const r = canvas.getBoundingClientRect();
    // Pixi's scene graph is expressed in logical screen coordinates. The
    // renderer width/height may be physical pixels when autoDensity is on;
    // using those values here shifts recorded selection points on HiDPI
    // canvases and causes adjustments to use an offset mask.
    const screen = app.current.renderer.screen;
    const global = { x: (event.clientX - r.left) / r.width * screen.width, y: (event.clientY - r.top) / r.height * screen.height };
    const local = target.sprite.toLocal(global); const w = Math.max(1, target.sprite.texture.width), h = Math.max(1, target.sprite.texture.height);
    return sourcePixelFromSpriteLocal(local, w, h);
  }, [app, target]);
  const committedPreview = useMemo(() => {
    if (!(target instanceof ImageLayer)) return null;
    const selection = editDocument.selections[target.id];
    if (!selection?.paths.length) return null;
    const sourceWidth = target.sprite.texture.width;
    const sourceHeight = target.sprite.texture.height;
    if (selection.paths.length === 1 && selection.paths[0].mode === "new" && !selection.inverted) {
      const minimumPreviewDistance = Math.max(1.5, Math.max(sourceWidth, sourceHeight) / 1024);
      const sampled = closeSelectionPath(selection.paths[0].points.reduce<Point[]>((result, point) => sampleSelectionPoint(result, point, minimumPreviewDistance), []));
      return {
        contours: [sampled.map(point => ({
          x: point.x - sourceWidth / 2,
          y: point.y - sourceHeight / 2,
        }))],
      };
    }
    const previewScale = Math.min(1, 128 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * previewScale));
    const height = Math.max(1, Math.round(sourceHeight * previewScale));
    const scaled = scaleSelectionForPreview(selection, sourceWidth, sourceHeight, width, height)!;
    const simplified = {
      ...scaled,
      paths: scaled.paths.map(path => ({
        ...path,
        points: closeSelectionPath(path.points.reduce<Point[]>((sampled, point) => sampleSelectionPoint(sampled, point, .75), [])),
      })),
    };
    const mask = rasterizeSelectionMask(simplified, width, height);
    const scaleX = sourceWidth / width, scaleY = sourceHeight / height;
    const contours = traceSelectionMaskBoundary(mask, width, height).map(contour => contour.map(point => ({
      x: point.x * scaleX - sourceWidth / 2,
      y: point.y * scaleY - sourceHeight / 2,
    })));
    return { contours };
  }, [editDocument.selections, target]);
  useEffect(() => {
    selectionPreviewOffset.current = { x: 0, y: 0 };
  }, [committedPreview, target]);
  useEffect(() => {
    if ((editMode !== "lasso" && editMode !== "move") || !(target instanceof ImageLayer) || !app.current || !committedPreview?.contours.length) return;
    const application = app.current;
    const g = new Graphics();
    g.eventMode = "none";
    target.sprite.addChild(g);
    committedOverlay.current = g;
    g.position.set(selectionPreviewOffset.current.x, selectionPreviewOffset.current.y);
    let phase = 0;
    const animate = () => {
      if (!g.parent) return;
      phase = (phase + application.ticker.deltaMS * .035) % 8;
      const matrix = target.sprite.worldTransform;
      const screenScale = Math.max(.001, Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c)));
      const lineWidth = 1 / screenScale;
      g.clear();
      for (const contour of committedPreview.contours) {
        if (contour.length < 2) continue;
        g.moveTo(contour[0].x, contour[0].y);
        contour.slice(1).forEach(point => g.lineTo(point.x, point.y));
      }
      g.stroke({ width: lineWidth, color: 0x000000 });
      const dashLength = 4;
      for (const contour of committedPreview.contours) {
        let travelled = 0;
        for (let index = 1; index < contour.length; index++) {
          const from = contour[index - 1], to = contour[index];
          const dx = to.x - from.x, dy = to.y - from.y;
          const screenDx = matrix.a * dx + matrix.c * dy;
          const screenDy = matrix.b * dx + matrix.d * dy;
          const length = Math.hypot(screenDx, screenDy);
          let offset = 0;
          while (offset < length) {
            const shifted = travelled + offset + phase;
            const block = Math.floor(shifted / dashLength);
            const remaining = dashLength - ((shifted % dashLength) + dashLength) % dashLength;
            const amount = Math.min(remaining, length - offset);
            if (block % 2 === 0 && length > 0) {
              const start = offset / length, end = (offset + amount) / length;
              g.moveTo(from.x + dx * start, from.y + dy * start);
              g.lineTo(from.x + dx * end, from.y + dy * end);
            }
            offset += Math.max(amount, .001);
          }
          travelled += length;
        }
      }
      g.stroke({ width: lineWidth, color: 0xffffff });
      if (container) container.compositeNeeded = true;
    };
    animate();
    application.ticker.add(animate);
    return () => {
      application.ticker.remove(animate);
      g.removeFromParent();
      g.destroy();
      if (committedOverlay.current === g) committedOverlay.current = null;
    };
  }, [app, committedPreview, container, editMode, target]);
  useEffect(() => {
    const handleMovePreview = (event: Event) => {
      const detail = (event as CustomEvent<{ layerId: string; dx: number; dy: number }>).detail;
      if (editMode === "move" && target instanceof ImageLayer && detail.layerId === target.id) {
        selectionPreviewOffset.current = { x: detail.dx, y: detail.dy };
        committedOverlay.current?.position.set(detail.dx, detail.dy);
      }
    };
    window.addEventListener("zynalo:selection-move-preview", handleMovePreview);
    return () => window.removeEventListener("zynalo:selection-move-preview", handleMovePreview);
  }, [editMode, target]);
  useEffect(() => {
    const handleMoveState = (event: Event) => {
      const dragging = (event as CustomEvent<{ dragging: boolean }>).detail.dragging;
      if (committedOverlay.current) committedOverlay.current.visible = !dragging;
      if (container) container.compositeNeeded = true;
    };
    window.addEventListener("zynalo:selection-move-state", handleMoveState);
    return () => window.removeEventListener("zynalo:selection-move-state", handleMoveState);
  }, [container]);
  useEffect(() => {
    if (!(target instanceof ImageLayer) || editMode !== "lasso") { pathOverlay.current?.removeFromParent(); return; }
    if (!pathOverlay.current) { pathOverlay.current = new Graphics(); pathOverlay.current.eventMode = "none"; }
    const g = pathOverlay.current;
    if (g.parent !== target.sprite) { g.removeFromParent(); target.sprite.addChild(g); }
    g.clear();
    if (points.length) {
      const w = target.sprite.texture.width, h = target.sprite.texture.height;
      const matrix = target.sprite.worldTransform;
      const screenScale = Math.max(.001, Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c)));
      g.moveTo(points[0].x - w / 2, points[0].y - h / 2);
      points.slice(1).forEach(point => g.lineTo(point.x - w / 2, point.y - h / 2));
      g.stroke({ width: 1.5 / screenScale, color: 0x60a5fa });
    }
    if (container) container.compositeNeeded = true;
  }, [container, editMode, points, target]);
  const commit = useCallback((requestedMode: SelectionCombineMode) => { if (!(target instanceof ImageLayer)) return; const closed = closeSelectionPath(pointsRef.current); if (!closed.length) return; setEditDocument(d => { d.selections[target.id] = commitSelectionOperand(d.selections[target.id], target.id, variant, closed, requestedMode, feather); }); setPath([]); }, [feather, setEditDocument, target, variant]);
  useEffect(() => {
    const handleDocumentSwitch = () => {
      setPath([]);
      pathOverlay.current?.removeFromParent();
    };

    window.addEventListener(BEFORE_DOCUMENT_SWITCH_EVENT, handleDocumentSwitch);
    return () => {
      window.removeEventListener(
        BEFORE_DOCUMENT_SWITCH_EVENT,
        handleDocumentSwitch,
      );
    };
  }, []);
  useEffect(() => { if (editMode !== "lasso" || !(target instanceof ImageLayer) || !app.current) return; const canvas = app.current.canvas as HTMLCanvasElement;
    const down = (e: PointerEvent) => { if (e.button) return; const p = pointFor(e); if (!p) return; const selection = editDocument.selections[target.id]; if (mode === "new" && selection && sampleSelectionCoverage(selection, p) >= .5) { selectionDrag.current = { pointerId: e.pointerId, start: p, dx: 0, dy: 0 }; canvas.setPointerCapture?.(e.pointerId); e.preventDefault(); return; } if (variant === "lasso" || variant === "magnetic") { dragging.current = e.pointerId; setPath([p]); canvas.setPointerCapture?.(e.pointerId); } else { const current = pointsRef.current; if (current.length >= 3 && Math.hypot(p.x-current[0].x,p.y-current[0].y)<12) { commit(mode); return; } setPath([...current,p]); } e.preventDefault(); };
    const move = (e: PointerEvent) => { const p = pointFor(e); if (!p) return; if (selectionDrag.current?.pointerId === e.pointerId) { selectionDrag.current.dx = p.x - selectionDrag.current.start.x; selectionDrag.current.dy = p.y - selectionDrag.current.start.y; committedOverlay.current?.position.set(selectionDrag.current.dx, selectionDrag.current.dy); return; } if (dragging.current === e.pointerId) setPath(sampleSelectionPoint(pointsRef.current, p)); };
    const up = (e: PointerEvent) => { if (selectionDrag.current?.pointerId === e.pointerId) { const { dx, dy } = selectionDrag.current; selectionDrag.current = null; committedOverlay.current?.position.set(0, 0); if (dx || dy) setEditDocument(d => { const selection = d.selections[target.id]; if (selection) d.selections[target.id] = translateSelection(selection, dx, dy); }); return; } if (dragging.current !== e.pointerId) return; dragging.current = null; commit(mode); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setPath([]); else if (e.key === "Enter") commit(mode); else if ((e.key === "Backspace" || e.key === "Delete") && variant === "polygonal") setPath(pointsRef.current.slice(0,-1)); };
    canvas.addEventListener("pointerdown", down); window.addEventListener("pointermove",move); window.addEventListener("pointerup",up); window.addEventListener("keydown",key); return () => { canvas.removeEventListener("pointerdown",down); window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); window.removeEventListener("keydown",key); dragging.current=null; selectionDrag.current=null; committedOverlay.current?.position.set(0, 0); pathOverlay.current?.removeFromParent(); };
  }, [app, commit, editDocument.selections, editMode, mode, pointFor, setEditDocument, target, variant]);
  useEffect(() => () => {
    pathOverlay.current?.removeFromParent();
    pathOverlay.current?.destroy();
    pathOverlay.current = null;
  }, []);
  if (!showToolOptions || editMode !== "lasso" || !(target instanceof ImageLayer)) return null;
  return <div className="z-10 flex h-9 items-center gap-2 overflow-x-auto border-b-2 border-[#cdcdcd] bg-navbarBackground px-3 text-black dark:border-[#252525] dark:bg-navbarBackground dark:text-white"><div className="flex items-center gap-1">{(["new", "add", "subtract", "intersect"] as const).map(option => <Button type="button" key={option} className="h-7 px-2 text-xs capitalize" variant={mode === option ? "default" : "outline"} aria-pressed={mode === option} onClick={() => setMode(option)}>{option}</Button>)}</div><label className="text-xs">Feather <input className="w-14 text-black" type="number" min="0" value={feather} onChange={e=>setFeather(Math.max(0,Number(e.target.value)||0))}/></label><Button className="h-7 px-2 text-xs" variant="outline" onClick={()=>setEditDocument(d=>{d.selections[target.id]=createFullLayerSelection(target.id,target.sprite.texture.width,target.sprite.texture.height)})}>Select All</Button><Button className="h-7 px-2 text-xs" variant="outline" onClick={()=>setEditDocument(d=>{const s=d.selections[target.id];if(s)s.inverted=!s.inverted})}>Invert</Button><Button className="h-7 px-2 text-xs" variant="outline" onClick={()=>setEditDocument(d=>{delete d.selections[target.id]})}>Deselect</Button></div>;
};
export default LassoTool;
