export interface TextureCapability {
  maxTextureDimension: number;
  inferred: boolean;
  source: "webgpu" | "webgl" | "fallback";
}

export const CONSERVATIVE_MAX_TEXTURE_DIMENSION = 4096;
export const TEXTURE_SAFETY_MARGIN = 0.9;

export const getTextureCapability = (renderer: any): TextureCapability => {
  const webgpuLimit = renderer?.gpu?.device?.limits?.maxTextureDimension2D ??
    renderer?.device?.limits?.maxTextureDimension2D;
  if (Number.isFinite(webgpuLimit) && webgpuLimit > 0) {
    return { maxTextureDimension: webgpuLimit, inferred: false, source: "webgpu" };
  }
  const gl = renderer?.gl ?? renderer?.context?.gl;
  const webglLimit = gl?.getParameter?.(gl.MAX_TEXTURE_SIZE);
  if (Number.isFinite(webglLimit) && webglLimit > 0) {
    return { maxTextureDimension: webglLimit, inferred: false, source: "webgl" };
  }
  return {
    maxTextureDimension: CONSERVATIVE_MAX_TEXTURE_DIMENSION,
    inferred: true,
    source: "fallback",
  };
};

export const getSafeTextureDimension = (maxTextureDimension: number) =>
  Math.max(1, Math.floor(maxTextureDimension * TEXTURE_SAFETY_MARGIN));

export const getOversizedProxySize = (
  width: number,
  height: number,
  maxTextureDimension: number,
) => {
  const limit = getSafeTextureDimension(maxTextureDimension);
  const scale = Math.min(1, limit / width, limit / height);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
    oversized: scale < 1,
  };
};

export const requiresTextureProxy = (width: number, height: number, maxTextureDimension: number) =>
  width > getSafeTextureDimension(maxTextureDimension) || height > getSafeTextureDimension(maxTextureDimension);
