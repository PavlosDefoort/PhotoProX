import { throttle } from "lodash";
import * as PIXI from "pixi.js";
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Sprite,
} from "pixi.js";
import { useCallback, useEffect, useMemo } from "react";
// ... (import other necessary dependencies)

import { useProjectContext } from "@/pages/editor";
import {
  AdjustmentLayer,
  BackgroundLayer,
  ImageLayer,
  LayerX,
  Project,
  SpriteX,
} from "@/utils/editorInterfaces";
import { Draft } from "immer";

interface ImageProperties {
  contrast: { value: number; multiply: boolean; enabled?: boolean };
  brightness: { value: number; multiply: boolean; enabled?: boolean };
  grayscale: { value: number; multiply: boolean; enabled?: boolean };
  vintage: { multiply: boolean; enabled: boolean };
  sepia: { multiply: boolean; enabled: boolean };
  predator: { value: number; multiply: boolean; enabled: boolean };
  night: { value: number; multiply: boolean; enabled: boolean };
  lsd: { multiply: boolean; enabled: boolean };
  browni: { multiply: boolean; enabled: boolean };
  polaroid: { multiply: boolean; enabled: boolean };
  negative: { multiply: boolean; enabled: boolean };
  kodachrome: { multiply: boolean; enabled: boolean };
  hue: { value: number; multiply: boolean; enabled?: boolean };
  tint: { value: number; multiply: boolean; enabled: boolean }; // 'enabled' property is optional here
  toBGR: { multiply: boolean; enabled: boolean };
  technicolor: { multiply: boolean; enabled: boolean };

  // Index signature
  [key: string]: { value?: number; multiply: boolean; enabled?: boolean };
}

interface ApplyCanvasProps {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  appRef: React.MutableRefObject<Application | null>;
  zoomValue: number;
  fakeY: number;
  fakeX: number;
  rotateValue: number;
  realNaturalWidth: React.MutableRefObject<number>;
  realNaturalHeight: React.MutableRefObject<number>;
  canvasHeight: number;
  canvasWidth: number;
  imageProperties: ImageProperties;
  darkMode: boolean;
  spriteRef: React.MutableRefObject<Sprite | null>;
  containerRef: React.MutableRefObject<Container | null>;
  maskRef: React.MutableRefObject<Graphics | null>;
  showThirds: boolean;
  scaleXSign: number;
  scaleYSign: number;
  scaleX: number;
  scaleY: number;
  spriteRefs: React.MutableRefObject<Sprite[]>;
  setPositionX: React.Dispatch<React.SetStateAction<number>>;
  setPositionY: React.Dispatch<React.SetStateAction<number>>;
  trigger: boolean;
  mode: string;
}

