import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { LayerX } from "@/models/project/Layers/Layers";
import { compositeToRT, createProjectApp, syncContainerBM } from "@/utils/PixiUtils";
import { debounce } from "lodash";
import { Application } from "pixi.js";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { renderLayers } from "./RenderLayers";

export interface UpdateCanvasProps {
  adjustedWidth: number;
  adjustedHeight: number;
  canvas: HTMLCanvasElement | null;
  app: React.MutableRefObject<Application | null>;
  container: ContainerX | null;
  setContainer: (value: ContainerX | null) => void;
  targetPosition: React.MutableRefObject<{ x: number; y: number }>;
}

const UpdateCanvas = ({
  adjustedWidth,
  adjustedHeight,
  canvas,
  app,
  container,
  setContainer,
  targetPosition,
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
    editDocument,
    activeDocumentId,
  } = useProject();
  const { darkMode } = useTheme();
  const { zynaloUser } = useAuth();
  const createProjectCalled = useRef(false);
  const currentlyCreating = useRef(false);
  const prevLayerCount = useRef(layerManager.layers.length);
  const prevActiveDocumentId = useRef<string | null>(activeDocumentId);

  // Create a debounced memoized function to render layers
  // This is to prevent the function from being recreated on every render and to limit the amount of times it is called
  const renderLayersMemo = useMemo(
    () =>
      debounce((layers: LayerX[], container: ContainerX, targetId: string) => {
        renderLayers(
          layers,
          container,
          editMode,
          setLayerManager,
          editDocument,
          targetId,
        );
        // Mark container for re-composite after layer changes
        container.compositeNeeded = true;
      }, 100),
    [editDocument, editMode, setLayerManager],
  );

  // Cancel any pending debounced render when dependencies change or on unmount
  useEffect(() => {
    return () => {
      renderLayersMemo.cancel();
    };
  }, [renderLayersMemo]);

  useLayoutEffect(() => {
    if (
      canvas &&
      project.settings.canvasSettings.width > 1 &&
      project.settings.canvasSettings.height > 1 &&
      container?.destroyed !== true
    ) {
      if (app.current && container) {
        syncContainerBM(
          container,
          project.settings.canvasSettings.width,
          project.settings.canvasSettings.height,
        );
        const roundedWidth = Math.round(adjustedWidth);
        const roundedHeight = Math.round(adjustedHeight);
        // Resize the renderer if the window size changes
        if (
          roundedHeight !== Math.floor(app.current.renderer.height) ||
          roundedWidth !== Math.floor(app.current.renderer.width)
        ) {
          const previousWidth = app.current.renderer.width;
          const previousHeight = app.current.renderer.height;

          // Resize renderer
          app.current.renderer.resize(roundedWidth, roundedHeight);
          app.current.canvas.style.width = `${roundedWidth}px`;
          app.current.canvas.style.height = `${roundedHeight}px`;

          // Preserve the current zoom and the image point under the viewport
          // center when toolbars or the browser resize the stage.
          targetPosition.current.x += (roundedWidth - previousWidth) / 2;
          targetPosition.current.y += (roundedHeight - previousHeight) / 2;
        }

        renderLayersMemo(layerManager.layers, container, layerManager.target);

        const switchedDocument =
          activeDocumentId !== prevActiveDocumentId.current;

        // If the layer count changed (add/delete), flush immediately to avoid
        // a visual flash where orphaned sprites are missing from the stage.
        if (
          switchedDocument ||
          layerManager.layers.length !== prevLayerCount.current
        ) {
          renderLayersMemo.flush();
          compositeToRT(app.current.renderer, container);
          container.compositeNeeded = false;
          prevLayerCount.current = layerManager.layers.length;
        }
        prevActiveDocumentId.current = activeDocumentId;
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
            zynaloUser?.settings.performance,
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
    if (canvas && app.current && container && !activeDocumentId) {
      container.children.slice(2).forEach((child) => {
        container.removeChild(child);
      });
      container.compositeNeeded = true;
      prevLayerCount.current = 0;
      prevActiveDocumentId.current = null;
    }
  }, [
    activeDocumentId,
    adjustedHeight,
    adjustedWidth,
    app,
    container,
    project,
    renderLayersMemo,
    canvas,
    trigger,
    darkMode,
    setContainer,
    setTrigger,
    zynaloUser?.settings.performance,
    layerManager.layers,
    layerManager.target,
    editDocument,
    targetPosition,
  ]);
};

export default UpdateCanvas;
