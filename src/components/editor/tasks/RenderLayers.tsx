import { EditMode } from "@/interfaces/types/ProjectRelatedTypes";
import { ContainerX, SpriteX } from "@/models/pixi-extends/SpriteX";
import { LayerManager } from "@/models/project/LayerManager";
import {
  AdjustmentLayer,
  BackgroundLayer,
  ImageLayer,
  LayerX,
} from "@/models/project/Layers/Layers";
import { Container, FederatedPointerEvent, Graphics, PointData } from "pixi.js";
import { DraftFunction } from "use-immer";

function renderAdjustmentLayer(
  layer: AdjustmentLayer,
  container: ContainerX,
  layers: LayerX[],
  editMode: EditMode,
  renderedLayers: Set<LayerX>,
  setLayerManager: (draft: DraftFunction<LayerManager>) => void
) {
  if (renderedLayers.has(layer)) {
    return;
  }
  const adjustmentContainer = layer.container;
  adjustmentContainer.sortableChildren = true;
  adjustmentContainer.zIndex = layer.zIndex + 2;

  container.addChild(adjustmentContainer); // Add adjustment container to parent container
  container.sortableChildren = true;
  // Sort children by z-index, lowest to highest
  container.children.sort((a, b) => a.zIndex - b.zIndex);

  renderedLayers.add(layer);
  // Get layers with lower z-index values
  const lowerZIndexLayers = layers.filter((l) => l.zIndex < layer.zIndex);
  // Sort the lower layers by z-index in highest to lowest order
  lowerZIndexLayers.sort((a, b) => b.zIndex - a.zIndex);

  // // Iterate through lower z-index layers
  // lowerZIndexLayers.forEach((lowerLayer) => {
  //   // Check
  // })

  // Render lower z-index layers within adjustment container
  if (layer.clipToBelow) {
    // In a clipping situation, we render the next available image or adjustment layer
    const imageLayer = lowerZIndexLayers.find((l) => l instanceof ImageLayer);
    const adjustmentLayer = lowerZIndexLayers.find(
      (l) => l instanceof AdjustmentLayer
    );
    if (
      imageLayer instanceof ImageLayer &&
      adjustmentLayer instanceof AdjustmentLayer
    ) {
      if (imageLayer.zIndex > adjustmentLayer.zIndex) {
        renderImageLayer(
          imageLayer,
          editMode,
          adjustmentContainer,
          renderedLayers,
          setLayerManager
        );
      } else if (
        adjustmentLayer.zIndex > imageLayer.zIndex &&
        adjustmentLayer.clipToBelow
      ) {
        renderAdjustmentLayer(
          adjustmentLayer,
          adjustmentContainer,
          layers,
          editMode,
          renderedLayers,
          setLayerManager
        );
      } else if (
        adjustmentLayer.zIndex > imageLayer.zIndex &&
        !adjustmentLayer.clipToBelow
      ) {
        // NEW
        // const matrix = GetMatrix(layer);
        renderImageLayer(
          imageLayer,
          editMode,
          adjustmentContainer,
          renderedLayers,
          setLayerManager
        );
      }
    } else if (imageLayer instanceof ImageLayer) {
      renderImageLayer(
        imageLayer,
        editMode,
        adjustmentContainer,
        renderedLayers,
        setLayerManager
      );
    } else if (adjustmentLayer instanceof AdjustmentLayer) {
      if (adjustmentLayer.clipToBelow) {
        renderAdjustmentLayer(
          adjustmentLayer as AdjustmentLayer,
          adjustmentContainer,
          layers,
          editMode,
          renderedLayers,
          setLayerManager
        );
      }
    }
  } else {
    lowerZIndexLayers.forEach((lowerLayer) => {
      // Don't count the background layer
      if (lowerLayer instanceof BackgroundLayer) return;
      renderLayer(
        lowerLayer,
        adjustmentContainer,
        layers,
        editMode,
        renderedLayers,
        setLayerManager
      );
    });
  }
  if (Array.isArray(adjustmentContainer.filters)) {
    adjustmentContainer.filters.forEach((filter) => {
      filter.enabled = layer.visible;
    });
  }
}

