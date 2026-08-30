import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { ImageLayer } from "@/models/project/Layers/Layers";
import {
  documentPixelFromPointer,
  documentLineToScreen,
  getVisibleDocumentBounds,
  physicalPixelLineWidth,
  shouldShowPixelGrid,
} from "@/utils/PixelInspection";
import { Graphics } from "pixi.js";
import { useEffect, useState } from "react";

const PixelGridOverlay: React.FC = () => {
  const { app, container, pixelGridEnabled } = useCanvas();
  const { layerManager } = useProject();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; screenX: number; screenY: number; rgba?: string; hex?: string; proxy: boolean } | null>(null);

  useEffect(() => {
    if (!app.current || !container) return;
    const graphics = new Graphics();
    graphics.eventMode = "none";
    graphics.zIndex = 1_000_000;
    app.current.stage.sortableChildren = true;
    app.current.stage.addChild(graphics);
    app.current.stage.sortChildren();
    graphics.visible = false;
    const canvas = app.current.canvas as HTMLCanvasElement;
    const handlePointerMove = (event: PointerEvent) => {
      if (container.scale.x < 8) { setTooltip(null); return; }
      const rect = canvas.getBoundingClientRect();
      const x = documentPixelFromPointer(event.clientX - rect.left, container.x - container.pivot.x * container.scale.x, container.scale.x);
      const y = documentPixelFromPointer(event.clientY - rect.top, container.y - container.pivot.y * container.scale.y, container.scale.y);
      if (x >= 0 && y >= 0 && x < container.originalWidth && y < container.originalHeight) {
        const selected = layerManager.layers.find((layer) => layer.id === layerManager.target);
        let rgba: string | undefined;
        let hex: string | undefined;
        if (selected instanceof ImageLayer) {
          const resource = selected.sprite.texture.source.resource;
          if (resource instanceof HTMLCanvasElement) {
            const pixel = resource.getContext("2d")?.getImageData(x, y, 1, 1).data;
            if (pixel) {
              rgba = `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${(pixel[3] / 255).toFixed(2)})`;
              hex = `#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
            }
          }
          setTooltip({ x, y, screenX: event.clientX - rect.left, screenY: event.clientY - rect.top, rgba, hex, proxy: selected.textureIsProxy });
        }
      } else setTooltip(null);
    };
    canvas.addEventListener("pointermove", handlePointerMove);
    let frame = 0;
    let previousKey = "";

    const render = () => {
      const renderer = app.current?.renderer;
      const canvas = app.current?.canvas as HTMLCanvasElement | undefined;
      if (!renderer || !canvas) return;
      const visible = shouldShowPixelGrid(pixelGridEnabled, container.scale.x);
      const key = `${visible}:${container.x}:${container.y}:${container.scale.x}:${renderer.width}:${renderer.height}:${container.originalWidth}:${container.originalHeight}`;
      if (key !== previousKey) {
        previousKey = key;
        graphics.clear();
        graphics.visible = visible;
        if (visible) {
          // Pixi stage coordinates are renderer logical coordinates. Do not
          // use the CSS bounding rect here: with renderer resolution/DPR it
          // does not describe the coordinate space used by Graphics.
          const viewportWidth = renderer.screen.width;
          const viewportHeight = renderer.screen.height;
          const dpr = window.devicePixelRatio || 1;
          const zoom = container.scale.x;
          const bounds = getVisibleDocumentBounds({
            viewportWidth,
            viewportHeight,
            documentWidth: container.originalWidth,
            documentHeight: container.originalHeight,
            zoom,
            positionX: container.x,
            positionY: container.y,
            pivotX: container.pivot.x,
            pivotY: container.pivot.y,
          });
          for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
            const screenX = documentLineToScreen(x, container.pivot.x, container.x, zoom, dpr);
            graphics.moveTo(screenX, 0).lineTo(screenX, viewportHeight);
          }
          for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
            const screenY = documentLineToScreen(y, container.pivot.y, container.y, zoom, dpr);
            graphics.moveTo(0, screenY).lineTo(viewportWidth, screenY);
          }
          // Keep the grid subtle: a single, slightly thinner physical-pixel line
          // avoids the heavy two-tone appearance at high zoom levels.
          graphics.stroke({ color: 0x000000, alpha: 0.65, width: physicalPixelLineWidth(dpr) * 0.75 });
        }
      }
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      graphics.removeFromParent();
      graphics.destroy();
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  }, [app, container, pixelGridEnabled, layerManager]);

  return tooltip ? (
    <div className="pointer-events-none fixed z-[100] rounded bg-black/80 px-2 py-1 text-[10px] text-white" style={{ left: tooltip.screenX + 12, top: tooltip.screenY + 12 }}>
      Pixel ({tooltip.x}, {tooltip.y}) · {tooltip.rgba ?? "RGBA unavailable"} · {tooltip.hex ?? "#--------"} · {tooltip.proxy ? "proxy" : "full-resolution"}
    </div>
  ) : null;
};

export default PixelGridOverlay;
