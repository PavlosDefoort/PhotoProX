import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { fitImageToScreen } from "@/utils/CalcUtils";
import {
  createContainerBM,
  createMiniApp,
  exportProjectImage,
} from "@/utils/PixiUtils";
import { debounce } from "lodash";
import { Application, Container } from "pixi.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Hourglass } from "react-loader-spinner";

// A pixi application that is used to render the project preview
// Has limited functionality and is used to render the project preview

interface MiniApplicationProps {
  width?: number;
  height?: number;
  anchor?: { x: number; y: number };
  src?: string;
  mode?: "resize" | "export";
}

const MiniApplication: React.FC<MiniApplicationProps> = ({
  width,
  height,
  anchor,
  src,
  mode,
}) => {
  const { project, layerManager } = useProject();
  const { app, container } = useCanvas();
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const containerRef = useRef<Container | null>(null);
  const exportRef = useRef<ImageLayer | null>(null);
  const isRendering = useRef(false);

  const throttledUpdate = useMemo(
    () =>
      debounce(
        async (
          newWidth: number,
          newHeight: number,
          containerWidth: number,
          containerHeight: number,
          src?: string
        ) => {
          if (containerRef.current && appRef.current && exportRef.current) {
            // Destroy the current container
            const container = containerRef.current;
            // We don't want to destroy the export image, but we want to remove it from the container
            container.removeChild(exportRef.current.sprite);
            // Now we can destroy the container
            container.destroy({ children: true });

            if (src && newWidth && newHeight) {
              const createExportRef = async () => {
                const newLayer = await layerManager.createImageLayer(
                  newWidth,
                  newHeight,
                  {
                    name: "Export",
                    src: src,
                    imageHeight: newHeight,
                    imageWidth: newWidth,
                  }
                );
                // Remove the sprite from the container
                if (exportRef.current) {
                  exportRef.current.sprite.destroy();
                }
                exportRef.current = newLayer;
              };
              await createExportRef();
            }
            // Create a new container with the new dimensions
            containerRef.current = createContainerBM(newWidth, newHeight);

            appRef.current?.stage.addChild(containerRef.current);

            // Add the export image to the new container
            containerRef.current.addChild(exportRef.current.sprite);

            // Fit the container to the screen
            const newScale = fitImageToScreen(
              newWidth,
              newHeight,
              containerWidth,
              containerHeight,
              0
            );

            containerRef.current.scale.set(newScale);
            containerRef.current.position.set(
              appRef.current.renderer.width / 2,
              appRef.current.renderer.height / 2
            );
            setLoading(false);
          }
        },
        500
      ),
    [layerManager]
  );

  useEffect(() => {
    // We don't need to make a new container if only the anchor changes
    // Position the sprite in the center of the screen
    if (!exportRef.current || !anchor || !width || !height) return;
    exportRef.current.sprite.anchor.set(anchor.x, anchor.y);
    exportRef.current.sprite.position.set(anchor.x * width, anchor.y * height);
  }, [anchor, height, width]);

  useEffect(() => {
    // Resize the canvas
    if (
      appRef.current &&
      containerRef.current &&
      exportRef.current &&
      width &&
      height &&
      !Number.isNaN(width) &&
      !Number.isNaN(height)
    ) {
      setLoading(true);
      if (!src) {
        throttledUpdate(
          width,
          height,
          appRef.current.renderer.width,
          appRef.current.renderer.height,
          src
        );
      } else {
        if (src !== exportRef.current.imageData.src) {
          throttledUpdate(
            width,
            height,
            appRef.current.renderer.width,
            appRef.current.renderer.height,
            src
          );
        }
      }
    }
  }, [width, height, throttledUpdate, src]);

  useEffect(() => {
    const createExportRef = async () => {
      if (!app.current || !container) return;

      if (mode !== "export") {
        const base64 = await exportProjectImage(app.current, container);
        const imageLayer = await layerManager.createImageLayer(
          project.settings.canvasSettings.width,
          project.settings.canvasSettings.height,
          {
            name: "Export",
            src: base64,
            imageHeight: project.settings.canvasSettings.height,
            imageWidth: project.settings.canvasSettings.width,
          }
        );
        exportRef.current = imageLayer;
      } else if (src && mode === "export") {
        const imageLayer = await layerManager.createImageLayer(
          project.settings.canvasSettings.width,
          project.settings.canvasSettings.height,
          {
            name: "Export",
            src: src,
            imageHeight: project.settings.canvasSettings.height,
            imageWidth: project.settings.canvasSettings.width,
          }
        );
        exportRef.current = imageLayer;
      }

      if (exportRef.current && containerRef.current) {
        containerRef.current.addChild(exportRef.current.sprite);
      }
    };

    const createMiniApplication = async () => {
      appRef.current = await createMiniApp(canvasRef);
      containerRef.current = createContainerBM(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height
      );

      const newScale = fitImageToScreen(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height,
        appRef.current.renderer.width,
        appRef.current.renderer.height,
        0
      );

      appRef.current.stage.addChild(containerRef.current);
      containerRef.current.scale.set(newScale);
      containerRef.current.position.set(
        appRef.current.renderer.width / 2,
        appRef.current.renderer.height / 2
      );
    };

    const createApplication = async () => {
      if (
        !canvasRef.current ||
        (appRef.current && containerRef.current && exportRef.current)
      ) {
        return;
      }
      isRendering.current = true;
      setLoading(true);
      if (!appRef.current && !containerRef.current) {
        await createMiniApplication();
      }

      if (!exportRef.current) {
        await createExportRef();
      }

      setLoading(false);
      isRendering.current = false;
    };
    if (project && app && container && !isRendering.current) {
      createApplication();
    }
  }, [
    app,
    container,
    layerManager,
    mode,
    project,
    project.settings.canvasSettings.height,
    project.settings.canvasSettings.width,
    src,
  ]);

  return (
    <div className="w-full h-full flex justify-center items-center dark:bg-white bg-[#1a1a1a] border-2 border-white">
      {loading && <Hourglass visible={loading} />}

      <canvas
        ref={canvasRef}
        className={`${
          loading ? "hidden w-full h-full" : "block w-full h-full"
        }`}
      />
    </div>
  );
};
export default MiniApplication;
