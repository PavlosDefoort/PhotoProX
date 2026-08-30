import { ImageSelectionState } from "@/interfaces/editor/EditDocument";
import { CurvesLUTs } from "@/utils/CurvesMath";
import {
  MAX_SETTLED_PREVIEW_PIXELS,
  getLivePreviewSize,
  scaleSelectionForPreview,
} from "@/utils/RasterPreview";
import { rasterizeSelectionMask } from "@/utils/SelectionGeometry";
import {
  CanvasSource,
  Filter,
  GlProgram,
  GpuProgram,
  Matrix,
  Sprite,
  Texture,
  TextureMatrix,
} from "pixi.js";

const vertexGl = `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vMaskCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
uniform mat3 uFilterMatrix;

void main(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
  // Map the pooled filter-input coordinates back into the image sprite's
  // texture space. This remains correct when filter bounds are expanded by
  // child overlays or the image is transformed.
  vMaskCoord = (uFilterMatrix * vec3(vTextureCoord, 1.0)).xy;
}`;

const fragmentGl = `
in vec2 vTextureCoord;
in vec2 vMaskCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uMaskTexture;
uniform sampler2D uLutTexture;
uniform float uUseMask;
uniform vec4 uMaskClamp;

vec2 lutCoord(float value) {
  float index = floor(clamp(value, 0.0, 1.0) * 255.0);
  return vec2((index + 0.5) / 256.0, 0.5);
}

void main(void) {
  vec4 source = texture(uTexture, vTextureCoord);
  if (source.a <= 0.0) {
    finalColor = source;
    return;
  }

  vec3 straight = source.rgb / source.a;
  vec3 adjusted = vec3(
    texture(uLutTexture, lutCoord(straight.r)).r,
    texture(uLutTexture, lutCoord(straight.g)).g,
    texture(uLutTexture, lutCoord(straight.b)).b
  );
  float maskClip = step(3.5,
    step(uMaskClamp.x, vMaskCoord.x) +
    step(uMaskClamp.y, vMaskCoord.y) +
    step(vMaskCoord.x, uMaskClamp.z) +
    step(vMaskCoord.y, uMaskClamp.w));
  float maskWeight = texture(uMaskTexture, vMaskCoord).r * maskClip;
  float weight = mix(1.0, maskWeight, uUseMask);
  finalColor = vec4(mix(straight, adjusted, weight) * source.a, source.a);
}`;

const shaderWgsl = `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

struct AdjustmentPreviewUniforms {
  uFilterMatrix: mat3x3<f32>,
  uMaskClamp: vec4<f32>,
  uUseMask: f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> adjustmentPreviewUniforms: AdjustmentPreviewUniforms;
@group(1) @binding(1) var uMaskTexture: texture_2d<f32>;
@group(1) @binding(2) var uMaskSampler: sampler;
@group(1) @binding(3) var uLutTexture: texture_2d<f32>;
@group(1) @binding(4) var uLutSampler: sampler;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) maskUv: vec2<f32>,
};

@vertex
fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOutput {
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  let uv = aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
  let maskUv = (adjustmentPreviewUniforms.uFilterMatrix * vec3<f32>(uv, 1.0)).xy;
  return VSOutput(vec4<f32>(position, 0.0, 1.0), uv, maskUv);
}

fn lutCoord(value: f32) -> vec2<f32> {
  let index = floor(clamp(value, 0.0, 1.0) * 255.0);
  return vec2<f32>((index + 0.5) / 256.0, 0.5);
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @location(1) maskUv: vec2<f32>,
) -> @location(0) vec4<f32> {
  let source = textureSample(uTexture, uSampler, uv);
  // WebGPU texture sampling must remain in uniform control flow. Sample the
  // optional mask before the per-pixel alpha branch, even when it is disabled.
  let maskClamp = adjustmentPreviewUniforms.uMaskClamp;
  let maskClip = step(3.5,
    step(maskClamp.x, maskUv.x) +
    step(maskClamp.y, maskUv.y) +
    step(maskUv.x, maskClamp.z) +
    step(maskUv.y, maskClamp.w));
  let maskWeight = textureSample(uMaskTexture, uMaskSampler, maskUv).r * maskClip;
  if (source.a <= 0.0) {
    return source;
  }

  let straight = source.rgb / source.a;
  let adjusted = vec3<f32>(
    textureSample(uLutTexture, uLutSampler, lutCoord(straight.r)).r,
    textureSample(uLutTexture, uLutSampler, lutCoord(straight.g)).g,
    textureSample(uLutTexture, uLutSampler, lutCoord(straight.b)).b
  );
  let weight = mix(1.0, maskWeight, adjustmentPreviewUniforms.uUseMask);
  return vec4<f32>(mix(straight, adjusted, weight) * source.a, source.a);
}`;

const canvasToTexture = (
  canvas: HTMLCanvasElement,
  scaleMode: "linear" | "nearest",
) =>
  new Texture(
    new CanvasSource({
      resource: canvas,
      width: canvas.width,
      height: canvas.height,
      antialias: scaleMode === "linear",
      scaleMode,
      // Selection coordinates and the source raster are expressed in image
      // pixels.  Do not let the device pixel ratio change the mask texture's
      // logical dimensions; doing so makes the GPU sample drift from the
      // committed selection on HiDPI displays and after a proxy texture is
      // replaced by a working raster.
      autoDensity: false,
    }),
  );

