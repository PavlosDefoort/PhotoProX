export const MIN_ZOOM_SCALE = 0.05;
export const MAX_ZOOM_SCALE = 128;
export const PIXEL_INSPECTION_THRESHOLD_SCALE = 8;
export const zoomScaleToPercent = (scale: number) => scale * 100;
export const zoomPercentToScale = (percent: number) => percent / 100;
export const MAX_EDITOR_ZOOM = MAX_ZOOM_SCALE;
export const PIXEL_INSPECTION_THRESHOLD = PIXEL_INSPECTION_THRESHOLD_SCALE;
export const HIGH_ZOOM_PRESETS = [8, 16, 32, 64, 128] as const;

export const shouldUseNearestPreview = (zoom: number) =>
  zoom >= PIXEL_INSPECTION_THRESHOLD_SCALE;

export const shouldShowPixelGrid = (enabled: boolean, zoom: number) =>
  enabled && zoom >= PIXEL_INSPECTION_THRESHOLD_SCALE;

export interface VisibleDocumentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const getVisibleDocumentBounds = (args: {
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  zoom: number;
  positionX: number;
  positionY: number;
  pivotX: number;
  pivotY: number;
}): VisibleDocumentBounds => ({
  minX: Math.max(0, Math.ceil((0 - args.positionX) / args.zoom + args.pivotX)),
  minY: Math.max(0, Math.ceil((0 - args.positionY) / args.zoom + args.pivotY)),
  maxX: Math.min(args.documentWidth, Math.floor((args.viewportWidth - args.positionX) / args.zoom + args.pivotX)),
  maxY: Math.min(args.documentHeight, Math.floor((args.viewportHeight - args.positionY) / args.zoom + args.pivotY)),
});

export const documentLineToScreen = (
  coordinate: number,
  pivot: number,
  position: number,
  zoom: number,
  devicePixelRatio: number,
) => {
  const css = position + (coordinate - pivot) * zoom;
  return Math.round(css * devicePixelRatio) / devicePixelRatio;
};

export const physicalPixelLineWidth = (devicePixelRatio: number) =>
  1 / Math.max(1, devicePixelRatio);

export const documentPixelFromPointer = (pointer: number, origin: number, zoom: number) =>
  Math.floor((pointer - origin) / zoom);
