import { CanvasContext } from "@/context/CanvasContext";
import { useContext } from "react";

export function useCanvas() {
  const {
    app,
    canvas,
    container,
    currentZoom,
    targetZoom,
    setContainer,
    setCurrentZoom,
    setTargetZoom,
    targetPosition,
    targetMousePos,
    targetWorldMousePos,
    zoomFromUser,
  } = useContext(CanvasContext);

  return {
    app,
    canvas,
    container,
    currentZoom,
    targetZoom,
    setContainer,
    setCurrentZoom,
    setTargetZoom,
    targetPosition,
    targetMousePos,
    targetWorldMousePos,
    zoomFromUser,
  };
}
