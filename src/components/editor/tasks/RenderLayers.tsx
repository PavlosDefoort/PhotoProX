import { EditMode } from "@/interfaces/types/ProjectRelatedTypes";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { LayerManager } from "@/models/project/LayerManager";
import {
  AdjustmentLayer,
  BackgroundLayer,
  ImageLayer,
  LayerX,
} from "@/models/project/Layers/Layers";
import { Container, Filter, Graphics } from "pixi.js";
import { DraftFunction } from "use-immer";
import { EditDocument } from "@/interfaces/editor/EditDocument";
import { getAdjustmentTargets } from "@/models/editor/AdjustmentTargets";
import { projectAdjustmentStateToRuntime } from "@/models/editor/AdjustmentDocument";

/**
 * Collect the adjustment filters that should be applied to each image sprite.
 * Returns a map: imageLayer.id → Filter[]
 *
 * Adjustments are processed from lowest z-index to highest so that
 * stacked adjustments produce the correct filter pipeline order
 * (inner adjustment first, outer adjustment last).
 */
function collectAdjustmentFilters(
  layers: LayerX[],
  editDocument: EditDocument,
): Map<string, Filter[]> {
  const filterMap = new Map<string, Filter[]>();

  // Initialize an empty filter list for every image layer
  for (const l of layers) {
    if (l instanceof ImageLayer) {
      filterMap.set(l.id, []);
    }
  }

  // Process adjustments low-to-high z-index (inner → outer)
  const adjustments = layers
    .filter((l) => l instanceof AdjustmentLayer)
    .sort((a, b) => a.zIndex - b.zIndex) as AdjustmentLayer[];

  for (const adj of adjustments) {
    const documentState = editDocument.adjustmentLayers[adj.id];
    if (documentState) {
      projectAdjustmentStateToRuntime(adj, documentState);
    }
    const targets = getAdjustmentTargets(adj, layers);

    const adjFilters = (adj.container.filters as Filter[]) || [];

    // Toggle filter enabled state based on adjustment visibility
    for (const f of adjFilters) {
      f.enabled = adj.visible;
    }

    for (const target of targets) {
      const existing = filterMap.get(target.id);
      if (existing) {
        existing.push(...adjFilters);
      }
    }
  }

  return filterMap;
}

function renderImageLayer(
  layer: ImageLayer,
  container: ContainerX,
  renderedLayers: Set<LayerX>,
) {
  if (renderedLayers.has(layer)) {
    return;
  }
  const imageSprite = layer.sprite;
  imageSprite.visible = layer.visible;
  // Layers are composited into a document-sized offscreen RenderTexture.
  // Viewport culling can incorrectly drop moved sprites from that pass.
  imageSprite.cullable = false;
  imageSprite.zIndex = layer.zIndex + 2;
  imageSprite.alpha = layer.opacity;

  container.addChild(imageSprite);
  renderedLayers.add(layer);
}

function renderBackgroundLayer(
  layer: BackgroundLayer,
  container: Container,
  renderedLayers: Set<LayerX>,
) {
  const backgroundLayer = layer as BackgroundLayer;
  backgroundLayer.graphics.alpha = backgroundLayer.opacity;
  backgroundLayer.graphics.zIndex = layer.zIndex;
  backgroundLayer.graphics.visible = backgroundLayer.visible;

  if (!renderedLayers.has(layer)) {
    container.addChild(backgroundLayer.graphics);
    backgroundLayer.graphics.zIndex = layer.zIndex + 2;
    renderedLayers.add(layer);
  }
}

export function renderLayers(
  layers: LayerX[],
  container: ContainerX,
  editMode: EditMode,
  setLayerManager: (draft: DraftFunction<LayerManager>) => void,
  editDocument: EditDocument,
  targetId?: string,
): void {
  const renderedLayers = new Set<LayerX>();
  let filteredLayers = [...layers];
  const isInpaintMode = editMode === "inpaint";
  const isRembgMode = editMode === "rembg";

  // In paint modes, composite every frame so brush strokes are visible
  container.alwaysComposite = isInpaintMode || isRembgMode;

  // In inpaint/rembg modes, only render the target layer and hide others.
  if ((isInpaintMode || isRembgMode) && targetId) {
    const targetLayer = layers.find((l) => l.id === targetId);

    // Container children: [0] = checkerboard, [1] = mask, [2+] = layers
    if (container.children.length >= 2) {
      if (isInpaintMode) {
        container.children[0].visible = false; // Hide checkerboard background
        container.children[1].visible = false; // Hide mask graphics
        container.mask = null; // Disable mask clipping
      } else {
        // In rembg mode, keep checkerboard visible so transparency is obvious.
        container.children[0].visible = true;
        container.children[1].visible = true;
        if (!container.mask && container.children[1]) {
          container.mask = container.children[1] as Graphics;
        }
      }
    }

    // Hide all non-target layer sprites/graphics
    layers.forEach((layer) => {
      if (layer.id !== targetId) {
        if (layer instanceof ImageLayer) {
          layer.sprite.visible = false;
        } else if (layer instanceof BackgroundLayer) {
          layer.graphics.visible = false;
        }
      }
    });

    // Make sure target layer is visible
    if (targetLayer instanceof ImageLayer) {
      targetLayer.sprite.visible = true;
    }

    filteredLayers = filteredLayers.filter((layer) => layer.id === targetId);
  } else {
    // Normal mode: restore container background and mask
    if (container.children.length >= 2) {
      container.children[0].visible = true; // Show checkerboard background
      container.children[1].visible = true; // Show mask graphics
      // Restore mask clipping if it was set
      if (!container.mask && container.children[1]) {
        container.mask = container.children[1] as Graphics;
      }
    }

    // Normal mode: restore visibility based on layer.visible property
    layers.forEach((layer) => {
      if (layer instanceof ImageLayer) {
        layer.sprite.visible = layer.visible;
      } else if (layer instanceof BackgroundLayer) {
        layer.graphics.visible = layer.visible;
      }
    });
  }

  // Sort the layers from highest to lowest z-index
  const sortedLayers = filteredLayers.sort((a, b) => b.zIndex - a.zIndex);
  const activeDisplayObjects = new Set<any>(
    sortedLayers.flatMap<any>((layer) => {
      if (layer instanceof ImageLayer) return [layer.sprite];
      if (layer instanceof BackgroundLayer) return [layer.graphics];
      return [];
    }),
  );

  container.children.slice(2).forEach((child) => {
    if (!activeDisplayObjects.has(child)) {
      container.removeChild(child);
    }
  });

  container.sortableChildren = true;

  // Pass 1: Place all image and background layers directly in the main container
  for (const layer of sortedLayers) {
    if (layer instanceof ImageLayer) {
      renderImageLayer(layer, container, renderedLayers);
    } else if (layer instanceof BackgroundLayer) {
      renderBackgroundLayer(layer, container, renderedLayers);
    }
  }

  // Pass 2: Collect adjustment filters and assign to target sprites
  const adjustmentFilters = collectAdjustmentFilters(
    sortedLayers,
    editDocument,
  );

  for (const layer of sortedLayers) {
    if (layer instanceof ImageLayer) {
      // Merge layer effects (stroke, glow, etc.) with adjustment filters
      const effects = layer.effects.map((e) => e.filter);
      const adjFilters = adjustmentFilters.get(layer.id) || [];
      const allFilters = [...effects, ...adjFilters];

      layer.sprite.filters = allFilters.length > 0 ? allFilters : [];
    }
  }

  // Sort all container children once after rendering is complete
  container.sortChildren();
}
