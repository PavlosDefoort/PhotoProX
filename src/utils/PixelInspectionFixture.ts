/** Development-only diagnostic raster for visually checking high-zoom sampling. */
export const createPixelInspectionFixture = (size = 64) => {
  if (process.env.NODE_ENV === "production") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, size, size);
  for (let y = 0; y < size / 2; y += 1) {
    for (let x = 0; x < size / 2; x += 1) {
      context.fillStyle = (x + y) % 2 ? "#fff" : "#000";
      context.fillRect(x, y, 1, 1);
    }
  }
  context.fillStyle = "#f00";
  context.fillRect(size / 2, 0, 1, size);
  context.fillStyle = "#00f";
  context.fillRect(0, size / 2, size, 1);
  context.fillStyle = "rgba(0,255,0,.5)";
  context.fillRect(size / 2, size / 2, size / 2, size / 2);
  return canvas;
};
