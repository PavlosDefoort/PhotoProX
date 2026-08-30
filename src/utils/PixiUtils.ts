import {
  DEFAULT_PERFORMANCE_SETTINGS,
  PerformanceSettings,
} from "@/interfaces/FirebaseInterfaces";
import { ContainerX, SpriteX } from "@/models/pixi-extends/SpriteX";
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  ICanvas,
  PointData,
  RenderTexture,
  Sprite,
} from "pixi.js";
import { getTextureCapability, getSafeTextureDimension } from "@/utils/TextureCapabilities";

let desktopPixiCspFallback: Promise<unknown> | null = null;

const ensureDesktopPixiCspSupport = async () => {
  if (typeof window === "undefined" || !window.zynaloDesktop) return;
  desktopPixiCspFallback ??= import("pixi.js/unsafe-eval");
  await desktopPixiCspFallback;
};

export async function createMiniApp(
  canvasRef: React.MutableRefObject<ICanvas | null>,
): Promise<Application> {
  const newApp = await createApp(
    600,
    300,
    canvasRef.current as ICanvas,
    0x1a1a1a,
    DEFAULT_PERFORMANCE_SETTINGS,
  );

  return newApp;
}

function base64ToFile(base64: string, filename: string): File {
  // Split the base64 string into metadata and data
  const [metadata, base64Data] = base64.split(",");

  // Extract MIME type from metadata
  const mimeMatch = metadata.match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error("Invalid base64 format");
  }
  const mime = mimeMatch[1];

  // Decode base64 string into binary data
  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  // Return a new File object
  return new File([array], filename, { type: mime });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      // Ensure that the result is a string
      const result = reader.result as string;
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file as base64"));
    };

    reader.readAsDataURL(file);
  });
}

// Export and compress image
export async function exportProjectImage(
  app: Application,
  container: Container,
  format: "png" | "jpg" | "webp" | "jpeg" = "png",
): Promise<string> {
  // Temporarily enable rendering for export (RT architecture sets renderable=false)
  const wasRenderable = container.renderable;
  const transparencyGrid = container.children[0];
  const wasGridVisible = transparencyGrid?.visible;
  container.renderable = true;
  // The checkerboard is editor chrome, not document content.
  if (transparencyGrid) transparencyGrid.visible = false;
  try {
    let newFormat = format === "jpeg" ? "jpg" : format;
    const renderer = app.renderer;
    const capability = getTextureCapability(renderer);
    const limit = getSafeTextureDimension(capability.maxTextureDimension);
    const documentWidth = Math.round((container as ContainerX).originalWidth ?? container.width);
    const documentHeight = Math.round((container as ContainerX).originalHeight ?? container.height);
    if (documentWidth > limit || documentHeight > limit) {
      throw new Error(
        `Full-resolution export is unavailable: the document (${documentWidth}×${documentHeight}) exceeds the safe GPU texture limit (${limit}). Tiled export is not implemented.`,
      );
    }

    const base64 = await renderer.extract.base64({
      antialias: true,
      // Alpha-capable formats retain transparent pixels. JPEG has no alpha,
      // so transparent areas are flattened onto the editor's default white.
      clearColor: newFormat === "jpg" ? 0xffffff : "#00000000",
      resolution: 1,
      target: container,
      format: newFormat as "png" | "jpg" | "webp",
    });
    console.log("Created base64 image");

    const newFile = base64ToFile(base64, `project.${newFormat}`);
    console.log("Created new file");

    // The renderer already encoded exactly once in the requested format.
    // Do not run browser-image-compression here: that would create a second
    // lossy JPEG/WebP encode and could mutate the effective export dimensions.
    return fileToBase64(newFile);
  } catch (error) {
    console.error("Error exporting project image:", error);
    throw error;
  } finally {
    if (transparencyGrid && wasGridVisible !== undefined) {
      transparencyGrid.visible = wasGridVisible;
    }
    container.renderable = wasRenderable;
  }
}

/**
 * Composite the container (with all layers/filters) into its RenderTexture
 * at document resolution. This is the core of the RenderTexture architecture:
 * compositing happens at fixed integer-pixel coords, eliminating sub-pixel
 * filter edge artifacts caused by zoom.
 */
