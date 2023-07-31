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