const ApplyCanvas = ({
  canvasRef,
  appRef,
  zoomValue,
  fakeY,
  fakeX,
  rotateValue,
  realNaturalWidth,
  realNaturalHeight,
  canvasHeight,
  canvasWidth,
  imageProperties,
  darkMode,
  spriteRef,
  containerRef,
  maskRef,
  showThirds,
  scaleXSign,
  scaleYSign,
  scaleX,
  scaleY,
  spriteRefs,
  setPositionX,
  setPositionY,
  trigger,
  mode,
}: ApplyCanvasProps): void => {
  // Create container if needed

  // Create mask if needed
  const { project, setProject } = useProjectContext();
  const throttledSetProject = throttle(setProject, 100); // Adjust the delay as needed
  const throttledSetPositionX = throttle(setPositionX, 10);
  const throttledSetPositionY = throttle(setPositionY, 10);

  const renderLayer = useCallback(
    (layer: LayerX, container: Container, layers: LayerX[]) => {
      if (layer.type === "adjustment") {
        // Create adjustment container with mask
        const adjustmentLayer = layer as AdjustmentLayer;
        const adjustmentContainer = adjustmentLayer.container;
        adjustmentContainer.zIndex = layer.zIndex;
        adjustmentContainer.width = realNaturalWidth.current;
        adjustmentContainer.height = realNaturalHeight.current;

        // Place the adjustment layer in the center of the canvas
        adjustmentContainer.pivot.set(
          realNaturalWidth.current / 2,
          realNaturalHeight.current / 2
        );
        adjustmentContainer.position.set(
          realNaturalWidth.current / 2,
          realNaturalHeight.current / 2
        );

        // Iterate through filters and set the enabled property to the visibility prop of the layer
        adjustmentContainer.filters?.forEach((filter) => {
          filter.enabled = adjustmentLayer.visible;
        });

        container.addChild(adjustmentContainer); // Add adjustment container to parent container
        // Get layers with lower z-index values
        const lowerZIndexLayers = layers.filter(
          (l) => l.zIndex < adjustmentLayer.zIndex
        );

        // Render lower z-index layers within adjustment container
        lowerZIndexLayers.forEach((lowerLayer) => {
          renderLayer(lowerLayer, adjustmentContainer, layers);
        });
      } else if (layer.type === "image") {
        // Create image sprite
        const imageLayer = layer as ImageLayer;
        const imageSprite = imageLayer.sprite;
        // Pivot is the position of rotation, relative to the origin
        // Anchor is the set position of the origin (default is 0.5) which is the middle
        imageSprite.visible = imageLayer.visible;

        container.addChild(imageSprite); // Add image sprite to parent container
        imageSprite.cursor = "pointer";
        imageSprite.eventMode = "static";

        imageSprite.zIndex = layer.zIndex;
        const previousOpacity = imageLayer.opacity;

        imageSprite.alpha = previousOpacity;
        let dragTarget: Sprite | null = null;
        let dragOffset: PIXI.IPointData = { x: 0, y: 0 };

        if (mode === "move" || mode === "transform") {
          imageSprite.on("pointerup", (event: FederatedPointerEvent) =>
            onDragEnd(event)
          );

          imageSprite.on("pointerupoutside", (event: FederatedPointerEvent) =>
            onDragEnd(event)
          );

          imageSprite.on("pointerdown", (event: FederatedPointerEvent) => {
            onDragStart(event);
          });
        }

        const onDragMove = (event: FederatedPointerEvent) => {
          if (dragTarget && dragOffset) {
            // Calculate the new position of the sprite relative to the container
            const newPosition = event.data.getLocalPosition(dragTarget.parent);

            // Adjust the drag offset by the scale factor
            const offsetX = dragOffset.x * imageSprite.scale.x;
            const offsetY = dragOffset.y * imageSprite.scale.y;

            // Set the new position of the sprite
            dragTarget.x = newPosition.x - offsetX;
            dragTarget.y = newPosition.y - offsetY;
            // Update position values or trigger any relevant updates
            throttledSetPositionX(dragTarget.x);
            throttledSetPositionY(dragTarget.y);
          }
        };

        const onDragStart = (event: FederatedPointerEvent) => {
          imageSprite.alpha = 0.75;

          // Set the project target to the clicked layer

          dragTarget = imageSprite as SpriteX;
          dragTarget.cursor = "grabbing";

          // Get the position of the pointer relative to the parent container
          dragOffset = event.data.getLocalPosition(dragTarget);

          if (appRef.current) {
            appRef.current.stage.on(
              "pointermove",
              (event: FederatedPointerEvent) => onDragMove(event)
            );
          }
        };

        const onDragEnd = (event: FederatedPointerEvent) => {
          if (dragTarget) {
            if (appRef.current) {
              appRef.current.stage.off(
                "pointermove",
                (event: FederatedPointerEvent) => onDragMove(event)
              );
            }

            dragTarget.alpha = previousOpacity;
            dragTarget.cursor = "grab";

            dragTarget = null;
            setProject((draft: Draft<Project>) => {
              draft.target = imageLayer;
            });
          }
        };
      } else if (layer.type === "background") {
        const backgroundLayer = layer as BackgroundLayer;
        backgroundLayer.graphics.alpha = backgroundLayer.opacity;
        backgroundLayer.graphics.zIndex = layer.zIndex;
        backgroundLayer.graphics.visible = backgroundLayer.visible;
        containerRef.current?.addChild(backgroundLayer.graphics);
      }
      // Other cases like "group" can be handled similarly
    },
    [
      realNaturalWidth,
      realNaturalHeight,
      appRef,
      throttledSetPositionX,
      throttledSetPositionY,
    ]
  );

  const renderLayers = useMemo(
    () =>
      throttle((layers: LayerX[], container: Container) => {
        layers.forEach((layer) => {
          if (layer.type === "group" && layer.children) {
            // If it's a group layer, recursively render its children
            const groupContainer = new Container();
            container.addChild(groupContainer); // Add group container to parent container
            renderLayers(layer.children, groupContainer);
          } else {
            // Render individual layers
            renderLayer(layer, container, layers);
          }
        });
      }, 100),
    [renderLayer]
  );

  useEffect(() => {
    const createContainerIfNeeded = () => {
      if (
        appRef.current &&
        !containerRef.current &&
        realNaturalWidth.current > 1 &&
        realNaturalHeight.current > 1
      ) {
        containerRef.current = new Container();
        containerRef.current.width = realNaturalWidth.current;
        containerRef.current.height = realNaturalHeight.current;
        containerRef.current.pivot.set(
          realNaturalWidth.current / 2,
          realNaturalHeight.current / 2
        );
        realNaturalWidth.current, realNaturalHeight.current;
        const background = new Graphics();
        const squareSize = 20;
        const numRows = Math.floor(realNaturalHeight.current / squareSize);
        const numCols = Math.floor(realNaturalWidth.current / squareSize);
        const colors = [0xffffff, 0xe5e5e5]; // Colors for the checkerboard pattern

        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const color = colors[(row + col) % 2];
            const x = Math.ceil(col * squareSize); // Round to integer
            const y = Math.ceil(row * squareSize); // Round to integer
            background.beginFill(color);
            background.drawRect(x, y, squareSize, squareSize);
            background.endFill();
          }
        }
        background.alpha = 0.75;
        background.zIndex = -1;
        containerRef.current.addChild(background);
        appRef.current.stage.addChild(containerRef.current);
      }
    };

    const createMaskIfNeeded = () => {
      if (
        !maskRef.current &&
        realNaturalWidth.current &&
        realNaturalHeight.current &&
        containerRef.current
      ) {
        maskRef.current = new Graphics();
        maskRef.current.beginFill(0xffffff);
        maskRef.current.alpha = 0;
        maskRef.current.drawRect(
          0,
          0,
          realNaturalWidth.current,
          realNaturalHeight.current
        );
        maskRef.current.endFill();
        containerRef.current.addChild(maskRef.current);
        containerRef.current.mask = maskRef.current;
      }
    };

    // If there's no canvas, we can't do anything; return
    if (!canvasRef.current) return;

    // Check if there's an app
    if (!appRef.current) {
      let backgroundColor;
      if (darkMode) {
        backgroundColor = 0x1e1e1e;
      } else {
        backgroundColor = 0xcdcdcd;
      }

      appRef.current = new Application({
        view: canvasRef.current,
        width: canvasWidth,
        height: canvasHeight,
        antialias: true,
        preserveDrawingBuffer: true,
        resolution: window.devicePixelRatio,
        powerPreference: "high-performance",
        clearBeforeRender: true,
        backgroundColor: backgroundColor,
        hello: true,
      });
      // Start the app
      appRef.current.start();
    }

    if (
      Math.round(canvasHeight) !== appRef.current.renderer.height ||
      Math.round(canvasWidth) !== appRef.current.renderer.width
    ) {
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
    }

    const app = appRef.current;

    // Remove the children whenever there's a change
    // app.stage.removeChildren();
    // Check if there's a container
    if (!containerRef.current) {
      createContainerIfNeeded();
    }
    // Check if there's a mask
    if (!maskRef.current) {
      createMaskIfNeeded();
    }

    // Check if there's a new layer in project that's not in the app

    const container = containerRef.current!;
    // Add container to project

    const mask = maskRef.current;

    if (container && mask) {
      container.position.set(canvasWidth / 2, canvasHeight / 2);
      container.sortableChildren = true;
      container.scale.set(zoomValue * scaleX, zoomValue * scaleY);
      app.stage.eventMode = "static";
      // Render the layers :) WOOHOO

      renderLayers(project.layerManager.layers, container);

      return () => {
        app.stage.removeAllListeners();
        project.layerManager.layers.forEach((layer) => {
          if (layer.type === "image") {
            const imageLayer = layer as ImageLayer;
            const imageSprite = imageLayer.sprite;
            imageSprite.removeAllListeners();
          } else if (layer.type === "adjustment") {
            const adjustmentLayer = layer as AdjustmentLayer;
            const adjustmentContainer = adjustmentLayer.container;
            adjustmentContainer.removeAllListeners();
          }
        });
      };
      // container.addChild(mask);
      // container.mask = mask;
      // app.stage.addChild(container);
    }
  }, [
    project,
    spriteRefs,
    zoomValue,
    fakeY,
    fakeX,
    rotateValue,
    realNaturalWidth,
    realNaturalHeight,
    canvasHeight,
    canvasWidth,
    imageProperties,
    appRef,
    canvasRef,
    darkMode,
    spriteRef,
    containerRef,
    maskRef,
    showThirds,
    scaleXSign,
    scaleYSign,
    scaleX,
    scaleY,
    setProject,
    project.target,
    trigger,
    mode,
  ]);
};

export default ApplyCanvas;
