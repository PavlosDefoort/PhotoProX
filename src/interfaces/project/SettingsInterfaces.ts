export interface ImageData {
  src: string;
  imageWidth: number;
  imageHeight: number;
  name: string;
  /** The original, untouched input when the layer came from a local file. */
  originalBlob?: Blob;
  originalMimeType?: string;
  originalWidth?: number;
  originalHeight?: number;
  /** Persisted encoded original bytes, represented as a data URL in JSON. */
  originalSourceSrc?: string;
  workingMimeType?: string;
  /** Full-resolution working representation. Kept separate from previews. */
  fullResolutionSrc?: string;
  fullResolutionWidth?: number;
  fullResolutionHeight?: number;
  /** Optional viewport-only proxy. It must never be used for committed edits. */
  previewSrc?: string;
  previewWidth?: number;
  previewHeight?: number;
  previewReason?: string;
}

export interface ImageLayerData {
  imageData: ImageData;
  position: { x: number; y: number };
}

export interface ProjectSettings {
  name: string;
  dateCreated: number;
  dateModified: number;
  size: number;
  canvasSettings: CanvasSettings;
}

export interface CanvasSettings {
  width: number;
  height: number;
  antialias: boolean;
}
