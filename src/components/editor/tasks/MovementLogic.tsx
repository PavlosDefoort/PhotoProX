// New Movement
import React, { useEffect, useRef, useCallback, useState } from "react";
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
    console.log("Adding wheel event listener");

    const canvasBounds = app.current.canvas.getBoundingClientRect();

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomStep = 1.1;
      const maxZoom = 5;
      const minZoom = 0.05;
      const minStepAbsolute = 0.01;

      // Mouse position relative to canvas
      console.log(e.clientX, canvasBounds.left);
      const mouseX = e.clientX - canvasBounds.left;
      const mouseY = e.clientY - canvasBounds.top;

      if (e.ctrlKey && !isPinching.current) {
        console.log("Zooming with wheel");
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
      console.log("Removing wheel event listener");
      app.current?.canvas.removeEventListener("wheel", handleWheel);
    };
  }, [app, container, setTargetZoom, targetPosition]);

  // Animation loop
  useEffect(() => {
    // console.log("Running animation loop with targetZoom:", targetZoom);
    if (!container) return;
    console.log("Starting animation loop");

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

        // console.log("Continer position updated 1:", container.x, container.y);

        // Sync pan target to container
        targetPosition.current.x = container.x;
        targetPosition.current.y = container.y;

        setCurrentZoom(newZoom);
        currentZoomRef.current = newZoom;
      } else {
        // Pan with target zoom
        // console.log(zoomDiff);
        if (
          panDiffX > panThreshold ||
          panDiffY > panThreshold ||
          targetZoom !== currentZoomRef.current
        ) {
          const appliedZoom = zoomDiff <= zoomThreshold ? targetZoom : newZoom;
          // console.log("Zoom diff:", zoomDiff);
          container.scale.set(appliedZoom);
          currentZoomRef.current = appliedZoom;
          setCurrentZoom(appliedZoom);
          container.x = newX;
          container.y = newY;
          // console.log(
          //   targetZoom,
          //   currentZoomRef.current,
          //   "Container position updated"
          // );
        }
      }

      // Reset user zoom flag when zoom is near target
      if (zoomDiff <= zoomThreshold) {
        // console.log("Zoom target reached, resetting user zoom flag");
        zoomFromUser.current = false;
      }
      // console.log(animationFrameId, "Animation frame ID");

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      // console.log("Stopping animation loop");
    };
  }, [container, targetZoom, setCurrentZoom, targetPosition]);

  // Pinch zoom (touch)
  // const pinchEventHandler = useCallback(
  //   ({ offset: [d], last }: { offset: [number, number]; last: boolean }) => {
  //     const clamped = clamp(d, 0.05, 5);
  //     zoomFromUser.current = true;
  //     setTargetZoom(clamped);

  //     // Set pinching state
  //     isPinching.current = !last; // true while pinching, false on end
  //   },
  //   [setTargetZoom]
  // );

  // usePinch(pinchEventHandler, {
  //   target,
  //   eventOptions: { passive: false },
  //   pointer: { touch: true },
  //   threshold: 0.01,
  // });

  return null;
};

export default MovementHandler;
