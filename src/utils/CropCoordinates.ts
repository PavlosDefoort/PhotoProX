export type CropPoint = { x: number; y: number };

/**
 * Converts a point in a centered sprite's local coordinate space to source
 * texture pixels. `toLocal()` already removes every world transform (including
 * canvas zoom), so this deliberately uses the texture dimensions rather than
 * the sprite's scaled display width/height.
 */
export const texturePixelFromSpriteLocal = (
  localPoint: CropPoint,
  textureWidth: number,
  textureHeight: number,
): CropPoint => ({
  x: localPoint.x + textureWidth / 2,
  y: localPoint.y + textureHeight / 2,
});
