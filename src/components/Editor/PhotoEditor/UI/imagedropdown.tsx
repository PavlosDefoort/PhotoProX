import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/pages/editor";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import SheetSide from "./rename";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clamp, fitImageToScreen } from "@/utils/calcUtils";
import { ZoomInIcon, ZoomOutIcon } from "@radix-ui/react-icons";
import { debounce } from "lodash";
import { Poppins } from "next/font/google";
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Sprite,
} from "pixi.js";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface ImageDropDownProps {
  imgName: string;
  setImgName: (value: string) => void;
  appRef: React.MutableRefObject<Application | null>;
  containerRef: React.MutableRefObject<Container | null>;
  maskRef: React.MutableRefObject<Graphics | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}

const ImageDropDown: React.FC<ImageDropDownProps> = ({
  imgName,
  setImgName,
  appRef,
  containerRef,
  maskRef,
  canvasRef,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const openIsChanging = () => {};
  const { project, setProject } = useProjectContext();

  useEffect(() => {
    // Create a listener for f2 key
    const keyListener = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setShowDropdown(true);
      }
    };
    // Create a listener for ctrl + r
    const keyListener2 = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        setShowResize(true);
      }
    };
    document.addEventListener("keydown", keyListener);
    document.addEventListener("keydown", keyListener2);
    return () => {
      document.removeEventListener("keydown", keyListener);
      document.removeEventListener("keydown", keyListener2);
    };
  });

  interface DialogDemoProps {
    open: boolean;
  }

  const newAppRef = useRef<Application | null>(null);
  const newCanvasRef = useRef<HTMLCanvasElement>(null);
  const newContainerRef = useRef<Container | null>(null);
  const newMaskRef = useRef<Graphics | null>(null);
  const [width, setWidth] = useState(project.settings.canvasSettings.width);
  const previousWidth = useRef(project.settings.canvasSettings.width);
  const [height, setHeight] = useState(project.settings.canvasSettings.height);
  const previousHeight = useRef(project.settings.canvasSettings.height);
  const [zoomValue, setZoomValue] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const [newLayers, setNewLayers] = useState(project.layerManager.layers);
  const [appWidth, setAppWidth] = useState(1600);
  const [appHeight, setAppHeight] = useState(800);

  const handleReset = () => {
    setWidth(project.settings.canvasSettings.width);
    setHeight(project.settings.canvasSettings.height);
  };

  const delayedEffectRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setWidth(project.settings.canvasSettings.width);
    setHeight(project.settings.canvasSettings.height);
  }, [
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
  ]);

  // useEffect(() => {
  //   if (showResize) {
  //     const visibleLayers = project.layerManager.layers.filter((layer) => layer.visible);
  //     const layers = visibleLayers;
  //     // Create new instances of the same sprites
  //     layers.forEach((layer) => {
  //       const sprite = SpriteX.from(layer.sprite.texture);
  //       layer.sprite = sprite;
  //       layer.sprite.name = layer.id;
  //     });
  //     setNewLayers(layers);
  //   }
  // }, [showResize, project.layers]);

  useEffect(() => {
    const requestFit = () => {
      const newScale = fitImageToScreen(width, height, appWidth, appHeight, 0);

      setZoomValue(newScale);
    };
    if (showResize) {
      requestFit();
    }
  }, [showResize, width, height, appWidth, appHeight]);

  useEffect(() => {
    setMinZoom(fitImageToScreen(width, height, appWidth, appHeight, 0));
    setMaxZoom(2);
  }, [width, height, appWidth, appHeight]);

  useEffect(() => {
    const createContainerIfNeeded = () => {
      if (newAppRef.current) {
        newContainerRef.current = new Container();
        newContainerRef.current.width = width;
        newContainerRef.current.height = height;
        newContainerRef.current.pivot.set(width / 2, height / 2);
        const background = new Graphics();
        const squareSize = 20;
        const numRows = Math.floor(height / squareSize);
        const numCols = Math.floor(width / squareSize);
        const colors = [0xffffff, 0xe5e5e5]; // Colors for the checkerboard pattern

        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const color = colors[(row + col) % 2];
            background.beginFill(color);
            background.drawRect(
              col * squareSize,
              row * squareSize,
              squareSize,
              squareSize
            );
            background.endFill();
          }
        }
        background.alpha = 0.75;
        background.zIndex = -1;
        newContainerRef.current.addChild(background);
        newAppRef.current.stage.addChild(newContainerRef.current);
      }
    };

    const createMaskIfNeeded = () => {
      if (newAppRef.current && newContainerRef.current) {
        newMaskRef.current = new Graphics();
        newMaskRef.current.beginFill(0xffffff);
        newMaskRef.current.alpha = 0;
        newMaskRef.current.drawRect(0, 0, width, height);
        newMaskRef.current.endFill();
        newContainerRef.current.addChild(newMaskRef.current);
        newContainerRef.current.mask = newMaskRef.current;
      }
    };

    const delayedEffect = debounce(() => {
      if (showResize) {
        if (!newAppRef.current) {
          ("Creating new app");
          newAppRef.current = new Application({
            view: newCanvasRef.current!,
            width: appWidth,
            height: appHeight,
            antialias: true,
            preserveDrawingBuffer: true,
            resolution: 1,
            powerPreference: "default",
            clearBeforeRender: true,
            backgroundAlpha: 0.1,
          });
          newAppRef.current.start();
        }
        if (
          previousWidth.current !== width ||
          previousHeight.current !== height
        ) {
          newAppRef.current?.stage.removeChild(newContainerRef.current!);
          newAppRef.current?.stage.removeChild(newMaskRef.current!);
          newContainerRef.current?.destroy();
          newContainerRef.current = null;
          newMaskRef.current?.destroy();
          newMaskRef.current = null;
          createContainerIfNeeded();
          createMaskIfNeeded();
        }
        const app = newAppRef.current;
        const container = newContainerRef.current;
        const mask = newMaskRef.current;
        let dragTarget: Sprite | null = null;
        let dragOffset: Point | null = null; // Store the initial offset when dragging starts
        // // Make a copy of the project that we can modify
        const newProject = { ...project };

        if (container && mask && newProject.layerManager.layers.length > 0) {
          container.position.set(appWidth / 2, appHeight / 2);
          container.scale.set(zoomValue);
          //Only show layers that are visible

          newLayers.forEach((layer) => {
            layer.id;
            // Add the layer to container if it's not there
            app.stage.eventMode = "static";

            app.stage.on("pointerup", (event: FederatedPointerEvent) =>
              onDragEnd(event)
            );
            app.stage.on("pointerupoutside", (event: FederatedPointerEvent) =>
              onDragEnd(event)
            );

            // layer.sprite.zIndex = layer.zIndex;
            // layer.sprite.rotation = 0;
            // layer.sprite.eventMode = "static";
            // layer.sprite.cursor = "grab";
            // layer.sprite.visible = true;
            // layer.sprite.on("pointerdown", (event: FederatedPointerEvent) => {
            //   newProject.target = layer;
            //   onDragStart(event);
            // });

            const onDragMove = (event: FederatedPointerEvent) => {
              if (dragTarget && dragOffset) {
                const newPosition = event.global.clone();
                // Account for zoom
                const zoomAdjustedDeltaX =
                  (newPosition.x - dragOffset.x) / (zoomValue * 10);

                const zoomAdjustedDeltaY =
                  (newPosition.y - dragOffset.y) / (zoomValue * 10);

                // Update the drag target's position
                dragTarget.position.set(
                  dragTarget.x + zoomAdjustedDeltaX,
                  dragTarget.y + zoomAdjustedDeltaY
                );
                dragOffset = newPosition;
              }
            };
            const onDragStart = (event: FederatedPointerEvent) => {
              // layer.sprite.alpha = 0.75;

              // dragTarget = layer.sprite;
              // dragTarget.cursor = "grabbing";

              dragOffset = event.global.clone(); // Store the initial offset

              app.stage.on("pointermove", (event: FederatedPointerEvent) =>
                onDragMove(event)
              );
            };

            const onDragEnd = (event: FederatedPointerEvent) => {
              if (dragTarget) {
                app.stage.off("pointermove", (event: FederatedPointerEvent) =>
                  onDragMove(event)
                );
                dragTarget.alpha = 1;
                dragTarget.cursor = "grab";
                dragTarget = null;
              }
            };

            if (
              !container.children.find(
                (child) => child.name === layer.id && child.visible
              )
            ) {
              container.children;
              ("Adding layer to container");
              // container.addChild(layer.sprite);
            }
          });

          return () => {
            app.stage.removeAllListeners();
            // newLayers.forEach((layer) => {
            //   layer.sprite.removeAllListeners();
            // });
          };
        }
      } else {
        newAppRef.current?.destroy();
        newAppRef.current = null;
        newContainerRef.current?.destroy();
        newContainerRef.current = null;
        newMaskRef.current?.destroy();
        newMaskRef.current = null;
      }
    }, 100);

    // Clear the previous timeout to prevent multiple calls
    if (delayedEffectRef.current !== undefined) {
      clearTimeout(delayedEffectRef.current);
    }

    // Set a new timeout
    delayedEffectRef.current = setTimeout(() => {
      delayedEffect();
      delayedEffectRef.current = undefined; // Reset to undefined after execution
    }, 100) as any;

    return () => {
      // Clear the timeout if component unmounts or dependency changes
      if (delayedEffectRef.current !== undefined) {
        clearTimeout(delayedEffectRef.current);
      }
    };
  }, [
    width,
    height,
    showResize,
    project,
    zoomValue,
    newLayers,
    appWidth,
    appHeight,
  ]);

  // const handleSave = () => {
  //   ("Width:", width);
  //   project.changeCanvasDimensions(width, height, setProject);
  //   appRef.current?.stage.removeChild(containerRef.current!);
  //   containerRef.current?.destroy();
  //   maskRef.current?.destroy();
  //   containerRef.current = null;
  //   maskRef.current = null;
  //   setShowResize(false);
  // };

  return (
    <div className="">
      <SheetSide
        open={showDropdown}
        setOpen={setShowDropdown}
        setFileName={setImgName}
        imgName={imgName}
      />
      <Dialog open={showResize}>
        <DialogContent
          className={` sm:max-w-[750px] text-black dark:text-white ${poppins.className}`}
        >
          <DialogHeader>
            <DialogTitle>Resize</DialogTitle>
            <DialogDescription className="dark:text-slate-100">
              Change the canvas resolution
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row justify-center items-center">
            <div className="grid gap-4 py-4 pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Width
                </Label>

                <Input
                  id="number"
                  value={width}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Check if the input is a valid number
                    if (!isNaN(parseInt(value))) {
                      previousWidth.current = width;
                      setWidth(
                        value === "" ? 1 : clamp(parseInt(value), 1, 10000)
                      );
                    }
                  }}
                  className="col-span-3 dark:bg-white dark:text-black"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Height{" "}
                </Label>
                <Input
                  id="username"
                  value={height}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Check if the input is a valid number
                    if (!isNaN(parseInt(value))) {
                      previousWidth.current = width;
                      setHeight(
                        value === "" ? 1 : clamp(parseInt(value), 1, 10000)
                      );
                    }
                  }}
                  className="col-span-3 dark:bg-white dark:text-black"
                />
              </div>
            </div>
            <div className=" flex flex-col items-center justify-center ">
              <canvas
                id="newCanvas"
                ref={newCanvasRef}
                className=""
                style={{
                  display: "block",
                  width: 500,
                  height: 250,
                  zIndex: 1,
                  border: "1px solid black",
                }}
              ></canvas>
              <div className=" flex flex-col justify-center items-center pt-2">
                <p className="mr-2">{(zoomValue * 100).toFixed(2) + "%"}</p>
                <div className="flex flex-row justify-center items-center">
                  <Button
                    className=""
                    onClick={() =>
                      setZoomValue(clamp(zoomValue + 0.3, minZoom, maxZoom))
                    }
                  >
                    <ZoomInIcon className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={() =>
                      setZoomValue(clamp(zoomValue - 0.3, minZoom, maxZoom))
                    }
                  >
                    <ZoomOutIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReset}>Reset</Button>
            {/* <Button onClick={handleSave}>Save changes</Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DropdownMenu onOpenChange={openIsChanging} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            className="dark:bg-navbarBackground bg-navbarBackground border-0 h-8 py-1 px-2 dark:hover:bg-buttonHover hover:bg-buttonHover flex items-center"
            variant="outline"
          >
            <span className="text-xs flex-grow">{project.settings.name}</span>
            <ChevronDownIcon className="w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Project Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowDropdown(true)}>
              Rename
              <DropdownMenuShortcut>f2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Project info
              <DropdownMenuShortcut>f8</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setShowResize(true);
              }}
            >
              Resize
              <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Version History
              <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ImageDropDown;
