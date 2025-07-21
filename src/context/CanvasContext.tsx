import { CanvasContextValue } from "@/interfaces/ContextInterfaces";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { Application, Container } from "pixi.js";
import { createContext, createRef } from "react";

export const CanvasContext = createContext<CanvasContextValue>({
  app: createRef<Application | null>(),
  container: null,
  setContainer: (value: ContainerX | null) => {},
  canvas: createRef<HTMLCanvasElement | null>(),
  currentZoom: 1,
  setCurrentZoom: (value: number) => {},
  targetZoom: 1,
  setTargetZoom: (value: number) => {},
  targetPosition: { current: { x: 0, y: 0 } },
  targetMousePos: { current: { x: 0, y: 0 } },
  targetWorldMousePos: { current: { x: 0, y: 0 } },
  zoomFromUser: { current: false },
});
