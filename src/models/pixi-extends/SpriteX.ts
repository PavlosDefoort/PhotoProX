import { Container, RenderTexture, Sprite, Texture } from "pixi.js";

export class SpriteX extends Sprite {
  static from(source: Texture, skipCache?: boolean): SpriteX {
    const customSprite = new SpriteX(source);
    return customSprite;
  }

  center(containerWidth: number, containerHeight: number): void {
    this.anchor.set(0.5);
    this.position.set(containerWidth / 2, containerHeight / 2);
  }
}

export class ContainerX extends Container {
  originalWidth: number;
  originalHeight: number;
  displaySprite: Sprite | null = null;
  renderTexture: RenderTexture | null = null;
  /** Old RT kept alive so displaySprite can still show it until compositeToRT swaps. */
  staleRenderTexture: RenderTexture | null = null;
  compositeNeeded: boolean = false;
  alwaysComposite: boolean = false;
  directRenderMode: boolean = false;

  constructor(width: number, height: number) {
    super();
    this.originalWidth = width;
    this.originalHeight = height;
  }

  override destroy(options?: any) {
    if (this.displaySprite) {
      this.displaySprite.destroy();
      this.displaySprite = null;
    }
    if (this.renderTexture) {
      this.renderTexture.destroy(true);
      this.renderTexture = null;
    }
    if (this.staleRenderTexture) {
      this.staleRenderTexture.destroy(true);
      this.staleRenderTexture = null;
    }
    super.destroy(options);
  }
}
