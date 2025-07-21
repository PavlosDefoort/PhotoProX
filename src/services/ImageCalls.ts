export const resizeImage = async (
  width: number,
  height: number,
  image: string,
  interpolation: string,
  quality: number,
  extentsion: string
) => {
  const raw = JSON.stringify({
    width: width,
    height: height,
    image: image,
    interpolation: interpolation,
    quality: quality,
    extentsion: extentsion,
  });

  const response = await fetch("http://127.0.0.1:5000/resize_image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch image data");
  }
  const data = await response.json();
  const newImage = data.image;
  return newImage;
};

export const rembg = async (
  image: string,
  model: string = "isnet-anime",
  returnMask: boolean = false,
  alphaMatting: boolean = false,
  alphaForeground: number = 240,
  alphaBackground: number = 10,
  erodeSize: number = 10
) => {
  const raw = JSON.stringify({
    input_image: image,
    model: model,
    return_mask: returnMask,
    alpha_matting: alphaMatting,
    alpha_matting_foreground_threshold: alphaForeground,
    alpha_matting_background_threshold: alphaBackground,
    alpha_matting_erode_size: erodeSize,
  });

  const response = await fetch("http://127.0.0.1:5000/rembg", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch image data");
  }
  const data = await response.json();
  // Add data:image/png;base64, to the beginning of the image data
  const newImage = "data:image/png;base64," + data.image;
  return newImage;
};
