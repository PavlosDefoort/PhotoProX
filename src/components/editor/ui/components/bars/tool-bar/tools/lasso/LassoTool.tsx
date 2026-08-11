import { Button } from "@/components/ui/button";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { closeSelectionPath, combineSelectionPaths, createFullLayerSelection, sampleSelectionPoint, sourcePixelFromSpriteLocal } from "@/utils/SelectionGeometry";
import { Graphics } from "pixi.js";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Variant = "lasso" | "polygonal" | "magnetic";
type Point = { x: number; y: number };
const variants: Array<[Variant, string]> = [["lasso", "Lasso"], ["polygonal", "Polygonal"], ["magnetic", "Magnetic"]];

const LassoTool: React.FC = () => {
  const { app, container } = useCanvas();
  const { editMode, setEditMode, layerManager, editDocument, setEditDocument } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);
  const [variant, setVariant] = useState<Variant>("lasso");
  const [mode, setMode] = useState<"new" | "add" | "subtract" | "intersect">("new");
  const [feather, setFeather] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]); const dragging = useRef<number | null>(null); const overlay = useRef<Graphics | null>(null);
  const setPath = (value: Point[]) => { pointsRef.current = value; setPoints(value); };
  const pointFor = useCallback((event: PointerEvent) => {
    if (!(target instanceof ImageLayer) || !app.current) return null;
    const canvas = app.current.canvas as HTMLCanvasElement; const r = canvas.getBoundingClientRect();
    const global = { x: (event.clientX - r.left) / r.width * app.current.renderer.width, y: (event.clientY - r.top) / r.height * app.current.renderer.height };
    const local = target.sprite.toLocal(global); const w = Math.max(1, target.sprite.texture.width), h = Math.max(1, target.sprite.texture.height);
    return sourcePixelFromSpriteLocal(local, w, h);
  }, [app, target]);
  const draw = useCallback(() => {
    if (!(target instanceof ImageLayer)) return;
    if (!overlay.current) { overlay.current = new Graphics(); overlay.current.eventMode = "none"; }
    const g = overlay.current; if (g.parent !== target.sprite) { g.removeFromParent(); target.sprite.addChild(g); }
    g.clear(); const w = target.sprite.texture.width, h = target.sprite.texture.height;
    const render = (path: Point[], color = 0xffffff) => { if (!path.length) return; g.moveTo(path[0].x - w / 2, path[0].y - h / 2); path.slice(1).forEach(p => g.lineTo(p.x - w / 2, p.y - h / 2)); g.stroke({ width: 1.5 / Math.max(.001, Math.hypot(target.sprite.worldTransform.a, target.sprite.worldTransform.b)), color }); };
    editDocument.selections[target.id]?.paths.forEach(path => render(path.points)); render(points, 0x60a5fa);
    container && (container.compositeNeeded = true);
  }, [container, editDocument.selections, points, target]);
  const commit = useCallback(() => { if (!(target instanceof ImageLayer)) return; const closed = closeSelectionPath(pointsRef.current); if (!closed.length) return; setEditDocument(d => { const old = d.selections[target.id]; d.selections[target.id] = { layerId: target.id, inverted: old?.inverted ?? false, paths: combineSelectionPaths(old?.paths, { kind: variant, points: closed, feather, mode }, mode) }; }); setPath([]); }, [feather, mode, setEditDocument, target, variant]);
  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { if (editMode !== "lasso" || !(target instanceof ImageLayer) || !app.current) return; const canvas = app.current.canvas as HTMLCanvasElement;
    const down = (e: PointerEvent) => { if (e.button) return; const p = pointFor(e); if (!p) return; if (variant === "lasso" || variant === "magnetic") { dragging.current = e.pointerId; setPath([p]); canvas.setPointerCapture?.(e.pointerId); } else { const current = pointsRef.current; if (current.length >= 3 && Math.hypot(p.x-current[0].x,p.y-current[0].y)<12) { commit(); return; } setPath([...current,p]); } e.preventDefault(); };
    const move = (e: PointerEvent) => { const p = pointFor(e); if (!p) return; if (dragging.current === e.pointerId) setPath(sampleSelectionPoint(pointsRef.current, p)); };
    const up = (e: PointerEvent) => { if (dragging.current !== e.pointerId) return; dragging.current = null; commit(); };
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==="d") { setEditDocument(d => { delete d.selections[target.id]; }); setPath([]); e.preventDefault(); } else if (e.key === "Escape") setPath([]); else if (e.key === "Enter") commit(); else if ((e.key === "Backspace" || e.key === "Delete") && variant === "polygonal") setPath(pointsRef.current.slice(0,-1)); };
    canvas.addEventListener("pointerdown", down); window.addEventListener("pointermove",move); window.addEventListener("pointerup",up); window.addEventListener("keydown",key); return () => { canvas.removeEventListener("pointerdown",down); window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); window.removeEventListener("keydown",key); dragging.current=null; overlay.current?.removeFromParent(); };
  }, [app, commit, editMode, pointFor, setEditDocument, target, variant]);
  if (editMode !== "lasso" || !(target instanceof ImageLayer)) return null;
  return <div className="z-10 flex h-9 items-center gap-2 overflow-x-auto border-b-2 border-[#cdcdcd] bg-navbarBackground px-3 text-black dark:border-[#252525] dark:bg-navbarBackground dark:text-white">{variants.map(([v,label]) => <Button key={v} className="h-7 px-2 text-xs" variant={variant===v?"default":"outline"} onClick={()=>{setVariant(v);setPath([])}}>{label}</Button>)}<select value={mode} onChange={e=>setMode(e.target.value as typeof mode)} className="h-7 text-xs text-black"><option value="new">New</option><option value="add">Add</option><option value="subtract">Subtract</option><option value="intersect">Intersect</option></select><label className="text-xs">Feather <input className="w-14 text-black" type="number" min="0" value={feather} onChange={e=>setFeather(Math.max(0,Number(e.target.value)||0))}/></label><Button className="h-7 px-2 text-xs" variant="outline" onClick={()=>setEditDocument(d=>{d.selections[target.id]=createFullLayerSelection(target.id,target.sprite.texture.width,target.sprite.texture.height)})}>Select All</Button><Button className="h-7 px-2 text-xs" variant="outline" onClick={()=>setEditDocument(d=>{const s=d.selections[target.id];if(s)s.inverted=!s.inverted})}>Invert</Button><Button className="h-7 px-2 text-xs" variant="outline" onClick={()=>setEditDocument(d=>{delete d.selections[target.id]})}>Deselect</Button></div>;
};
export default LassoTool;
