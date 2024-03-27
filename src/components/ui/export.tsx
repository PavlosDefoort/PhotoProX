import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Application, Container, Sprite, autoDetectRenderer } from "pixi.js";
import { useProjectContext } from "@/pages/editor";
import { debounce, set } from "lodash";
import { clamp, fitImageToScreen } from "@/utils/calcUtils";
import { ZoomInIcon, ZoomOutIcon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExportProps {
  showExport: boolean;
  setShowExport: (value: boolean) => void;
  type: string;
  setType: (value: string) => void;
  appRef: React.MutableRefObject<Application | null>;
  containerRef: React.MutableRefObject<Container | null>;
}

const Export: React.FC<ExportProps> = ({
  showExport,
  type,
  setType,
  appRef,
  containerRef,
  setShowExport,
}) => {
  const { project, setTrigger, trigger } = useProjectContext();
  const [name, setName] = React.useState<string>("My Project");
  const [link, setLink] = React.useState<HTMLAnchorElement | null>(null);
  const [sizeInBytes, setSizeInBytes] = React.useState<number>(0);
  const [image, setImage] = React.useState<string>("");
  const showAppRef = useRef<Application | null>(null);
  const showContainerRef = useRef<Container | null>(null);
  const showCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderWidth, setRenderWidth] = React.useState<number>(0);
  const [renderHeight, setRenderHeight] = React.useState<number>(0);
  const [scaleValue, setScaleValue] = React.useState<number>(1);
  const [minScale, setMinScale] = React.useState<number>(0.1);
  const [maxScale, setMaxScale] = React.useState<number>(3);
  const [canvasWidth, setCanvasWidth] = React.useState<number>(0);
  const [canvasHeight, setCanvasHeight] = React.useState<number>(0);
  const [appWidth, setAppWidth] = React.useState<number>(0);
  const [appHeight, setAppHeight] = React.useState<number>(0);

  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.settings.name);
    }
  }, [project]);

  useEffect(() => {
    setMinScale(0.05);
    setMaxScale(2);
  }, [renderWidth, renderHeight]);

  useEffect(() => {
    if (showContainerRef.current) {
      showContainerRef.current.scale.set(scaleValue);
    }
  }, [scaleValue, showContainerRef]);

  useEffect(() => {
    if (
      image.length > 0 &&
      showCanvasRef.current &&
      renderWidth > 0 &&
      renderHeight > 0 &&
      canvasWidth > 0 &&
      canvasHeight > 0 &&
      appWidth > 0 &&
      appHeight > 0
    ) {
      const debounced = debounce(() => {
        if (!showAppRef.current && showCanvasRef.current) {
          showAppRef.current = new Application({
            view: showCanvasRef.current,
            width: appWidth,
            height: appHeight,
            antialias: true,
            preserveDrawingBuffer: true,
            resolution: 1,
            powerPreference: "default",
            clearBeforeRender: true,
            hello: true,
            backgroundAlpha: 0.5,
          });
        }

        if (!showContainerRef.current && showAppRef.current) {
          showContainerRef.current = new Container();
          showContainerRef.current.width = renderWidth;
          showContainerRef.current.height = renderHeight;
          showContainerRef.current.pivot.set(renderWidth / 2, renderHeight / 2);
          showContainerRef.current.position.set(appWidth / 2, appHeight / 2);
          showAppRef.current.stage.addChild(showContainerRef.current);
          const someScale = fitImageToScreen(
            renderWidth,
            renderHeight,
            appWidth,
            appHeight,
            0
          );
          setScaleValue(someScale);
        }

        if (showContainerRef.current && showAppRef.current) {
          const imageSprite = Sprite.from(image);
          showContainerRef.current.addChild(imageSprite);
          showContainerRef.current.scale.set(scaleValue);
        }
      }, 100);
      debounced();
    }
  }, [
    image,
    renderWidth,
    renderHeight,
    scaleValue,
    canvasWidth,
    canvasHeight,
    appWidth,
    appHeight,
  ]);

  useEffect(() => {
    if (link) {
      link.download = `${name}.${type}`;
      showAppRef.current = null;
      showContainerRef.current = null;
    }
  }, [link, name, type]);

  useEffect(() => {
    const exportContainer = async () => {
      if (appRef.current && containerRef.current) {
        ("Exporting");
        const previousPivot = containerRef.current.pivot.clone();
        previousPivot;

        // Set position to 0, 0
        containerRef.current.pivot.set(0, 0);
        containerRef.current.position.set(0, 0);
        containerRef.current.scale.set(1, 1);

        const renderer = autoDetectRenderer({
          width: project.settings.canvasSettings.width,
          height: project.settings.canvasSettings.height,
          powerPreference: "high-performance",
          antialias: true,
          resolution: 1,
          background: 0xcdcdcd,
          backgroundColor: 0xcdcdcd,
        });

        setRenderWidth(renderer.width);
        setRenderHeight(renderer.height);

        renderer.render(containerRef.current);
        const base64 = await renderer.extract.base64();
        const link = document.createElement("a");
        const binary = atob(base64.split(",")[1]);
        const sizeInBytes = binary.length;
        setSizeInBytes(sizeInBytes);
        link.href = base64;

        setLink(link);
        setImage(base64);

        renderer.destroy();

        containerRef.current.width, containerRef.current.height;
        containerRef.current.pivot.set(previousPivot.x, previousPivot.y);
        setTrigger(!trigger);
      }
    };
    if (showExport) {
      exportContainer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExport]);

  const performDownload = (
    link: HTMLAnchorElement | null,
    actuallyDownload: boolean = true
  ) => {
    if (link === null) return;
    if (actuallyDownload) {
      link.click();
    }

    setShowExport(false);
    setLink(null);
    setImage("");
    setAppHeight(0);
    setAppWidth(0);
    setCanvasHeight(0);
    setCanvasWidth(0);
    setRenderHeight(0);
    setRenderWidth(0);
    setScaleValue(1);
    setSizeInBytes(0);
    showAppRef.current = null;
    showContainerRef.current = null;
    showCanvasRef.current = null;
  };

  useEffect(() => {
    if (
      stageRef.current === null ||
      !showExport ||
      !showCanvasRef.current ||
      renderWidth <= 0 ||
      renderHeight <= 0
    )
      return;

    const stageContainer = stageRef.current;

    const handleResize = () => {
      if (stageContainer) {
        setCanvasWidth(stageContainer.clientWidth);
        setCanvasHeight(stageContainer.clientHeight);
        setAppWidth(stageContainer.clientWidth * 2);
        setAppHeight(stageContainer.clientHeight * 2);
      }
    };

    if (stageContainer) {
      // Create a new ResizeObserver instance
      const resizeObserver = new ResizeObserver(handleResize);

      // Start observing the target element
      resizeObserver.observe(stageContainer);

      // Stop observing on cleanup
      return () => {
        resizeObserver.unobserve(stageContainer);
      };
    }
  }, [stageRef, showExport, showCanvasRef, renderWidth, renderHeight]);

  function bytesToMegabytes(bytes: number) {
    // Round to the nearest hundredth
    const megabytes = bytes / 1024 / 1024;
    return Math.round(megabytes * 100) / 100;
  }

  return (
    <div>
      <Dialog open={showExport}>
        <DialogContent className=" max-w-5xl   text-black dark:text-white">
          <DialogHeader className="select-none">
            <DialogTitle>Export Project</DialogTitle>
            <DialogDescription>
              Export your project (your canvas and all its edited layers) as a
              PNG, JPEG, or WebP image.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[500px] full flex flex-row">
            <div
              className="w-2/3 h-full relative "
              id="export-container"
              ref={stageRef}
            >
              <div className="absolute z-50 text-white bottom-0 right-2 select-none">
                <p className="bg-black opacity-80 ">
                  {bytesToMegabytes(sizeInBytes)} MB
                </p>
              </div>
              <div className="absolute z-50 left-1/2 transform -translate-x-1/2 bottom-0 text-white">
                <div className="flex flex-row">
                  <ZoomInIcon
                    className="w-5 h-5 bg-black opacity-80 "
                    onClick={() =>
                      setScaleValue(
                        clamp(scaleValue + 0.05, minScale, maxScale)
                      )
                    }
                  />

                  <ZoomOutIcon
                    className="w-5 h-5 bg-black opacity-80"
                    onClick={() =>
                      setScaleValue(
                        clamp(scaleValue - 0.05, minScale, maxScale)
                      )
                    }
                  />
                </div>
              </div>
              <div className="absolute z-50 flex flex-row justify-center items-center text-white bottom-0 left-2 select-none">
                <p className="bg-black opacity-80">
                  {(scaleValue * 100).toFixed(2) + "%"}
                </p>
              </div>

              <canvas
                ref={showCanvasRef}
                className="w-full h-full absolute top-0 left-0"
              ></canvas>
            </div>
            <div className="w-1/3 ml-2 flex flex-col space-y-4 items-center justify-start   ">
              <div className="flex flex-row w-full items-center justify-center space-x-1">
                <div className="">
                  <Label htmlFor="name" className="text-right select-none">
                    Name
                  </Label>
                  <div className="relative ">
                    <Input
                      id="name"
                      value={name}
                      className=" dark:bg-[#333] dark:text-white dark:border-slate-400 mt-1  focus-visible:ring-offset-0 focus-visible:ring-1"
                      onChange={(e) => {
                        setName(e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="">
                  <Label htmlFor="format" className="text-right select-none">
                    Format
                  </Label>
                  <Select
                    onValueChange={(value: string) => setType(value)}
                    value={type}
                  >
                    <SelectTrigger className="w-[180px] mt-1 dark:border-slate-400 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0">
                      <SelectValue placeholder="Select a format" />
                    </SelectTrigger>
                    <SelectContent className="focus-visible:ring-offset-0 focus-visible:ring-0">
                      <SelectGroup className="focus-visible:ring-offset-0 focus-visible:ring-0">
                        <SelectLabel>Formats</SelectLabel>
                        <SelectItem
                          value="png"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          PNG
                        </SelectItem>
                        <SelectItem
                          value="jpg"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800 "
                        >
                          JPG
                        </SelectItem>
                        <SelectItem
                          value="webp"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          WEBP
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-row space-x-3">
                <Button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => performDownload(link, false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => performDownload(link)}
                >
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* <DialogFooter>
            <Button type="submit" onClick={() => performDownload(link)}>
              Export
            </Button>
          </DialogFooter> */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Export;
