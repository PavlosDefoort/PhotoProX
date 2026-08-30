// New Movement
import React, { useEffect, useRef } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { compositeToRT } from "@/utils/PixiUtils";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE, shouldUseNearestPreview } from "@/utils/PixelInspection";

interface PinchHandlerProps {
  target: React.RefObject<Element>;
}

const MovementHandler: React.FC<PinchHandlerProps> = ({ target }) => {
  const {
    app,
    container,
    currentZoom,
    setCurrentZoom,
    targetZoom,
    setTargetZoom,
    targetPosition,
    pendingZoomSnap,
  } = useCanvas();

  const isPinching = useRef(false);

  // Ref to hold latest currentZoom for animation loop (avoids stale closure)
  // ONLY written by the animation loop — not synced from React state to avoid race conditions
  const currentZoomRef = useRef(currentZoom);

  // Ref to hold latest targetZoom so animation loop doesn't need it as a dependency
  const targetZoomRef = useRef(targetZoom);

  // Zoom anchor: the world point and screen point that should stay locked together
  const zoomAnchor = useRef<{
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Keep targetZoomRef in sync with targetZoom state
  useEffect(() => {
    targetZoomRef.current = targetZoom;
  }, [targetZoom]);

  // Wheel handler for zoom and pan
  useEffect(() => {
    if (!app.current?.canvas || !container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const maxZoom = MAX_ZOOM_SCALE;
      const minZoom = MIN_ZOOM_SCALE;
      const zoomSensitivity = 0.0015;

      const canvasBounds = app.current?.canvas.getBoundingClientRect();
      if (!canvasBounds) return;

      const deltaMultiplier =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvasBounds.height : 1;
      const normalizedDeltaY = e.deltaY * deltaMultiplier;

      // Mouse position relative to canvas
      const mouseX = e.clientX - canvasBounds.left;
      const mouseY = e.clientY - canvasBounds.top;

      if (e.ctrlKey && !isPinching.current) {
        // Use the latest target as the base so rapid wheel events accumulate smoothly.
        const baseZoom =
          targetZoomRef.current > 0
            ? targetZoomRef.current
            : currentZoomRef.current;
        const zoomFactor = Math.exp(-normalizedDeltaY * zoomSensitivity);
        const newTargetZoom = Math.min(
          maxZoom,
          Math.max(minZoom, baseZoom * zoomFactor),
        );

        if (Math.abs(newTargetZoom - baseZoom) < 0.000001) return;

        // Strict cursor-anchored zoom: apply exact transform immediately.
        const worldX =
          (mouseX - container.x) / container.scale.x + container.pivot.x;
        const worldY =
          (mouseY - container.y) / container.scale.y + container.pivot.y;
        const newX = mouseX - (worldX - container.pivot.x) * newTargetZoom;
        const newY = mouseY - (worldY - container.pivot.y) * newTargetZoom;

        container.scale.set(newTargetZoom);
        container.x = newX;
        container.y = newY;

        if (container.displaySprite) {
          container.displaySprite.x = newX;
          container.displaySprite.y = newY;
          container.displaySprite.scale.set(newTargetZoom);
        }

        targetPosition.current.x = newX;
        targetPosition.current.y = newY;
        currentZoomRef.current = newTargetZoom;
        targetZoomRef.current = newTargetZoom;
        zoomAnchor.current = null;

        setTargetZoom(newTargetZoom);
        setCurrentZoom(newTargetZoom);
      } else {
        // Pan — clear zoom anchor so position lerps freely
        zoomAnchor.current = null;
        targetPosition.current.x -= e.deltaX;
        targetPosition.current.y -= e.deltaY;
      }
    };

    app.current.canvas.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      app.current?.canvas.removeEventListener("wheel", handleWheel);
    };
  }, [app, container, setCurrentZoom, setTargetZoom, targetPosition]);

  // Animation loop
  useEffect(() => {
    if (!container) return;

    let animationFrameId: number;
    const zoomSpeed = 0.4;
    const panSpeed = 0.3;
    const panThreshold = 0.05;
    const zoomThreshold = 0.0005;
    let frameCount = 0;

    const animate = () => {
      if (!container) return;

      // If a document switch has queued a synchronous snap, apply it now —
      // before any interpolation so the container is at the correct position
      // for this frame, eliminating the multi-frame lag that causes the flash.
      const snap = pendingZoomSnap.current;
      if (snap) {
        pendingZoomSnap.current = null;
        currentZoomRef.current = snap.zoom;
        targetZoomRef.current = snap.zoom;
        zoomAnchor.current = null;
        container.scale.set(snap.zoom);
        container.x = snap.x;
        container.y = snap.y;
        if (container.displaySprite) {
          container.displaySprite.x = snap.x;
          container.displaySprite.y = snap.y;
          container.displaySprite.scale.set(snap.zoom);
        }
        // Composite the render texture immediately so the display sprite shows
        // the correct pixels at the new transform without waiting another frame.
        if (app.current) {
          compositeToRT(app.current.renderer, container);
          container.compositeNeeded = false;
        }
      }

      const tZoom = targetZoomRef.current;

      // Logarithmic zoom interpolation for perceptually uniform smoothing
      const logCurrent = Math.log(currentZoomRef.current);
      const logTarget = Math.log(tZoom);
      const newZoom = Math.exp(
        logCurrent + (logTarget - logCurrent) * zoomSpeed,
      );

      const zoomGap = Math.abs(tZoom - currentZoomRef.current);

      if (zoomAnchor.current && zoomGap > zoomThreshold) {
        // Zoom mode: derive position from zoom anchor so they stay coupled
        const appliedZoom = newZoom;
        const { worldX, worldY, screenX, screenY } = zoomAnchor.current;

        container.scale.set(appliedZoom);
        // Derive position accounting for pivot: pos = screen - (local - pivot) * scale
        container.x = screenX - (worldX - container.pivot.x) * appliedZoom;
        container.y = screenY - (worldY - container.pivot.y) * appliedZoom;

        // Sync pan target so pan picks up seamlessly after zoom ends
        targetPosition.current.x = container.x;
        targetPosition.current.y = container.y;

        currentZoomRef.current = appliedZoom;
        if (++frameCount % 3 === 0) setCurrentZoom(appliedZoom);
      } else {
        // Pan mode (or zoom finished): lerp position independently
        if (zoomAnchor.current) {
          // Zoom just finished: snap to the exact anchored final transform.
          const { worldX, worldY, screenX, screenY } = zoomAnchor.current;
          container.scale.set(tZoom);
          container.x = screenX - (worldX - container.pivot.x) * tZoom;
          container.y = screenY - (worldY - container.pivot.y) * tZoom;

          targetPosition.current.x = container.x;
          targetPosition.current.y = container.y;

          currentZoomRef.current = tZoom;
          setCurrentZoom(tZoom);
          zoomAnchor.current = null;
        }

        const tX = targetPosition.current.x;
        const tY = targetPosition.current.y;
        const panDiffX = Math.abs(tX - container.x);
        const panDiffY = Math.abs(tY - container.y);

        if (panDiffX > panThreshold || panDiffY > panThreshold) {
          container.x += (tX - container.x) * panSpeed;
          container.y += (tY - container.y) * panSpeed;
        } else if (panDiffX > 0 || panDiffY > 0) {
          container.x = tX;
          container.y = tY;
        }

        // Handle programmatic zoom (e.g. fit-to-screen)
        if (zoomGap > zoomThreshold) {
          const appliedZoom = newZoom;
          container.scale.set(appliedZoom);
          currentZoomRef.current = appliedZoom;
          if (++frameCount % 3 === 0) setCurrentZoom(appliedZoom);
        } else if (currentZoomRef.current !== tZoom) {
          container.scale.set(tZoom);
          currentZoomRef.current = tZoom;
          setCurrentZoom(tZoom);
        }
      }

      // Sync displaySprite transform to match container
      if (container.displaySprite) {
        container.displaySprite.visible = !container.directRenderMode;
        container.displaySprite.x = container.x;
        container.displaySprite.y = container.y;
        container.displaySprite.scale.set(container.scale.x, container.scale.y);
        const scaleMode = shouldUseNearestPreview(container.scale.x) ? "nearest" : "linear";
        if (container.displaySprite.texture.source.style.scaleMode !== scaleMode) {
          container.displaySprite.texture.source.style.scaleMode = scaleMode;
        }
      }

      if (container.directRenderMode) {
        // In direct render mode (inpaint), bypass RT composite clipping.
        container.renderable = true;
      }

      // Composite into RenderTexture if content changed
      if (
        !container.directRenderMode &&
        (container.compositeNeeded || container.alwaysComposite) &&
        app.current
      ) {
        compositeToRT(app.current.renderer, container);
        container.compositeNeeded = false;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [container, setCurrentZoom, targetPosition]);

  return null;
};

export default MovementHandler;
