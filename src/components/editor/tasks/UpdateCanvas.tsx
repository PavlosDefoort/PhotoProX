import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { LayerX } from "@/models/project/Layers/Layers";
import { fitImageToScreen } from "@/utils/CalcUtils";
import { createProjectApp } from "@/utils/PixiUtils";
import { debounce } from "lodash";
import { Application } from "pixi.js";
import { useEffect, useMemo, useRef } from "react";
import { renderLayers } from "./RenderLayers";
import { useCanvas } from "@/hooks/useCanvas";

export interface UpdateCanvasProps {
  adjustedWidth: number;
  adjustedHeight: number;
  canvas: HTMLCanvasElement | null;
  app: React.MutableRefObject<Application | null>;
  container: ContainerX | null;
  setContainer: (value: ContainerX | null) => void;
  setCurrentZoom: (value: number) => void;
  // Function to set the target zoom level
  setTargetZoom: (value: number) => void;
  targetPosition: React.MutableRefObject<{ x: number; y: number }>;
}

const UpdateCanvas = ({
  adjustedWidth,
  adjustedHeight,
  canvas,
  app,
  container,
  setContainer,
  setCurrentZoom,
  targetPosition,
  setTargetZoom,
}: UpdateCanvasProps): void => {
  // Create container if needed

  // Create mask if needed
  const {
    project,
    layerManager,
    editMode,
    trigger,
    setTrigger,
    setLayerManager,
  } = useProject();
  const { darkMode } = useTheme();
  const { zoomFromUser, targetMousePos, targetWorldMousePos } = useCanvas();
  const { photoProXUser } = useAuth();
  const createProjectCalled = useRef(false);
  const currentlyCreating = useRef(false);

  // Create a debounced memoized function to render layers
  // This is to prevent the function from being recreated on every render and to limit the amount of times it is called
  const renderLayersMemo = useMemo(
    () =>
      debounce((layers: LayerX[], container: ContainerX) => {
        renderLayers(layers, container, editMode, setLayerManager);
      }, 100),
    [editMode, setLayerManager]
  );

  useEffect(() => {
    if (
      canvas &&
      project.settings.canvasSettings.width > 1 &&
      project.settings.canvasSettings.height > 1 &&
      container?.destroyed !== true
    ) {
      console.log("UpdateCanvas effect triggered");
      if (app.current && container) {
        const roundedWidth = Math.round(adjustedWidth);
        const roundedHeight = Math.round(adjustedHeight);
        // Resize the renderer if the window size changes
        if (
          roundedHeight !== Math.floor(app.current.renderer.height) ||
          roundedWidth !== Math.floor(app.current.renderer.width)
        ) {
          console.log(roundedHeight, app.current.renderer.height);
          console.log(roundedWidth, app.current.renderer.width);

          const newScale = fitImageToScreen(
            project.settings.canvasSettings.width,
            project.settings.canvasSettings.height,
            roundedWidth,
            roundedHeight,
            0
          );

          // Set zoom target
          setTargetZoom(newScale);
          console.log(newScale);

          // Set zoomFromUser to false since this is a programmatic zoom
          zoomFromUser.current = false;
          // container.scale.set(newScale, newScale);

          // Resize renderer
          app.current.renderer.resize(roundedWidth, roundedHeight);
          app.current.canvas.style.width = `${roundedWidth}px`;
          app.current.canvas.style.height = `${roundedHeight}px`;

          // Center the container (pan target)
          targetPosition.current.x = roundedWidth / 2;
          targetPosition.current.y = roundedHeight / 2;

          // Optional: Clear the mouse focus since this isn't user zoom
          // targetMousePos.current = {
          //   x: roundedWidth / 2,
          //   y: roundedHeight / 2,
          // };
          // targetWorldMousePos.current = {
          //   x: project.settings.canvasSettings.width / 2,
          //   y: project.settings.canvasSettings.height / 2,
          // };
        }
        // Position the container in the center of the canvas

        // container.scale.set(zoomValue, zoomValue);

        // Render the layers :) WOOHOO

        const currentApp = app.current;
        console.log(app.current);
        console.log(container);
        renderLayersMemo(layerManager.layers, container);

        // return () => {
        //   if (currentApp) {
        //     cleanApp(currentApp);
        //   }
        // };
      } else {
        // Ensure createProjectApp is only called once
        const createProject = async () => {
          await createProjectApp(
            adjustedWidth,
            adjustedHeight,
            project.settings.canvasSettings.width,
            project.settings.canvasSettings.height,
            canvas,
            app,
            setContainer,
            darkMode,
            setTrigger,
            trigger,
            photoProXUser?.settings.performance
          );
          createProjectCalled.current = true;
          currentlyCreating.current = false;
        };
        if (!createProjectCalled.current && !currentlyCreating.current) {
          createProject();
          currentlyCreating.current = true;
        }
      }
    }
  }, [
    adjustedHeight,
    adjustedWidth,
    app,
    container,
    project,
    renderLayersMemo,
    canvas,
    trigger,
    darkMode,
    setTargetZoom,
    setContainer,
    setTrigger,
    photoProXUser?.settings.performance,
    layerManager.layers,
    zoomFromUser,
    targetPosition,
    targetMousePos,
    targetWorldMousePos,
  ]);
};

export default UpdateCanvas;
