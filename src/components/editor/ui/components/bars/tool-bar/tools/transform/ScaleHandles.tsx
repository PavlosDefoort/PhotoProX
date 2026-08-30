import { Graphics, Matrix } from "pixi.js";
import React, { useCallback, useEffect, useRef } from "react";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { useImageTransformActions } from "@/hooks/useImageTransformActions";
import { useCanvas } from "@/hooks/useCanvas";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const ScaleHandles: React.FC<{
  target: ImageLayer;
  onUpdate: () => void;
  isRatioLocked: boolean;
}> = ({ target, onUpdate, isRatioLocked }) => {
  const { container, app, canvas } = useCanvas();
  const { dispatchSelectedImageActions } = useImageTransformActions();
  const overlayRef = useRef<Graphics | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    kind: "scale" | "move";
    handle?: Handle;
    width: number;
    height: number;
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
    scaleX: number;
    scaleY: number;
    inverseWorld: Matrix;
  } | null>(null);

  const draw = useCallback(() => {
    const sprite = target.sprite;
    let overlay = overlayRef.current;
    if (!overlay) {
      overlay = new Graphics();
      overlay.eventMode = "none";
      overlayRef.current = overlay;
    }
    if (overlay.parent !== sprite) {
      overlay.removeFromParent();
      sprite.addChild(overlay);
    }
    const width = Math.max(1, sprite.texture.width);
    const height = Math.max(1, sprite.texture.height);
    const left = -width / 2;
    const top = -height / 2;
    const right = width / 2;
    const bottom = height / 2;
    const points: Array<[Handle, number, number]> = [["nw", left, top], ["n", 0, top], ["ne", right, top], ["e", right, 0], ["se", right, bottom], ["s", 0, bottom], ["sw", left, bottom], ["w", left, 0]];
    const sx = Math.hypot(sprite.worldTransform.a, sprite.worldTransform.b) || 1;
    const sy = Math.hypot(sprite.worldTransform.c, sprite.worldTransform.d) || 1;
    const hw = 6 / sx;
    const hh = 6 / sy;
    overlay.clear();
    overlay.rect(left, top, width, height).stroke({ width: 1 / Math.min(sx, sy), color: 0xffffff });
    for (const [, x, y] of points) {
      overlay.rect(x - hw, y - hh, hw * 2, hh * 2).fill({ color: 0x2563eb }).stroke({ width: 1 / Math.min(sx, sy), color: 0xffffff });
    }
  }, [target]);

  useEffect(() => {
    if (!container) return;
    draw();
    const canvasEl = canvas.current;
    const spriteParent = target.sprite.parent;
    if (!canvasEl || !spriteParent) return;
    const globalFromEvent = (event: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      const renderer = app.current?.renderer;
      if (!renderer || rect.width === 0 || rect.height === 0) return null;
      return {
        x: (event.clientX - rect.left) * (renderer.screen.width / rect.width),
        y: (event.clientY - rect.top) * (renderer.screen.height / rect.height),
      };
    };
    const findHandle = (event: PointerEvent) => {
      const global = globalFromEvent(event);
      if (!global) return null;
      const p = target.sprite.toLocal(global);
      const width = target.sprite.texture.width;
      const height = target.sprite.texture.height;
      const points: Array<[Handle, number, number]> = [["nw", -width / 2, -height / 2], ["n", 0, -height / 2], ["ne", width / 2, -height / 2], ["e", width / 2, 0], ["se", width / 2, height / 2], ["s", 0, height / 2], ["sw", -width / 2, height / 2], ["w", -width / 2, 0]];
      const worldScale = Math.max(0.001, Math.min(
        Math.hypot(target.sprite.worldTransform.a, target.sprite.worldTransform.b),
        Math.hypot(target.sprite.worldTransform.c, target.sprite.worldTransform.d),
      ));
      const nearest = points.reduce((best, point) => {
        const distance = Math.hypot(p.x - point[1], p.y - point[2]);
        return distance < best.distance ? { handle: point[0], distance } : best;
      }, { handle: "se" as Handle, distance: Infinity });
      return nearest.distance <= 18 / worldScale ? nearest.handle : null;
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const handle = findHandle(event);
      const global = globalFromEvent(event);
      if (!global) return;
      const spritePoint = target.sprite.toLocal(global);
      const insideImage =
        Math.abs(spritePoint.x) <= target.sprite.texture.width / 2 &&
        Math.abs(spritePoint.y) <= target.sprite.texture.height / 2;
      if (!handle && !insideImage) return;
      const inverseWorld = (handle
        ? target.sprite.worldTransform
        : spriteParent.worldTransform
      ).clone().invert();
      const start = inverseWorld.apply(global);
      dragRef.current = {
        pointerId: event.pointerId,
        kind: handle ? "scale" : "move",
        handle: handle ?? undefined,
        width: target.sprite.width,
        height: target.sprite.height,
        startX: start.x,
        startY: start.y,
        positionX: target.sprite.position.x,
        positionY: target.sprite.position.y,
        scaleX: Math.abs(target.sprite.scale.x),
        scaleY: Math.abs(target.sprite.scale.y),
        inverseWorld,
      };
      canvasEl.style.cursor = handle ? canvasEl.style.cursor : "grabbing";
      canvasEl.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const hover = (event: PointerEvent) => {
      if (dragRef.current) return;
      const handle = findHandle(event);
      const global = globalFromEvent(event);
      const point = global ? target.sprite.toLocal(global) : null;
      const insideImage = point && Math.abs(point.x) <= target.sprite.texture.width / 2 && Math.abs(point.y) <= target.sprite.texture.height / 2;
      canvasEl.style.cursor = handle ? (handle === "n" || handle === "s" ? "ns-resize" : handle === "e" || handle === "w" ? "ew-resize" : handle === "ne" || handle === "sw" ? "nesw-resize" : "nwse-resize") : insideImage ? "grab" : "default";
    };
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const global = globalFromEvent(event);
      if (!global) return;
      const p = drag.inverseWorld.apply(global);
      const dx = (p.x - drag.startX) * drag.scaleX;
      const dy = (p.y - drag.startY) * drag.scaleY;
      if (drag.kind === "move") {
        target.sprite.position.set(
          drag.positionX + (p.x - drag.startX),
          drag.positionY + (p.y - drag.startY),
        );
        container.compositeNeeded = true;
        draw();
        onUpdate();
        event.preventDefault();
        return;
      }
      const handle = drag.handle!;
      const horizontal = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
      const vertical = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
      let nextWidth = Math.max(1, drag.width + dx * horizontal * 2);
      let nextHeight = Math.max(1, drag.height + dy * vertical * 2);
      if (isRatioLocked) {
        const widthScale = nextWidth / drag.width;
        const heightScale = nextHeight / drag.height;
        const scale = horizontal && vertical
          ? (Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale)
          : horizontal
            ? widthScale
            : heightScale;
        nextWidth = Math.max(1, drag.width * scale);
        nextHeight = Math.max(1, drag.height * scale);
        target.sprite.width = nextWidth;
        target.sprite.height = nextHeight;
      } else {
        if (horizontal) target.sprite.width = nextWidth;
        if (vertical) target.sprite.height = nextHeight;
      }
      container.compositeNeeded = true;
      draw();
      onUpdate();
      event.preventDefault();
    };
    const up = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      if (drag.kind === "scale") {
        dispatchSelectedImageActions([{ type: "image.setDimensions", width: target.sprite.width, height: target.sprite.height }], "Scale image with handle");
      }
      if (canvasEl.hasPointerCapture?.(event.pointerId)) canvasEl.releasePointerCapture(event.pointerId);
      canvasEl.style.cursor = "default";
    };
    canvasEl.addEventListener("pointerdown", down);
    canvasEl.addEventListener("pointermove", hover);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { canvasEl.removeEventListener("pointerdown", down); canvasEl.removeEventListener("pointermove", hover); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); canvasEl.style.cursor = "default"; overlayRef.current?.removeFromParent(); overlayRef.current?.destroy(); overlayRef.current = null; };
  }, [container, dispatchSelectedImageActions, draw, isRatioLocked, onUpdate, target]);

  return null;
};

export default ScaleHandles;
