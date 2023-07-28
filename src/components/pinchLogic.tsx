// PinchHandler.tsx

import React, { useCallback } from "react";
import { PinchState, usePinch } from "@use-gesture/react";
import { set } from "lodash";

/**
 * Logic for handling pinch gestures.
 *
 * @param {number} zoomValue - The current zoom value.
 * @param {function} setZoomValue - A function to set the zoom value.
 * @param {function} setIsZooming - A function to set whether the user is currently zooming.
 * @param {React.RefObject<Element>} target - A ref to the element that the pinch handler should be applied to.
 * @returns {null}
 * @category Components
 * @subcategory PhotoEditor
 * @namespace PinchHandler
 *
 * @example
 * <PinchHandler
 *   zoomValue={zoomValue}
 *   setZoomValue={setZoomValue}
 *   setIsZooming={setIsZooming}
 *   target={target}
 * />
 */

interface PinchHandlerProps {
  setZoomValue: (value: number) => void;
  setIsZooming: (isZooming: boolean) => void;
  target: React.RefObject<Element>;
}

const PinchHandler: React.FC<PinchHandlerProps> = ({
  setZoomValue,
  setIsZooming,
  target,
}) => {
  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
  const pinchStep = 0.01;
  const pinchEventHandler = useCallback(
    ({ active, last, delta, offset: [pinchValue] }: PinchState) => {
      if (active) {
        setIsZooming(true);
        // const newZoomValue = clamp(zoomValue + delta[0] * 1.9, 0.1, 4);
        // // Round to nearest hundredth
        // const roundedZoomValue = Math.round(newZoomValue * 100) / 100;

        // setZoomValue(roundedZoomValue);

        const newStep = Math.floor(pinchValue / pinchStep) * pinchStep;
        const newValue = newStep + pinchStep;
        setZoomValue(newValue);
      }

      if (last) {
        setIsZooming(false);
      }
    },
    [setZoomValue, setIsZooming]
  );

  usePinch(pinchEventHandler, {
    target,
    pointer: { touch: true },
    eventOptions: { passive: false },
    scaleBounds: { min: 0.09, max: 3.99 },
  });

  return null; // Since this component handles the pinch logic, we don't need to render anything
};

export default PinchHandler;
