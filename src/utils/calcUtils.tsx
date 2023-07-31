export function WidthRotate(
  width: number,
  height: number,
  rotateValue: number
) {
  const newWidth =
    Math.abs(width * Math.cos((rotateValue * Math.PI) / 180)) +
    Math.abs(height * Math.sin((rotateValue * Math.PI) / 180));
  return newWidth;
}

export function HeightRotate(
  width: number,
  height: number,
  rotateValue: number
) {
  const newHeight =
    Math.abs(width * Math.sin((rotateValue * Math.PI) / 180)) +
    Math.abs(height * Math.cos((rotateValue * Math.PI) / 180));
  return newHeight;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateZoomPan(
  deltaY: number,
  deltaX: number,
  newScaleFactorX: number,
  newScaleFactorY: number,
  fakeX: number,
  fakeY: number,
  zoomX: number,
  zoomY: number,
  maxHorizontalOffset: number,
  maxVerticalOffset: number
) {
  if (deltaY !== 0) {
    // Zoom vertically
    if (zoomY > 0) {
      newScaleFactorY = Math.min(
        fakeY + zoomY,
        maxVerticalOffset !== 0 ? maxVerticalOffset + 100 : maxVerticalOffset
      );
    } else {
      newScaleFactorY = Math.max(
        fakeY + zoomY,
        -maxVerticalOffset !== 0 ? -maxVerticalOffset - 100 : -maxVerticalOffset
      );
    }
  } else if (deltaX !== 0) {
    // Pan horizontally
    if (zoomX > 0) {
      newScaleFactorX = Math.min(
        fakeX + zoomX,
        maxHorizontalOffset !== 0
          ? maxHorizontalOffset + 100
          : maxHorizontalOffset
      );
    } else {
      newScaleFactorX = Math.max(
        fakeX + zoomX,
        -maxHorizontalOffset !== 0
          ? -maxHorizontalOffset - 100
          : -maxHorizontalOffset
      );
    }
  }

  return { newScaleFactorX, newScaleFactorY };
}
