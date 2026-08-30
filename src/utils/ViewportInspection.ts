export const snapCssCoordinateToDevicePixels = (cssCoordinate: number, devicePixelRatio: number) => {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.round(cssCoordinate * dpr) / dpr;
};

export const getRendererDiagnostics = (canvas: HTMLCanvasElement, devicePixelRatio = window.devicePixelRatio || 1) => {
  const rect = canvas.getBoundingClientRect();
  return {
    cssWidth: rect.width,
    cssHeight: rect.height,
    backingWidth: canvas.width,
    backingHeight: canvas.height,
    devicePixelRatio,
  };
};

export const isPixelAlignedTransform = (x: number, y: number, devicePixelRatio: number) =>
  Math.abs(x * devicePixelRatio - Math.round(x * devicePixelRatio)) < 1e-6 &&
  Math.abs(y * devicePixelRatio - Math.round(y * devicePixelRatio)) < 1e-6;

export const getInspectionStatus = (args: {
  zoom: number;
  position: { x: number; y: number };
  devicePixelRatio: number;
  documentScale?: { x: number; y: number };
  sourceWidth?: number;
  sourceHeight?: number;
  previewWidth?: number;
  previewHeight?: number;
}) => ({
  zoomIs100: args.zoom === 1,
  pixelAligned: isPixelAlignedTransform(args.position.x, args.position.y, args.devicePixelRatio),
  fullResolution: !args.previewWidth || !args.previewHeight ||
    (args.previewWidth === args.sourceWidth && args.previewHeight === args.sourceHeight),
  layerIs1To1: !args.documentScale || (args.documentScale.x === 1 && args.documentScale.y === 1),
});
