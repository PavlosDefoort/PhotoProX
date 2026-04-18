import { Container, RenderTexture, Sprite, Texture } from "pixi.js";

export class SpriteX extends Sprite {
  // getVertexData(): Float32Array | undefined {
  //   // Access the protected vertexData property
  //   return this.vertexData;
  // }
  static from(source: Texture, skipCache?: boolean): SpriteX {
    const customSprite = new SpriteX(source);

    // Add any custom logic here if needed
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
  compositeNeeded: boolean = false;
  alwaysComposite: boolean = false;

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
    super.destroy(options);
  }
}