export function compositeToRT(renderer: any, container: ContainerX) {
  const rt = container.renderTexture;
  if (!rt) return;

  // Save current transform (zoom/pan for event hit-testing)
  const sx = container.scale.x,
    sy = container.scale.y;
  const px = container.x,
    py = container.y;

  // Set identity transform for document-resolution compositing
  // With scale=1 and position=pivot, the localTransform becomes identity
  container.scale.set(1);
  container.x = container.pivot.x;
  container.y = container.pivot.y;
  container.renderable = true;

  // zIndex changes and move-tool updates must be reflected in the exact pass
  // that refreshes the display texture, even if React's debounced render has
  // not run yet.
  if (container.sortableChildren) container.sortChildren();

  renderer.render({ container, target: rt, clear: true });

  // Restore zoom/pan transform and non-renderable state
  container.scale.set(sx, sy);
  container.x = px;
  container.y = py;
  container.renderable = false;

  // If syncContainerBM deferred the texture swap to avoid a blank-frame flash,
  // apply it now that the new RT has content. Destroy the stale RT only after
  // the displaySprite is pointing at the live one.
  if (container.displaySprite && container.displaySprite.texture !== rt) {
    container.displaySprite.texture = rt;
    if (container.staleRenderTexture) {
      container.staleRenderTexture.destroy(true);
      container.staleRenderTexture = null;
    }
  }
}

/**
 * Add a ContainerX to the stage with the RenderTexture architecture:
 * - displaySprite is added for visual display
 * - container is added for event hit-testing only (renderable=false)
 * - initial composite is performed
 */
export function addContainerToStage(app: Application, container: ContainerX) {
  // Add display sprite first (visual, below container in child order)
  if (container.displaySprite) {
    container.displaySprite.eventMode = "none";
    app.stage.addChild(container.displaySprite);
  }

  // Add container on top (for event hit-testing, not rendered)
  app.stage.addChild(container);
  container.renderable = false;

  // Initial composite
  compositeToRT(app.renderer, container);
}

export async function createProjectApp(
  appWidth: number,
  appHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  canvas: ICanvas,
  appRef: React.MutableRefObject<Application | null>,
  setContainer: (value: ContainerX | null) => void,
  isDarkMode: boolean,
  setTrigger: (trigger: boolean) => void,
  trigger: boolean,
  settings: PerformanceSettings = DEFAULT_PERFORMANCE_SETTINGS,
) {
  // Create the app, wait for it to finish, and set the appRef and containerRef
  const color = isDarkMode ? 0x1a1a1a : 0xcdcdcd;
  const newApp = await createApp(appWidth, appHeight, canvas, color, settings);
  const newContainer = createContainerBM(canvasWidth, canvasHeight);
  addContainerToStage(newApp, newContainer);
  appRef.current = newApp;
  setContainer(newContainer);
  setTrigger(!trigger);
}

async function createApp(
  appWidth: number,
  appHeight: number,
  canvas: ICanvas,
  color: number,
  settings: PerformanceSettings,
) {
  await ensureDesktopPixiCspSupport();
  const newApp = new Application();
  console.log("Settings:", settings);
  await newApp.init({
    canvas: canvas,
    width: appWidth,
    height: appHeight,
    antialias: true,
    preserveDrawingBuffer: true,
    resolution: window.devicePixelRatio,
    ...(navigator.userAgent.includes("Windows")
      ? {}
      : { powerPreference: settings.powerPreference }),
    clearBeforeRender: settings.clearBeforeRender,
    backgroundColor: color,
    hello: true,
    autoDensity: true,
    // Electron's WebGPU path can render only one triangle of Pixi's textured
    // quad on some Windows/D3D configurations. Use the mature WebGL backend
    // for desktop; the web app can continue honoring the user's preference.
    preference: window.zynaloDesktop ? "webgl" : settings.graphicsAPI,
  });
  newApp.stage.eventMode = "static";

  return newApp;
}

function removeAllListenersRecursively(container: Container) {
  // Remove listeners from the current container
  container.removeAllListeners();

  // Recursively remove listeners from all children of the container
  container.children.forEach((child) => {
    if (child instanceof Container && !(child instanceof SpriteX)) {
      // If the child is a container, recursively remove listeners from its children
      removeAllListenersRecursively(child);
    } else {
      child.removeAllListeners();
      // Otherwise, remove listeners from the child itself
    }
  });
}

