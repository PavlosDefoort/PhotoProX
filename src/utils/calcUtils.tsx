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
      // Taking min of positive values
      newScaleFactorY = Math.min(
        fakeY + zoomY,
        maxVerticalOffset !== 0 ? maxVerticalOffset + 100 : maxVerticalOffset
      );
    } else {
      // Taking max of negative values
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

export function fitImageToScreen(
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  rotateValue: number
) {
  const newWidth = WidthRotate(width, height, rotateValue);
  const newHeight = HeightRotate(width, height, rotateValue);

  // Recalculate scale based off rotation
  const scale = Math.min(
    canvasWidth / 1.1 / newWidth,
    canvasHeight / 1.1 / newHeight
  );

  const roundedScale = Math.round(scale * 100) / 100;

  return roundedScale;
}
