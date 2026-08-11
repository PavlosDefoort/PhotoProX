import {
  ImageSnapshot,
  VISUAL_ANALYSIS_MAX_SNAPSHOT_EDGE,
} from "./types";

const loadImageElement = (src: string, signal?: AbortSignal) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Image analysis was cancelled.", "AbortError"));
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Could not decode the selected image for local analysis."));
    };

    signal?.addEventListener("abort", handleAbort);
    if (signal?.aborted) {
      handleAbort();
      return;
    }

    image.decoding = "async";
    image.src = src;
  });

export const createImageSnapshot = async (
  imageSource: string,
  maxSnapshotEdge = VISUAL_ANALYSIS_MAX_SNAPSHOT_EDGE,
  signal?: AbortSignal,
): Promise<ImageSnapshot> => {
  const image = await loadImageElement(imageSource, signal);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (originalWidth < 1 || originalHeight < 1) {
    throw new Error("The selected image does not have valid dimensions.");
  }

  const scale = Math.min(1, maxSnapshotEdge / Math.max(originalWidth, originalHeight));
  const sampleWidth = Math.max(1, Math.round(originalWidth * scale));
  const sampleHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("A 2D canvas context is required for local image analysis.");
  }

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  return {
    originalWidth,
    originalHeight,
    sampleWidth,
    sampleHeight,
    imageData: new Uint8ClampedArray(data),
  };
};
