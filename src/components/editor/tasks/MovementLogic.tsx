// New Movement
import React, { useEffect, useRef } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { compositeToRT } from "@/utils/PixiUtils";

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
  } = useCanvas();

  const targetWorldMousePos = useRef({ x: 0, y: 0 });
  const targetMousePos = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  // Track if zoom was user-triggered (wheel or pinch)
  const zoomFromUser = useRef(false);

  // Ref to hold latest currentZoom for animation loop (avoids stale closure)
  const currentZoomRef = useRef(currentZoom);

  // Keep currentZoomRef in sync with currentZoom state
  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  // Wheel handler for zoom and pan
  useEffect(() => {
    if (!app.current?.canvas || !container) return;

    const canvasBounds = app.current.canvas.getBoundingClientRect();

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomStep = 1.1;
      const maxZoom = 5;
      const minZoom = 0.05;
      const minStepAbsolute = 0.01;

      // Mouse position relative to canvas
      const mouseX = e.clientX - canvasBounds.left;
      const mouseY = e.clientY - canvasBounds.top;

      if (e.ctrlKey && !isPinching.current) {
        // User zoom
        zoomFromUser.current = true;

        let newTargetZoom = currentZoomRef.current;

        if (e.deltaY < 0) {
          newTargetZoom =
            currentZoomRef.current < 0.2
              ? Math.min(currentZoomRef.current + minStepAbsolute, maxZoom)
              : Math.min(currentZoomRef.current * zoomStep, maxZoom);
        } else {
          newTargetZoom =
            currentZoomRef.current < 0.2
              ? Math.max(currentZoomRef.current - minStepAbsolute, minZoom)
              : Math.max(currentZoomRef.current / zoomStep, minZoom);
        }

        // Set world pos under cursor
        const worldPos = {
          x: (mouseX - container.x) / container.scale.x,
          y: (mouseY - container.y) / container.scale.y,
        };

        targetWorldMousePos.current = worldPos;
        targetMousePos.current = { x: mouseX, y: mouseY };

        setTargetZoom(newTargetZoom);
      } else {
        // Pan
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
  }, [app, container, setTargetZoom, targetPosition]);

  // Animation loop
  useEffect(() => {
    // console.log("Running animation loop with targetZoom:", targetZoom);
    if (!container) return;

    let animationFrameId: number;
    const zoomSpeed = 0.15;
    const panSpeed = 0.15;
    const panThreshold = 0.1;
    const zoomThreshold = 0.001;

    const animate = () => {
      if (!container) return;
      // console.log(targetZoom);

      //
      const newZoom =
        currentZoomRef.current +
        (targetZoom - currentZoomRef.current) * zoomSpeed;
      const newX =
        container.x + (targetPosition.current.x - container.x) * panSpeed;
      const newY =
        container.y + (targetPosition.current.y - container.y) * panSpeed;

      const zoomDiff = Math.abs(newZoom - currentZoomRef.current);
      const panDiffX = Math.abs(newX - container.x);
      const panDiffY = Math.abs(newY - container.y);
      // console.log(zoomFromUser.current);

      // Only handle zoom syncing if user caused zoom
      if (zoomFromUser.current && zoomDiff > zoomThreshold) {
        container.scale.set(newZoom);

        const world = targetWorldMousePos.current;
        const mouse = targetMousePos.current;
        // console.log(world, mouse);

        container.x = mouse.x - world.x * container.scale.x;
        container.y = mouse.y - world.y * container.scale.y;

        // Round to nearest pixel to prevent sub-pixel filter edge artifacts
        container.x = Math.round(container.x);
        container.y = Math.round(container.y);

        // console.log("Continer position updated 1:", container.x, container.y);

        // Sync pan target to container
        targetPosition.current.x = container.x;
        targetPosition.current.y = container.y;

        setCurrentZoom(newZoom);
        currentZoomRef.current = newZoom;
      } else {
        // Pan with target zoom
        if (
          panDiffX > panThreshold ||
          panDiffY > panThreshold ||
          targetZoom !== currentZoomRef.current
        ) {
          const appliedZoom = zoomDiff <= zoomThreshold ? targetZoom : newZoom;
          container.scale.set(appliedZoom);
          currentZoomRef.current = appliedZoom;
          setCurrentZoom(appliedZoom);
          container.x = newX;
          container.y = newY;

          // Round to nearest pixel to prevent sub-pixel filter edge artifacts
          container.x = Math.round(container.x);
          container.y = Math.round(container.y);
        }
      }

      // Reset user zoom flag when zoom is near target
      if (zoomDiff <= zoomThreshold) {
        zoomFromUser.current = false;
      }

      // Sync displaySprite transform to match container (for RenderTexture architecture)
      if (container.displaySprite) {
        container.displaySprite.x = container.x;
        container.displaySprite.y = container.y;
        container.displaySprite.scale.set(container.scale.x, container.scale.y);
      }

      // Composite into RenderTexture if content changed
      if (
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
  }, [container, targetZoom, setCurrentZoom, targetPosition]);

  return null;
};

export default MovementHandler;
