import {
  BloomAdjustmentLayerInterface,
  BrightnessAdjustmentLayerInterface,
  DropShadowAdjustmentLayerInterface,
  SaturationAdjustmentLayerInterface,
  WavesInterface,
} from "@/interfaces/project/LayerInterfaces";
import {
  AlphaFilter,
  Color,
  ColorMatrixFilter,
  Container,
  Filter,
  MaskFilter,
  Graphics,
  Sprite,
  BlurFilter,
  Rectangle,
} from "pixi.js";
import { AdjustmentLayer } from "./Layers";
import {
  AdjustmentFilter as PixiAdjustmentFilter,
  ZoomBlurFilter,
} from "pixi-filters";
import { AdvancedBloomFilter as PixiBloomFilter } from "pixi-filters";
import { DropShadowFilter as PixiDropShadowFilter } from "pixi-filters";
import { ContainerX } from "@/models/pixi-extends/SpriteX";

// Pixi-js requires a window object to be present, so we need to dynamically import the filters
// Since Next.js is server-side rendered, we need to check if the window object is present
type AdjustmentFilterType = typeof import("pixi-filters").AdjustmentFilter;
type AdvancedBloomFilterType =
  typeof import("pixi-filters").AdvancedBloomFilter;
type DropShadowFilterType = typeof import("pixi-filters").DropShadowFilter;

// Dynamically import pixi-filters
let AdjustmentFilter: AdjustmentFilterType;
let AdvancedBloomFilter: AdvancedBloomFilterType;
let DropShadowFilter: DropShadowFilterType;

if (typeof window !== "undefined") {
  import("pixi-filters").then((filters) => {
    AdjustmentFilter = filters.AdjustmentFilter;
    AdvancedBloomFilter = filters.AdvancedBloomFilter;
    DropShadowFilter = filters.DropShadowFilter;
  });
}

export class WavesAdjustmentLayer
  extends AdjustmentLayer
  implements WavesInterface {}

export class BrightnessAdjustmentLayer
  extends AdjustmentLayer
  implements BrightnessAdjustmentLayerInterface
{
  brightness: number = 1;
  contrast: number = 1;

  constructor(
    clip: boolean,
    zIndex: number,
    name: string,
    width: number,
    height: number,
    open: boolean = true,
    container?: ContainerX
  ) {
    super(
      zIndex,
      name,
      clip,
      width,
      height,
      "Brightness/Contrast",
      "Adjust the brightness and contrast of the layer",
      open,
      container
    );

    this.setFilter(this.container);
  }

  setFilter = (container: Container) => {
    if (!window) return;

    const matrix = new AdjustmentFilter();
    matrix.resolution = window.devicePixelRatio;
    matrix.antialias = "on";

    this.container.filters = [matrix];
  };

  updateFilter = (): void => {
    if (!window) return;
    const matrix = (
      this.container.filters as Filter[]
    )[0] as PixiAdjustmentFilter;
    matrix.brightness = this.brightness;
    matrix.contrast = this.contrast;
  };
}

export class SaturationAdjustmentLayer
  extends AdjustmentLayer
  implements SaturationAdjustmentLayerInterface
{
  saturation: number = 1;
  hue: number = 0;

  constructor(
    clip: boolean,
    zIndex: number,
    name: string,
    width: number,
    height: number,
    open: boolean = true,
    container?: ContainerX
  ) {
    super(
      zIndex,
      name,
      clip,
      width,
      height,
      "Saturation",
      "Adjust the saturation of the layer",
      open,
      container
    );
    this.setFilter(this.container);
  }

  setFilter = (container: Container): void => {
    const satMatrix = new AdjustmentFilter({
      saturation: this.saturation,
    });

    const hueMatrix = new ColorMatrixFilter();
    satMatrix.resolution = window.devicePixelRatio;
    hueMatrix.resolution = window.devicePixelRatio;

    container.filters = [satMatrix, hueMatrix];
  };

  updateFilter = (): void => {
    if (!window) return;
    const satMatrix = (
      this.container.filters as Filter[]
    )[0] as PixiAdjustmentFilter;
    satMatrix.saturation = this.saturation;
    const hueMatrix = (
      this.container.filters as Filter[]
    )[1] as ColorMatrixFilter;
    hueMatrix.hue(this.hue, false);
  };
}

export class BloomAdjustmentLayer
  extends AdjustmentLayer
  implements BloomAdjustmentLayerInterface
{
  blur: number = 8;
  threshold: number = 0.5;
  brightness: number = 1;
  bloomScale: number = 1;
  quality: number = 4;
  constructor(
    clip: boolean,
    zIndex: number,
    name: string,
    width: number,
    height: number,
    open: boolean = true,
    container?: ContainerX
  ) {
    super(
      zIndex,
      name,
      clip,
      width,
      height,
      "Bloom",
      "Add a bloom effect to the layer",
      open,
      container
    );
    this.setFilter(this.container);
  }

  setFilter = (container: Container): void => {
    const bloomFilter = new AdvancedBloomFilter();
    container.filters = [bloomFilter];
  };

  updateFilter = (): void => {
    if (!window) return;
    const bloomFilter = (
      this.container.filters as Filter[]
    )[0] as PixiBloomFilter;
    bloomFilter.blur = this.blur;
    bloomFilter.threshold = this.threshold;
    bloomFilter.brightness = this.brightness;
    bloomFilter.bloomScale = this.bloomScale;
    bloomFilter.quality = this.quality;
  };
}

export class DropShadowAdjustmentLayer
  extends AdjustmentLayer
  implements DropShadowAdjustmentLayerInterface
{
  blur: number = 2;
  opacity: number = 0.5;
  offsetX: number = 5;
  offsetY: number = 5;
  color: Color = new Color(0x000000);
  shadowOnly: boolean = false;
  quality: number = 3;

  constructor(
    clip: boolean,
    zIndex: number,
    name: string,
    width: number,
    height: number,
    open: boolean = true,
    container?: ContainerX
  ) {
    super(
      zIndex,
      name,
      clip,
      width,
      height,
      "Drop Shadow",
      "Add a drop shadow to the layer. This effect is made for transparent layers.",
      open,
      container
    );
    this.setFilter(this.container);
  }

  setFilter = (container: Container): void => {
    const dropShadowFilter = new DropShadowFilter();
    container.filters = [dropShadowFilter];
  };

  updateFilter = (): void => {
    if (!window) return;
    const dropShadowFilter = (
      this.container.filters as Filter[]
    )[0] as PixiDropShadowFilter;
    dropShadowFilter.blur = this.blur;
    dropShadowFilter.alpha = this.opacity;
    dropShadowFilter.offsetX = this.offsetX;
    dropShadowFilter.offsetY = this.offsetY;
    dropShadowFilter.shadowOnly = this.shadowOnly;
    dropShadowFilter.quality = this.quality;
    dropShadowFilter.color = this.color;
  };
}