const createMaskTexture = (
  selection: ImageSelectionState | undefined,
  width: number,
  height: number,
) => {
  if (!selection) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create GPU adjustment mask.");
    context.fillStyle = "white";
    context.fillRect(0, 0, 1, 1);
    return canvasToTexture(canvas, "linear");
  }

  const size = getLivePreviewSize(
    width,
    height,
    MAX_SETTLED_PREVIEW_PIXELS,
  );
  const scaledSelection = scaleSelectionForPreview(
    selection,
    width,
    height,
    size.width,
    size.height,
  );
  const mask = rasterizeSelectionMask(
    scaledSelection,
    size.width,
    size.height,
  );
  const pixels = new Uint8ClampedArray(size.width * size.height * 4);
  for (let i = 0; i < mask.length; i += 1) {
    const value = Math.round(mask[i] * 255);
    const offset = i * 4;
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create GPU adjustment mask.");
  context.putImageData(new ImageData(pixels, size.width, size.height), 0, 0);
  return canvasToTexture(canvas, "linear");
};

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

export class GpuAdjustmentPreviewFilter extends Filter {
  private readonly maskTexture: Texture;
  private readonly lutTexture: Texture;
  private readonly lutContext: CanvasRenderingContext2D;
  private readonly maskTarget: Sprite;
  private readonly maskTextureMatrix: TextureMatrix;

  constructor(
    selection: ImageSelectionState | undefined,
    width: number,
    height: number,
    target: Sprite,
  ) {
    const maskTexture = createMaskTexture(selection, width, height);
    const maskTextureMatrix = new TextureMatrix(maskTexture);
    const lutCanvas = document.createElement("canvas");
    lutCanvas.width = 256;
    lutCanvas.height = 1;
    const lutContext = lutCanvas.getContext("2d");
    if (!lutContext) throw new Error("Could not create GPU adjustment LUT.");
    const lutTexture = canvasToTexture(lutCanvas, "nearest");
    const gpuProgram = GpuProgram.from({
      vertex: { source: shaderWgsl, entryPoint: "mainVertex" },
      fragment: { source: shaderWgsl, entryPoint: "mainFragment" },
      name: "gpu-adjustment-preview-filter",
    });
    const glProgram = GlProgram.from({
      vertex: vertexGl,
      fragment: fragmentGl,
      name: "gpu-adjustment-preview-filter",
    });

    super({
      gpuProgram,
      glProgram,
      resources: {
        adjustmentPreviewUniforms: {
          uFilterMatrix: { value: new Matrix(), type: "mat3x3<f32>" },
          uMaskClamp: {
            value: maskTextureMatrix.uClampFrame,
            type: "vec4<f32>",
          },
          uUseMask: { value: selection ? 1 : 0, type: "f32" },
        },
        uMaskTexture: maskTexture.source,
        uMaskSampler: maskTexture.source.style,
        uLutTexture: lutTexture.source,
        uLutSampler: lutTexture.source.style,
      },
    });

    this.maskTexture = maskTexture;
    this.lutTexture = lutTexture;
    this.lutContext = lutContext;
    this.maskTarget = target;
    this.maskTextureMatrix = maskTextureMatrix;
    this.setBrightnessContrast(0, 0);
  }

  override apply(filterManager: any, input: Texture, output: any, clearMode: boolean) {
    this.maskTextureMatrix.texture = this.maskTexture;
    this.maskTextureMatrix.update();
    filterManager
      .calculateSpriteMatrix(
        this.resources.adjustmentPreviewUniforms.uniforms.uFilterMatrix as Matrix,
        this.maskTarget,
      )
      .prepend(this.maskTextureMatrix.mapCoord);
    filterManager.applyFilter(this, input, output, clearMode);
  }

  setBrightnessContrast(brightness: number, contrast: number) {
    const offset = brightness * 255;
    const factor = (contrast + 1) / Math.max(0.0001, 1 - contrast);
    const lut = new Uint8ClampedArray(256);
    for (let value = 0; value < 256; value += 1) {
      lut[value] = clampByte((value - 128) * factor + 128 + offset);
    }
    this.setChannelLuts(lut, lut, lut);
  }

  setCurves(luts: CurvesLUTs) {
    const red = new Uint8ClampedArray(256);
    const green = new Uint8ClampedArray(256);
    const blue = new Uint8ClampedArray(256);
    for (let value = 0; value < 256; value += 1) {
      red[value] = luts.rgb[luts.red[value]];
      green[value] = luts.rgb[luts.green[value]];
      blue[value] = luts.rgb[luts.blue[value]];
    }
    this.setChannelLuts(red, green, blue);
  }

  private setChannelLuts(
    red: Uint8ClampedArray,
    green: Uint8ClampedArray,
    blue: Uint8ClampedArray,
  ) {
    const imageData = this.lutContext.createImageData(256, 1);
    for (let value = 0; value < 256; value += 1) {
      const offset = value * 4;
      imageData.data[offset] = red[value];
      imageData.data[offset + 1] = green[value];
      imageData.data[offset + 2] = blue[value];
      imageData.data[offset + 3] = 255;
    }
    this.lutContext.putImageData(imageData, 0, 0);
    this.lutTexture.source.update();
  }

  override destroy(destroyPrograms = false) {
    super.destroy(destroyPrograms);
    this.maskTexture.destroy(true);
    this.lutTexture.destroy(true);
  }
}
