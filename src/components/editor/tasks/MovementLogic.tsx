// New Movement
import React, { useEffect, useRef, useCallback } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { clamp } from "lodash";
import { usePinch } from "@use-gesture/react";

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

      const mouseX = e.clientX - canvasBounds.left;
      const mouseY = e.clientY - canvasBounds.top;

      if (e.ctrlKey) {
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
    if (!container) return;

    let animationFrameId: number;
    const zoomSpeed = 0.1;
    const panSpeed = 0.15;
    const panThreshold = 0.1;

    const animate = () => {
      if (!container) return;

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
      if (zoomFromUser.current && zoomDiff > 0.001) {
        container.scale.set(newZoom);

        const world = targetWorldMousePos.current;
        const mouse = targetMousePos.current;

        container.x = mouse.x - world.x * container.scale.x;
        container.y = mouse.y - world.y * container.scale.y;

        // Sync pan target to container
        targetPosition.current.x = container.x;
        targetPosition.current.y = container.y;

        setCurrentZoom(newZoom);
        currentZoomRef.current = newZoom;
      } else {
        // Smooth pan only
        if (panDiffX > panThreshold || panDiffY > panThreshold) {
          container.x = newX;
          container.y = newY;
        }
      }

      // Reset user zoom flag when zoom is near target
      if (zoomDiff <= 0.001) zoomFromUser.current = false;

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [container, targetZoom, setCurrentZoom, targetPosition]);

  // Pinch zoom (touch)
  const pinchEventHandler = useCallback(
    ({ offset: [d] }: { offset: [number, number] }) => {
      const clamped = clamp(d, 0.05, 5);
      zoomFromUser.current = true;
      setTargetZoom(clamped);
    },
    [setTargetZoom]
  );

  usePinch(pinchEventHandler, {
    target,
    eventOptions: { passive: false },
    pointer: { touch: true },
    threshold: 0.01,
  });

  return null;
};

export default MovementHandler;