export function removeSpriteFromContainer(
  sprite: SpriteX,
  container: Container,
) {
  container.removeChild(sprite);
  sprite.destroy();
}

export function cleanApp(app: Application) {
  app.stage.removeAllListeners();

  // Recursively remove all listeners from the stage and its children
  removeAllListenersRecursively(app.stage);
}

function createMask(containerWidth: number, containerHeight: number): Graphics {
  const newMask = new Graphics();
  newMask.rect(0, 0, containerWidth, containerHeight);
  newMask.fill(0xffffff);
  newMask.alpha = 0;

  return newMask;
}

function createCheckerboardPattern(
  containerWidth: number,
  containerHeight: number,
  squareSize: number,
): Graphics {
  // Create a new Graphics object instance
  const background = new Graphics();
  // Rows are dependent on height, flooring will ensure we don't go over, though we may go under
  const numRows = Math.ceil(containerHeight / squareSize);
  // Cols are dependent on width
  const numCols = Math.ceil(containerWidth / squareSize);
  // Colors for the checkerboard pattern
  const colors = [0xffffff, 0xe5e5e5];

  // Iterate over the rows and columns
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const color = colors[(row + col) % 2];
      const x = Math.ceil(col * squareSize);
      const y = Math.ceil(row * squareSize);
      background.rect(x, y, squareSize, squareSize);
      background.fill(color);
    }
  }
  // Set the alpha to 0.75 so that it is semi-transparent
  background.alpha = 0.75;
  // Set the zIndex to -1 so that it is behind the other objects
  background.zIndex = -1;

  // Return the background
  return background;
}

/**
 * @param {number} containerWidth - The width of the container.
 * @param {number} containerHeight - The height of the container.
 * @returns {Container} - A new container with a background and a mask.
 */
export function createContainerBM(
  containerWidth: number,
  containerHeight: number,
): ContainerX {
  const newContainer = new ContainerX(containerWidth, containerHeight);
  newContainer.width = containerWidth;
  newContainer.height = containerHeight;
  newContainer.pivot.set(
    Math.round(containerWidth / 2),
    Math.round(containerHeight / 2),
  );
  newContainer.sortableChildren = true;

  const background = createCheckerboardPattern(
    containerWidth,
    containerHeight,
    20,
  );
  newContainer.addChild(background);

  // Mask so when you drag items, they are hidden outside the container
  const mask = createMask(containerWidth, containerHeight);
  newContainer.addChild(mask);
  newContainer.mask = mask;

  // Create RenderTexture for offscreen compositing at document resolution
  const rt = RenderTexture.create({
    width: containerWidth,
    height: containerHeight,
    resolution: 1,
  });

  // Create display sprite to show the composited result on stage
  const displaySprite = new Sprite(rt);
  displaySprite.pivot.set(
    Math.round(containerWidth / 2),
    Math.round(containerHeight / 2),
  );

  newContainer.renderTexture = rt;
  newContainer.displaySprite = displaySprite;

  return newContainer;
}