function renderImageLayer(
  layer: ImageLayer,
  editMode: EditMode,
  container: ContainerX,
  renderedLayers: Set<LayerX>,
  setLayerManager: (draft: DraftFunction<LayerManager>) => void
) {
  if (renderedLayers.has(layer)) {
    return;
  }
  const imageSprite = layer.sprite;
  // Pivot is the position of rotation, relative to the origin
  // Anchor is the set position of the origin (default is 0.5) which is the middle
  imageSprite.visible = layer.visible;

  // Add image sprite to parent container

  imageSprite.zIndex = layer.zIndex + 2;
  container.addChild(imageSprite);
  container.sortableChildren = true;
  // Sort children by z-index, lowest to highest
  container.children.sort((a, b) => a.zIndex - b.zIndex);

  renderedLayers.add(layer);

  // function drawCenterLine() {
  //   line.clear();
  //   line.lineStyle(2, 0xff0000, 1);
  //   line.moveTo(0, app.view.height / 2);
  //   line.lineTo(app.view.width, app.view.height / 2);
  // }

  const previousOpacity = layer.opacity;
  imageSprite.alpha = previousOpacity;

  // Create a line to represent the center of the container

  if (editMode === "move" || editMode === "transform" || editMode === "view") {
    let dragTarget: SpriteX | null = null;
    let dragOffset: PointData = { x: 0, y: 0 };

    // imageSprite.on("pointerup", (event: FederatedPointerEvent) =>
    //   onDragEnd(event)
    // );
    // imageSprite.on("pointerupoutside", (event: FederatedPointerEvent) =>
    //   onDragEnd(event)
    // );
    // imageSprite.on("pointerdown", (event: FederatedPointerEvent) =>
    //   onDragStart(event)
    // );

    // const onDragMove = (event: FederatedPointerEvent) => {
    //   if (dragTarget && dragOffset) {
    //     // Calculate the new position of the sprite relative to the container
    //     const newPosition = event.getLocalPosition(dragTarget.parent);

    //     // Adjust the drag offset by the scale factor
    //     const offsetX = dragOffset.x * imageSprite.scale.x;
    //     const offsetY = dragOffset.y * imageSprite.scale.y;

    //     // Set the new position of the sprite
    //     dragTarget.x = newPosition.x - offsetX;
    //     dragTarget.y = newPosition.y - offsetY;

    //     const width = container.originalWidth;
    //     const height = container.originalHeight;
    //   }
    // };

    // const onDragStart = (event: FederatedPointerEvent) => {
    //   imageSprite.alpha = 0.75;

    //   // Set the project target to the clicked layer
    //   dragTarget = imageSprite as SpriteX;
    //   dragTarget.cursor = "grabbing";

    //   // Get the position of the pointer relative to the parent container
    //   dragOffset = event.data.getLocalPosition(dragTarget);

    //   dragTarget.on("pointermove", (event: FederatedPointerEvent) =>
    //     onDragMove(event)
    //   );
    // };

    // const onDragEnd = (event: FederatedPointerEvent) => {
    //   if (dragTarget) {
    //     dragTarget.alpha = previousOpacity;
    //     dragTarget.cursor = "grab";
    //     dragTarget = null;
    //     // Set the target to the current layer
    //     setLayerManager((draft) => {
    //       if (draft.target != layer.id) {
    //         draft.target = layer.id;
    //       }
    //     });
    //   }
    // };
  }
}

function renderBackgroundLayer(
  layer: BackgroundLayer,
  container: Container,
  renderedLayers: Set<LayerX>
) {
  const backgroundLayer = layer as BackgroundLayer;
  backgroundLayer.graphics.alpha = backgroundLayer.opacity;
  backgroundLayer.graphics.zIndex = layer.zIndex;
  backgroundLayer.graphics.visible = backgroundLayer.visible;

  if (!renderedLayers.has(layer)) {
    container.addChild(backgroundLayer.graphics);
    backgroundLayer.graphics.zIndex = layer.zIndex + 2;
    container.sortChildren();
    renderedLayers.add(layer);
  }
}

function renderLayer(
  layer: LayerX,
  container: ContainerX,
  layers: LayerX[],
  editMode: EditMode,
  renderedLayers: Set<LayerX>,
  setLayerManager: (draft: DraftFunction<LayerManager>) => void
) {
  if (layer instanceof AdjustmentLayer) {
    renderAdjustmentLayer(
      layer,
      container,
      layers,
      editMode,
      renderedLayers,
      setLayerManager
    );
  } else if (layer instanceof ImageLayer) {
    renderImageLayer(
      layer,
      editMode,
      container,
      renderedLayers,
      setLayerManager
    );
  } else if (layer instanceof BackgroundLayer) {
    renderBackgroundLayer(layer, container, renderedLayers);
  } else {
  }
}

function removeFiltersFromPixi(sprite: SpriteX | Container) {
  if (Array.isArray(sprite.filters)) {
    sprite.filters = [];
  }
}

export function renderLayers(
  layers: LayerX[],
  container: ContainerX,
  editMode: EditMode,
  setLayerManager: (draft: DraftFunction<LayerManager>) => void
): void {
  const renderedLayers = new Set<LayerX>();
  // IDK but this works so I'm not gonna touch it
  const filteredLayers = layers.filter((layer) => true);
  // Sort the layers from highest to lowest z-index
  const sortedLayers = filteredLayers.sort((a, b) => b.zIndex - a.zIndex);

  // NEW
  // layers.forEach((layer) => {
  //   if (layer instanceof ImageLayer) {
  //     removeFiltersFromPixi(layer.sprite);
  //   } else if (layer instanceof AdjustmentLayer) {
  //     removeFiltersFromPixi(layer.container);
  //   }
  // });

  sortedLayers.forEach((layer) => {
    renderLayer(
      layer,
      container,
      sortedLayers,
      editMode,
      renderedLayers,
      setLayerManager
    );
  });
  // NEW
  // Final touch: Iterate through the image layers and add the layer effects
  // layers.forEach((layer) => {
  //   if (layer instanceof ImageLayer) {
  //     if (layer.effects.length > 0) {
  //       if (!Array.isArray(layer.sprite.filters)) {
  //         layer.sprite.filters = [];
  //       } else {
  //         layer.effects.forEach((effect) => {
  //           if (!Array.isArray(layer.sprite.filters)) {
  //             (layer.sprite.filters as unknown as Filter[]).push(effect.filter);
  //           }
  //         });
  //       }
  //     }
  //   }
  // });

  container.children;
}
