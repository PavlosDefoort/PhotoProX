import {
  AdjustmentLayerInterface,
  BackgroundLayerInterface,
  ImageLayerInterface,
  LayerEffectInterface,
  LayerXInterface,
} from "@/interfaces/project/LayerInterfaces";
import { ContainerX, SpriteX } from "../../pixi-extends/SpriteX";
import { immerable } from "immer";
import { ImageData } from "@/interfaces/project/SettingsInterfaces";
import { Container, Graphics } from "pixi.js";
import { v4 as uuidv4 } from "uuid";
import { createAdjustmentContainer } from "@/utils/PixiUtils";
import { OutlineFilter } from "pixi-filters";

export class LayerX implements LayerXInterface {
  id = uuidv4();
  opacity: number = 1;
  visible: boolean = true;
  zIndex: number;
  name: string;

  constructor(zIndex: number, name: string) {
    this.zIndex = zIndex;
    this.name = name;
  }

  static [immerable] = true;
}

export class ImageLayer extends LayerX implements ImageLayerInterface {
  imageData: ImageData;
  sprite: SpriteX;
  effects: LayerEffectInterface[] = [];

  static [immerable] = true;

  constructor(
    zIndex: number,
    name: string,
    imageData: ImageData,
    sprite: SpriteX
  ) {
    super(zIndex, name);
    this.imageData = imageData;
    this.sprite = sprite;
  }
}

export class AdjustmentLayer
  extends LayerX
  implements AdjustmentLayerInterface
{
  clipToBelow: boolean;
  container: ContainerX;
  mask: Graphics;
  title: string;
  description: string;
  open: boolean;

  static [immerable] = true;

  constructor(
    zIndex: number,
    name: string,
    clipToBelow: boolean,
    width: number,
    height: number,
    title: string,
    description: string,
    open: boolean,
    container?: ContainerX
  ) {
    super(zIndex, name);
    this.clipToBelow = clipToBelow;
    this.open = open;
    if (container) {
      this.container = container;
    } else {
      this.container = createAdjustmentContainer(width, height);
    }

    this.mask = new Graphics();
    this.title = title;
    this.description = description;
  }
}

export class BackgroundLayer
  extends LayerX
  implements BackgroundLayerInterface
{
  transparent: boolean;
  color: string;
  graphics: Graphics = new Graphics();

  constructor(
    transparent: boolean,
    color: string,
    width: number,
    height: number,
    zIndex: number,
    opacity: number
  ) {
    super(zIndex, "Background");
    this.color = color;
    this.transparent = transparent;
    this.graphics.rect(0, 0, width, height);
    this.graphics.fill(color);
    this.graphics.alpha = opacity;
    this.opacity = opacity;
  }

  static [immerable] = true;
}