export function syncContainerBM(
  container: ContainerX,
  containerWidth: number,
  containerHeight: number,
) {
  if (
    container.originalWidth === containerWidth &&
    container.originalHeight === containerHeight
  ) {
    return;
  }

  const existingBackground = container.children[0] as Graphics | undefined;
  const existingMask = container.children[1] as Graphics | undefined;
  existingBackground?.removeFromParent();
  existingMask?.removeFromParent();
  existingBackground?.destroy();
  existingMask?.destroy();

  if (existingMask) {
    container.mask = null;
  }

  container.originalWidth = containerWidth;
  container.originalHeight = containerHeight;
  container.width = containerWidth;
  container.height = containerHeight;
  container.pivot.set(
    Math.round(containerWidth / 2),
    Math.round(containerHeight / 2),
  );

  const background = createCheckerboardPattern(
    containerWidth,
    containerHeight,
    20,
  );
  const mask = createMask(containerWidth, containerHeight);
  container.addChildAt(mask, 0);
  container.addChildAt(background, 0);
  container.mask = mask;

  // Replace the RT at the correct dimensions, but deliberately DO NOT update
  // displaySprite.texture yet. Keep the old RT alive so the displaySprite
  // keeps showing its previous content until compositeToRT has new pixels
  // ready — preventing a blank-frame flash when switching between documents
  // with different canvas dimensions.
  if (container.renderTexture) {
    // Park the old RT as stale so compositeToRT can destroy it after swapping.
    container.staleRenderTexture = container.renderTexture;
  }
  container.renderTexture = RenderTexture.create({
    width: containerWidth,
    height: containerHeight,
    resolution: 1,
  });

  if (!container.displaySprite) {
    // No existing sprite — safe to assign immediately (nothing to preserve).
    container.displaySprite = new Sprite(container.renderTexture);
  }
  // If displaySprite already exists, leave its texture alone here.
  // compositeToRT will swap it once new content is ready and will destroy
  // the stale RT at that point.

  container.displaySprite.pivot.set(
    Math.round(containerWidth / 2),
    Math.round(containerHeight / 2),
  );
  container.compositeNeeded = true;
}

export function createAdjustmentContainer(
  containerWidth: number,
  containerHeight: number,
): ContainerX {
  const adjustmentContainer = new ContainerX(containerWidth, containerHeight);

  return adjustmentContainer;
}

export function onDragMove(
  event: FederatedPointerEvent,
  dragTarget: SpriteX,
  dragOffset: PointData,
) {
  if (dragTarget && dragOffset) {
    // Calculate the new position of the sprite relative to the container
    const newPosition = event.getLocalPosition(dragTarget.parent!);

    // Adjust the drag offset by the scale factor
    const offsetX = dragOffset.x * dragTarget.scale.x;
    const offsetY = dragOffset.y * dragTarget.scale.y;

    // Set the new position of the sprite
    dragTarget.x = newPosition.x - offsetX;
    dragTarget.y = newPosition.y - offsetY;

    // Mark container for re-composite so the change is visible
    const parent = dragTarget.parent;
    if (parent instanceof ContainerX) {
      parent.compositeNeeded = true;
    }
  }
}

export function onDragStart(
  event: FederatedPointerEvent,
  dragTarget: SpriteX,
  dragOffset: PointData,
) {
  // Set the opacity of the clicked layer to 0.75
  dragTarget.alpha = 0.75;

  // Set the project target to the clicked layer
  dragTarget.cursor = "grabbing";

  // Get the position of the pointer relative to the parent container
  dragOffset = event.getLocalPosition(dragTarget);

  dragTarget.on("pointermove", (event: FederatedPointerEvent) =>
    onDragMove(event, dragTarget, dragOffset),
  );
}

export function fitItemToContainer(
  item: SpriteX | Container,
  container: Container | Application | null,
  containerWidth?: number,
  containerHeight?: number,
  setCurrentZoom?: (value: number) => void,
): void {
  if (container === null && containerWidth && containerHeight) {
    // Use just the width and height of the container
    const scale = Math.min(
      containerWidth / item.width,
      containerHeight / item.height,
    );

    item.scale.set(scale);
    if (setCurrentZoom) {
      setCurrentZoom(scale);
    }
  } else if (container) {
    if (container instanceof Application) {
      // Use the app's width and height
      const scale = Math.min(
        container.renderer.width / item.width,
        container.renderer.height / item.height,
      );
      item.scale.set(scale);
      if (setCurrentZoom) {
        setCurrentZoom(scale);
      }
    } else if (container instanceof Container) {
      // Use the container's width and height
      const scale = Math.min(
        container.width / item.width,
        container.height / item.height,
      );
      item.scale.set(scale);
      if (setCurrentZoom) {
        setCurrentZoom(scale);
      }
    }
  }
}

export function onDragEnd(
  event: FederatedPointerEvent,
  dragTarget: SpriteX,
  dragOffset: PointData,
  previousOpacity: number,
) {
  dragTarget.off("pointermove", (event: FederatedPointerEvent) => {
    onDragMove(event, dragTarget, dragOffset);
  });

  dragTarget.alpha = previousOpacity;
  dragTarget.cursor = "grab";
}
