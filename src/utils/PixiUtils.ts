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
} from "pixi.js";
import imageCompression, { Options } from "browser-image-compression";

export async function createMiniApp(
  canvasRef: React.MutableRefObject<ICanvas | null>
): Promise<Application> {
  const newApp = await createApp(
    800,
    400,
    canvasRef.current as ICanvas,
    0x1a1a1a,
    DEFAULT_PERFORMANCE_SETTINGS
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
  format: "png" | "jpg" | "webp" | "jpeg" = "png"
): Promise<string> {
  try {
    let newFormat = format === "jpeg" ? "jpg" : format;
    const renderer = app.renderer;

    const base64 = await renderer.extract.base64({
      antialias: true,
      clearColor: 0xcdcdcd,
      resolution: 1,
      target: container,
      format: newFormat as "png" | "jpg" | "webp",
    });
    console.log("Created base64 image");

    const newFile = base64ToFile(base64, `project.${newFormat}`);
    console.log("Created new file");

    const compressedImage = await imageCompression(newFile, {
      maxSizeMB: 4.0,
      alwaysKeepResolution: true,
      fileType: `image/${format}`,
      useWebWorker: true,
    });
    console.log("Compressed image");

    const compressedBase64 = await fileToBase64(compressedImage);

    console.log("Converted compressed image to base64");

    // Optional: Create a download link for the image
    // const link = document.createElement("a");
    // link.href = compressedBase64;
    // link.download = `project.${newFormat}`;
    // link.click();

    return compressedBase64;
  } catch (error) {
    console.error("Error exporting project image:", error);
    throw error;
  }
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
  settings: PerformanceSettings = DEFAULT_PERFORMANCE_SETTINGS
) {
  // Create the app, wait for it to finish, and set the appRef and containerRef
  const color = isDarkMode ? 0x1a1a1a : 0xcdcdcd;
  const newApp = await createApp(appWidth, appHeight, canvas, color, settings);
  const newContainer = createContainerBM(canvasWidth, canvasHeight);
  newApp.stage.addChild(newContainer);
  appRef.current = newApp;
  setContainer(newContainer);
  setTrigger(!trigger);
}

async function createApp(
  appWidth: number,
  appHeight: number,
  canvas: ICanvas,
  color: number,
  settings: PerformanceSettings
) {
  //  NEXT: CHECK BACKGROUNDS FOR WHITE LINES
  const newApp = new Application();
  console.log("Settings:", settings);
  await newApp.init({
    canvas: canvas,
    width: appWidth,
    height: appHeight,
    antialias: true,
    preserveDrawingBuffer: true,
    resolution: window.devicePixelRatio,
    powerPreference: settings.powerPreference,
    clearBeforeRender: settings.clearBeforeRender,
    backgroundColor: color,
    hello: true,
    autoDensity: true,
    roundPixels: true,
    preference: "webgpu",
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
  container: Container
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
  squareSize: number
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
      const x = Math.ceil(col * squareSize); // Round to integer
      const y = Math.ceil(row * squareSize); // Round to integer
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
  containerHeight: number
): ContainerX {
  const newContainer = new ContainerX(containerWidth, containerHeight);
  newContainer.width = containerWidth;
  newContainer.height = containerHeight;
  newContainer.pivot.set(containerWidth / 2, containerHeight / 2);
  newContainer.sortableChildren = true;

  const background = createCheckerboardPattern(
    containerWidth,
    containerHeight,
    20
  );
  newContainer.addChild(background);

  // Mask so when you drag items, they are hidden outside the container
  const mask = createMask(containerWidth, containerHeight);
  newContainer.addChild(mask);
  newContainer.mask = mask;

  return newContainer;
}

export function createAdjustmentContainer(
  containerWidth: number,
  containerHeight: number
): ContainerX {
  const adjustmentContainer = new ContainerX(containerWidth, containerHeight);
  adjustmentContainer.pivot.set(containerWidth / 2, containerHeight / 2);
  adjustmentContainer.position.set(containerWidth / 2, containerHeight / 2);
  adjustmentContainer.sortableChildren = true;

  return adjustmentContainer;
}

export function onDragMove(
  event: FederatedPointerEvent,
  dragTarget: SpriteX,
  dragOffset: PointData
) {
  if (dragTarget && dragOffset) {
    // Calculate the new position of the sprite relative to the container
    const newPosition = event.getLocalPosition(dragTarget.parent);

    // Adjust the drag offset by the scale factor
    const offsetX = dragOffset.x * dragTarget.scale.x;
    const offsetY = dragOffset.y * dragTarget.scale.y;

    // Set the new position of the sprite
    dragTarget.x = newPosition.x - offsetX;
    dragTarget.y = newPosition.y - offsetY;
  }
}

export function onDragStart(
  event: FederatedPointerEvent,
  dragTarget: SpriteX,
  dragOffset: PointData
) {
  // Set the opacity of the clicked layer to 0.75
  dragTarget.alpha = 0.75;

  // Set the project target to the clicked layer
  dragTarget.cursor = "grabbing";

  // Get the position of the pointer relative to the parent container
  dragOffset = event.getLocalPosition(dragTarget);

  dragTarget.on("pointermove", (event: FederatedPointerEvent) =>
    onDragMove(event, dragTarget, dragOffset)
  );
}

export function fitItemToContainer(
  item: SpriteX | Container,
  container: Container | Application | null,
  containerWidth?: number,
  containerHeight?: number,
  setCurrentZoom?: (value: number) => void
): void {
  if (container === null && containerWidth && containerHeight) {
    // Use just the width and height of the container
    const scale = Math.min(
      containerWidth / item.width,
      containerHeight / item.height
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
        container.renderer.height / item.height
      );
      item.scale.set(scale);
      if (setCurrentZoom) {
        setCurrentZoom(scale);
      }
    } else if (container instanceof Container) {
      // Use the container's width and height
      const scale = Math.min(
        container.width / item.width,
        container.height / item.height
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
  previousOpacity: number
) {
  dragTarget.off("pointermove", (event: FederatedPointerEvent) => {
    onDragMove(event, dragTarget, dragOffset);
  });

  dragTarget.alpha = previousOpacity;
  dragTarget.cursor = "grab";
}
