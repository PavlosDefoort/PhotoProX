export interface ImageData {
  src: string;
  imageWidth: number;
  imageHeight: number;
  name: string;
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
