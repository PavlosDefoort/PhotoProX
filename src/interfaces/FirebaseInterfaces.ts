export const DEFAULT_QUALITY_COMPRESSION_SETTINGS: CompressionSettings = {
  fileFormat: "png",
  maxSizeMB: 4,
  maxIterations: 10,
  alwaysKeepResolution: true,
  mode: "quality",
  maxDimension: 8000,
};

export const DEFAULT_PERFORMANCE_COMPRESSION_SETTINGS: CompressionSettings = {
  fileFormat: "jpeg",
  maxSizeMB: 2,
  maxIterations: 15,
  alwaysKeepResolution: true,
  mode: "performance",
  maxDimension: 5000,
};

export const DEFAULT_POTATO_COMPRESSION_SETTINGS: CompressionSettings = {
  fileFormat: "webp",
  maxSizeMB: 0.1,
  maxIterations: 3,
  alwaysKeepResolution: false,
  mode: "potato",
  maxDimension: 8000,
};

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  antialias: true,
  clearBeforeRender: true,
  graphicsAPI: "webgl",
  useCompression: true,
  powerPreference: "high-performance",
  resolution: 1,
  roundPixels: true,
  scalingMode: "linear",
  undoStackSize: 10,
  redoStackSize: 10,
  usePixelRatio: true,
  compression: DEFAULT_PERFORMANCE_COMPRESSION_SETTINGS,
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  performance: DEFAULT_PERFORMANCE_SETTINGS,
};

export const DEFAULT_GUEST_USER: PhotoProXUser = {
  uid: "guest",
  email: null,
  displayName: "Guest",
  photoURL: null,
  settings: DEFAULT_USER_SETTINGS,
};

export interface PhotoProXUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  settings: UserSettings;
}

export interface UserSettings {
  performance: PerformanceSettings;
}

export interface CompressionSettings {
  fileFormat: "jpeg" | "webp" | "png";
  maxSizeMB: number;
  maxIterations: number;
  alwaysKeepResolution: boolean;
  maxDimension: number;
  mode: "quality" | "performance" | "potato" | "custom";
}

export interface PerformanceSettings {
  graphicsAPI: "webgl" | "webgpu";
  scalingMode: "nearest" | "linear";
  powerPreference: "high-performance" | "low-power";
  resolution: number;
  usePixelRatio: boolean;
  antialias: boolean;
  clearBeforeRender: boolean;
  useCompression: boolean;
  roundPixels: boolean;
  undoStackSize: number;
  redoStackSize: number;
  compression: CompressionSettings;
}
