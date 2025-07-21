import { ContainerX, SpriteX } from "@/models/pixi-extends/SpriteX";
import { Color, Container, Filter, Graphics, Point } from "pixi.js";
import { ImageData } from "./SettingsInterfaces";

export interface LayerXInterface {
  id: string;
  name: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
}

export interface LayerEffectInterface {
  filter: Filter;
  name: string;
  description: string;
}

export interface ImageLayerInterface extends LayerXInterface {
  imageData: ImageData;
  sprite: SpriteX;
  effects: LayerEffectInterface[];
}

export interface AdjustmentLayerInterface extends LayerXInterface {
  clipToBelow: boolean;
  mask: Graphics;
  container: ContainerX;
  title: string;
  description: string;
  open: boolean;
}

// Adjustment Layer Interfaces

export interface BrightnessAdjustmentLayerInterface
  extends AdjustmentLayerInterface {
  brightness: number;
  contrast: number;
  setFilter: (container: ContainerX) => void;
}

export interface SaturationAdjustmentLayerInterface
  extends AdjustmentLayerInterface {
  saturation: number; // Saturation percentage (0-100)
  hue: number; // Hue angle, in degrees (0-360)
  setFilter: (container: ContainerX) => void;
}

export interface BloomAdjustmentLayerInterface
  extends AdjustmentLayerInterface {
  blur: number;
  threshold: number;
  brightness: number;
  bloomScale: number;
  quality: number;
  setFilter: (container: ContainerX) => void;
}

export interface DropShadowAdjustmentLayerInterface
  extends AdjustmentLayerInterface {
  blur: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
  color: Color;
  shadowOnly: boolean;
  quality: number;
  setFilter: (container: ContainerX) => void;
}

export interface WavesInterface extends AdjustmentLayerInterface {}

export interface TextLayerInterface extends LayerXInterface {
  font: string;
  fontSize: number;
  color: number;
  text: string;
  position: Point;
  bold: boolean;
  italic: boolean;
}

export interface ShapeLayerInterface extends LayerXInterface {
  color: number;
  shape: Graphics;
  position: Point;
  width: number;
  height: number;
  radius: number;
  rotation: number;
  fill: boolean;
}

export interface BackgroundLayerInterface extends LayerXInterface {
  transparent: boolean;
  color: string;
  graphics: Graphics;
}
