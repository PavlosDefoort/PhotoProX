import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { useEffect } from "react";

/**
 * Render interactive previews straight to the viewport instead of repeatedly
 * rebuilding the document-resolution RenderTexture. The normal composite path
 * is restored as soon as the preview UI closes.
 */
export const useDirectCanvasPreview = (
  container: ContainerX | null,
  active: boolean,
) => {
  useEffect(() => {
    if (!active || !container) return;

    const wasDirect = container.directRenderMode;
    container.directRenderMode = true;
    container.renderable = true;
    container.compositeNeeded = false;
    if (container.displaySprite) {
      container.displaySprite.visible = false;
    }

    return () => {
      container.directRenderMode = wasDirect;
      container.renderable = wasDirect;
      if (container.displaySprite) {
        container.displaySprite.visible = !wasDirect;
      }
      if (!wasDirect) {
        container.compositeNeeded = true;
      }
    };
  }, [active, container]);
};
