import { CanvasSource, Texture } from "pixi.js";

export const convertBytesToString = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const convertedValue = bytes / Math.pow(k, i);

  // Optional: round to 2 decimal places
  const roundedValue = Math.round(convertedValue * 100) / 100;

  return `${roundedValue} ${sizes[i]}`;
};

export const base64StringToTexture = async (
  base64String: string
): Promise<Texture> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Create a canvas element and draw the image onto it
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(image, 0, 0);
        const canvasSource = new CanvasSource({
          resource: canvas,
          width: image.width,
          height: image.height,
          antialias: true,
          scaleMode: "linear",
          autoDensity: true,
          mipmapFilter: "linear",
        });
        const imageTexture = new Texture(canvasSource);

        // imageTexture.source.scaleMode = "linear";
        // // imageTexture.source.autoGenerateMipmaps = true;
        // imageTexture.source.resolution = window.devicePixelRatio;

        resolve(imageTexture);
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };

    image.onerror = (error) => {
      reject(error);
    };

    image.src = base64String;
  });
};
