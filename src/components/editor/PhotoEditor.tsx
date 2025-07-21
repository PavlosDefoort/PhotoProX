import { CanvasContext } from "@/context/CanvasContext";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { GetInfo } from "@/services/GpuInfo";
import { clamp } from "@/utils/CalcUtils";
import { TierResult } from "detect-gpu";
import { Application } from "pixi.js";
import React, { createRef, useEffect, useRef, useState } from "react";
import ImageSelector from "./tasks/ImageSelector";
import MovementHandler from "./tasks/MovementLogic";
import UpdateCanvas, { UpdateCanvasProps } from "./tasks/UpdateCanvas";
import LayerBar from "./ui/components/bars/layer-bar/LayerBar";
import ToolBar from "./ui/components/bars/tool-bar/ToolBar";
import TransformTool from "./ui/components/bars/tool-bar/tools/transform/TransformTool";
import TopBar from "./ui/components/bars/top-bar/TopBar";
import CreateProject from "./ui/modals/CreateProject";

const PhotoEditor: React.FC = () => {
  // Context Values
  const { project, layerManager, landing } = useProject();
  const { darkMode } = useTheme();

  // State Values
  const [canvasWidth, setCanvasWidth] = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1000);
  const [windowWidth, setWindowWidth] = useState(0);
  const [gpuFactor, setGpuFactor] = useState(1);
  const [windowHeight, setWindowHeight] = useState(0);
  const targetPosition = useRef({ x: 0, y: 0 });
  const [updateCanvasProps, setUpdateCanvasProps] = useState<UpdateCanvasProps>(
    {
      adjustedHeight: 0,
      adjustedWidth: 0,
      canvas: null,
      app: createRef<Application | null>(),
      container: null,
      setContainer: () => {},
      setCurrentZoom: () => {},
      setTargetZoom: () => {},
      targetPosition: targetPosition,
    }
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const [container, setContainer] = useState<ContainerX | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [targetZoom, setTargetZoom] = useState(1);
  const [movementKey, setMovementKey] = useState(0);
  const target = useRef<HTMLDivElement | null>(null);
  const realNaturalWidth = useRef(project.settings.canvasSettings.width);
  const realNaturalHeight = useRef(project.settings.canvasSettings.height);

  useEffect(() => {
    if (
      project.settings.canvasSettings.width != null &&
      project.settings.canvasSettings.height != null
    ) {
      realNaturalWidth.current = project.settings.canvasSettings.width;
      realNaturalHeight.current = project.settings.canvasSettings.height;
    }
  }, [
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
  ]);

  useEffect(() => {
    const stageContainer = document.getElementById("stage-container");
    const handleResize = () => {
      if (stageContainer) {
        setWindowWidth(stageContainer.clientWidth);
        setWindowHeight(stageContainer.clientHeight);

        // Adjust the container to fit within the canvas
      }
    };
    if (stageContainer) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(stageContainer);
      return () => {
        resizeObserver.unobserve(stageContainer);
      };
    }
  }, [windowWidth]);

  useEffect(() => {
    const app = appRef.current!;

    if (app && app.renderer) {
      if (darkMode) {
        app.renderer.background.color = 0x1e1e1e;
      } else {
        app.renderer.background.color = 0xcdcdcd;
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (layerManager.layers.length > 0) {
      const adjustWidth = Math.round(windowWidth ?? 0);
      const adjustHeight = Math.round(windowHeight ?? 0);
      setCanvasWidth(adjustWidth);
      setCanvasHeight(adjustHeight);
      setMovementKey((prev) => prev + 1);
    }
  }, [gpuFactor, windowWidth, windowHeight, project]);

  useEffect(() => {
    GetInfo().then((gpu: TierResult) => {
      if (gpu.tier === 0) {
        setGpuFactor(1);
      } else if (gpu.tier === 1) {
        setGpuFactor(1);
      } else if (gpu.tier === 2 || gpu.fps! <= 100) {
        setGpuFactor(1.25);
      } else if (gpu.tier === 3) {
        const fpsFactor = clamp(gpu.fps! / 100, 1.25, 2);
        setGpuFactor(fpsFactor);
      } else {
        setGpuFactor(1);
      }
    });
  }, []);

  // UpdateCanvas is where the canvas is updated with the new values, layers, etc.

  useEffect(() => {
    setUpdateCanvasProps({
      adjustedWidth: canvasWidth,
      adjustedHeight: canvasHeight,
      canvas: canvasRef.current!,
      container: container,
      app: appRef,
      setContainer: setContainer,
      setCurrentZoom: setCurrentZoom,
      setTargetZoom: setTargetZoom,
      targetPosition: targetPosition,
    });
  }, [canvasWidth, canvasHeight, container]);

  UpdateCanvas(updateCanvasProps);

  return (
    <CanvasContext.Provider
      value={{
        app: appRef,
        container: container,
        setContainer: setContainer,
        targetMousePos: { current: { x: 0, y: 0 } },
        targetWorldMousePos: { current: { x: 0, y: 0 } },
        zoomFromUser: { current: false },

        canvas: canvasRef,
        currentZoom: currentZoom,
        targetZoom: targetZoom,
        setCurrentZoom: setCurrentZoom,
        setTargetZoom: setTargetZoom,
        targetPosition: targetPosition,
      }}
    >
      <div className="h-full">
        <div className="flex flex-col h-full w-full overflow-hidden">
          <div>
            <TopBar />
          </div>
          <div className="flex flex-row h-full justify-between">
            <ToolBar />

            <div className="flex-grow flex flex-col h-full">
              <TransformTool />
              <div
                className="flex-grow w-full "
                style={{
                  background:
                    "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px",
                }}
              >
                {!landing && (
                  <div className="w-full h-full flex flex-row justify-center items-center bg-[#cdcdcd] dark:bg-editorBackground">
                    <div className="flex flex-col justify-center items-center space-y-3 ">
                      <ImageSelector />
                      <CreateProject />
                    </div>
                  </div>
                )}

                <MovementHandler
                  target={target} // Pass the targetRef as the target
                  key={movementKey}
                />
                <div className="w-full h-full ">
                  <div
                    id="stage-container"
                    ref={target}
                    className="w-full h-full relative "
                  >
                    <canvas
                      id="canvas"
                      ref={canvasRef}
                      className="w-full h-full absolute top-0 left-0 "
                    ></canvas>
                  </div>
                </div>
              </div>
            </div>
            <LayerBar />
          </div>
        </div>
      </div>
    </CanvasContext.Provider>
  );
};

export default PhotoEditor;
