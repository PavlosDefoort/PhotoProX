import { crossProjectDragSession } from "@/models/editor/CrossProjectDragSession";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";

const CrossProjectDragOverlay: React.FC = () => {
  const [session, setSession] = useState(crossProjectDragSession.get());
  const { activeDocumentId } = useProject();
  const { app, canvas: canvasRef, container } = useCanvas();
  useEffect(() => crossProjectDragSession.subscribe(setSession), []);
  if (!session) return null;
  const { payload, pointerScreenX, pointerScreenY, grabOffsetX, grabOffsetY } = session;
  const outlineCanvas = document.createElement("canvas");
  outlineCanvas.width = payload.width;
  outlineCanvas.height = payload.height;
  const outlineContext = outlineCanvas.getContext("2d");
  if (outlineContext) {
    const outline = outlineContext.createImageData(payload.width, payload.height);
    const selected = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < payload.width && y < payload.height &&
      (payload.outlineMask
        ? payload.outlineMask[y * payload.width + x] >= 128
        : payload.pixels[(y * payload.width + x) * 4 + 3] > 0);
    for (let y = 0; y < payload.height; y++) {
      for (let x = 0; x < payload.width; x++) {
        if (!selected(x, y)) continue;
        if (selected(x - 1, y) && selected(x + 1, y) && selected(x, y - 1) && selected(x, y + 1)) continue;
        const offset = (y * payload.width + x) * 4;
        const white = (x + y) % 8 < 4;
        outline.data[offset] = white ? 255 : 0;
        outline.data[offset + 1] = white ? 255 : 0;
        outline.data[offset + 2] = white ? 255 : 0;
        outline.data[offset + 3] = 255;
      }
    }
    outlineContext.putImageData(outline, 0, 0);
  }
  let displayWidth = payload.displayWidth ?? payload.width;
  let displayHeight = payload.displayHeight ?? payload.height;
  const sourceDisplayWidth = displayWidth;
  const sourceDisplayHeight = displayHeight;
  if (activeDocumentId && activeDocumentId !== session.sourceProjectId && app.current && canvasRef.current && container) {
    const rect = canvasRef.current.getBoundingClientRect();
    const cssScaleX = rect.width / app.current.renderer.screen.width;
    const cssScaleY = rect.height / app.current.renderer.screen.height;
    const world = container.displaySprite?.worldTransform ?? container.worldTransform;
    displayWidth = payload.width * Math.hypot(world.a, world.b) * cssScaleX;
    displayHeight = payload.height * Math.hypot(world.c, world.d) * cssScaleY;
  }
  const displayedGrabOffsetX = sourceDisplayWidth ? (grabOffsetX / sourceDisplayWidth) * displayWidth : 0;
  const displayedGrabOffsetY = sourceDisplayHeight ? (grabOffsetY / sourceDisplayHeight) * displayHeight : 0;
  const left = pointerScreenX - displayedGrabOffsetX;
  const top = pointerScreenY - displayedGrabOffsetY;
  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[2147483647]"
      style={{
        left,
        top,
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <img
        src={outlineCanvas.toDataURL()}
        alt=""
        className="absolute inset-0 h-full w-full [image-rendering:pixelated] drop-shadow-[0_0_1px_rgba(0,0,0,0.95)]"
      />
    </div>,
    document.body,
  );
};
export default CrossProjectDragOverlay;
