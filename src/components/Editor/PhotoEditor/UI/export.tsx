import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectContext } from "@/pages/editor";
import { fitImageToScreen } from "@/utils/calcUtils";
import { resizeImage } from "@/utils/imagecalls";
import { debounce } from "lodash";
import {
  Application,
  Container,
  ICanvas,
  IRenderer,
  Sprite,
  autoDetectRenderer,
} from "pixi.js";
import React, { useCallback, useEffect, useRef } from "react";
import ImageViewer from "./fullscreenimage";
import { Slider } from "../../../ui/slider";

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
  const [resolution, setResolution] = React.useState<number[]>([1]);
  const [samples, setSamples] = React.useState<sampleType>("spline");
  const [resizeWidth, setResizeWidth] = React.useState<number>(0);
  const [resizeHeight, setResizeHeight] = React.useState<number>(0);
  const [jpegQuality, setJpegQuality] = React.useState<number[]>([100]);
  const [pngQuality, setPngQuality] = React.useState<number[]>([9]);
  const [webpQuality, setWebpQuality] = React.useState<number[]>([100]);
  const [progress, setProgress] = React.useState<number>(0);

  type sampleType =
    | "bicubic"
    | "lanczos4"
    | "spline"
    | "mitchell"
    | "area"
    | "nearest"
    | "bilinear";

  const rendererRef = useRef<IRenderer<ICanvas> | null>(null);

  const spriteRef = useRef<Sprite | null>(null);

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

  const displayApp = useCallback(() => {
    if (
      !showAppRef.current &&
      showCanvasRef.current &&
      appWidth > 0 &&
      appHeight > 0
    ) {
      showAppRef.current = new Application({
        view: showCanvasRef.current,
        width: appWidth,
        height: appHeight,
        antialias: true,
        preserveDrawingBuffer: true,
        resolution: 1,
        powerPreference: "default",
        clearBeforeRender: true,
        backgroundAlpha: 0.5,
      });
      showAppRef.current.start();
    }

    if (
      !showContainerRef.current &&
      showAppRef.current &&
      resizeWidth > 0 &&
      resizeHeight > 0
    ) {
      showContainerRef.current = new Container();
      showContainerRef.current.width = resizeWidth;
      showContainerRef.current.height = resizeHeight;
      showContainerRef.current.pivot.set(resizeWidth / 2, resizeHeight / 2);
      showContainerRef.current.position.set(appWidth / 2, appHeight / 2);
      showAppRef.current.stage.addChild(showContainerRef.current);
      const someScale = fitImageToScreen(
        resizeWidth,
        resizeHeight,
        appWidth,
        appHeight,
        0
      );
      setScaleValue(someScale);
    }

    if (
      showContainerRef.current &&
      showAppRef.current &&
      spriteRef.current === null &&
      image.length > 0
    ) {
      spriteRef.current = Sprite.from(image);
      if (showContainerRef.current) {
        showContainerRef.current.addChild(spriteRef.current);
      }
    }

    if (spriteRef.current && showContainerRef.current && showAppRef.current) {
      // if (showAppRef.current.renderer) {
      //   showAppRef.current.renderer.resolution = resolution[0];
      // }
      showContainerRef.current.scale.set(scaleValue);
    }
  }, [appHeight, appWidth, image, resizeWidth, resizeHeight, scaleValue]);

  const displayAppRef = useRef(displayApp);

  useEffect(() => {
    displayAppRef.current = displayApp;
  }, [displayApp]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedDisplayApp = useCallback(
    debounce(() => {
      displayAppRef.current();
    }, 500),
    []
  );

  useEffect(() => {
    if (
      image.length > 0 &&
      showCanvasRef.current &&
      renderWidth > 0 &&
      renderHeight > 0 &&
      appWidth > 0 &&
      appHeight > 0
    ) {
      debouncedDisplayApp();
    }
  }, [
    appHeight,
    appWidth,
    debouncedDisplayApp,
    image.length,
    resizeWidth,
    resizeHeight,
    scaleValue,
    trigger,
  ]);

  useEffect(() => {
    if (link) {
      link.download = `${name}.${type}`;
    }
  }, [link, name, type]);

  const getImageDimensions = (base64: string) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.width, height: image.height });
      };
      image.onerror = (error) => {
        reject(error);
      };
      image.src = base64;
    });
  };

  useEffect(() => {}, [progress]);

  const exportContainer = useCallback(async () => {
    if (appRef.current && containerRef.current) {
      if (!rendererRef.current) {
        rendererRef.current = autoDetectRenderer({
          width: project.settings.canvasSettings.width,
          height: project.settings.canvasSettings.height,
          powerPreference: "high-performance",
          antialias: true,
          resolution: 1,
          background: 0xcdcdcd,
          backgroundColor: 0xcdcdcd,
        });
        setRenderWidth(project.settings.canvasSettings.width);
        setRenderHeight(project.settings.canvasSettings.height);
        setResizeWidth(project.settings.canvasSettings.width);
        setResizeHeight(project.settings.canvasSettings.height);
      }
      if (rendererRef.current && resizeWidth > 0 && resizeHeight > 0) {
        const previousPivot = containerRef.current.pivot.clone();

        // Set position to 0, 0
        containerRef.current.pivot.set(0, 0);
        containerRef.current.position.set(0, 0);
        containerRef.current.scale.set(1, 1);

        // Render the container

        rendererRef.current.render(containerRef.current);
        setProgress(1);

        // Extract the base64 image
        const base64 = await rendererRef.current.extract.base64();
        setProgress(2);
        const getResampled = async () => {
          //
          let resampled = "";
          if (type == "jpg") {
            resampled = await resizeImage(
              resizeWidth,
              resizeHeight,
              base64,
              samples,
              jpegQuality[0],
              "jpg"
            );
          } else if (type == "png") {
            resampled = await resizeImage(
              resizeWidth,
              resizeHeight,
              base64,
              samples,
              pngQuality[0],
              "png"
            );
          } else if (type == "webp") {
            resampled = await resizeImage(
              resizeWidth,
              resizeHeight,
              base64,
              samples,
              webpQuality[0],
              "webp"
            );
          }
          return resampled;
        };
        // getImageDimensions(base64)
        //   .then((dimensions: unknown) => {
        //     // Update the type of 'dimensions' to 'unknown'
        //
        //
        //   })
        //   .catch((error) => {
        //     console.error("Error:", error);
        //   });

        getResampled().then((resampled: string) => {
          setProgress(3);

          const new64 = `data:image/${type};base64,${resampled}`;
          const link = document.createElement("a");
          const binary = atob(new64.split(",")[1]);
          const sizeInBytes = binary.length;
          setSizeInBytes(sizeInBytes);
          link.href = new64;

          setLink(link);
          setImage(new64);

          if (
            spriteRef.current &&
            showContainerRef.current &&
            showAppRef.current
          ) {
            spriteRef.current.destroy();
            showContainerRef.current.removeChild(spriteRef.current);
            spriteRef.current = null;
            showContainerRef.current.destroy();
            showContainerRef.current = null;
          }
          if (containerRef.current) {
            containerRef.current.pivot.set(previousPivot.x, previousPivot.y);
            setTrigger(!trigger);
          }
        });
      }
    }
  }, [
    appRef,
    containerRef,
    resizeWidth,
    resizeHeight,
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
    type,
    samples,
    jpegQuality,
    pngQuality,
    webpQuality,
    setTrigger,
    trigger,
  ]);

  const renderRef = useRef(exportContainer);

  useEffect(() => {
    renderRef.current = exportContainer;
  }, [exportContainer]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedExportContainer = useCallback(
    debounce(() => {
      renderRef.current();
    }, 500),
    []
  );

  useEffect(() => {
    if (showExport) {
      debouncedExportContainer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showExport,
    samples,
    resizeWidth,
    resizeHeight,
    jpegQuality,
    pngQuality,
    webpQuality,
    type,
  ]);

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
      <Dialog open={showExport} modal={false}>
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
                  {/* <ZoomInIcon
                    className="w-8 h-8 bg-black opacity-80 "
                    onClick={() =>
                      setScaleValue(
                        clamp(scaleValue + 0.05, minScale, maxScale)
                      )
                    }
                  />

                  <ZoomOutIcon
                    className="w-8 h-8 bg-black opacity-80"
                    onClick={() =>
                      setScaleValue(
                        clamp(scaleValue - 0.05, minScale, maxScale)
                      )
                    }
                  /> */}

                  <ImageViewer image={image}></ImageViewer>
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

                <div className="">
                  <Label htmlFor="resample" className="text-right select-none">
                    Resample
                  </Label>
                  <Select
                    onValueChange={(value: sampleType) => setSamples(value)}
                    value={samples}
                  >
                    <SelectTrigger className="w-[180px] mt-1 dark:border-slate-400 focus-visible:ring-offset-0 focus-visible:ring-0 ring-0">
                      <SelectValue placeholder="Select a format" />
                    </SelectTrigger>
                    <SelectContent className="focus-visible:ring-offset-0 focus-visible:ring-0">
                      <SelectGroup className="focus-visible:ring-offset-0 focus-visible:ring-0">
                        <SelectLabel>Interpolation Method</SelectLabel>
                        <SelectItem
                          value="bicubic"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          Bicubic
                        </SelectItem>
                        <SelectItem
                          value="bilinear"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800 "
                        >
                          Bilinear
                        </SelectItem>
                        <SelectItem
                          value="lanczos4"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          Lanczos4
                        </SelectItem>
                        <SelectItem
                          value="area"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          Area
                        </SelectItem>
                        <SelectItem
                          value="spline"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          Cubic Spline
                        </SelectItem>
                        <SelectItem
                          value="mitchell"
                          className="hover:bg-slate-100 dark:hover:bg-gray-800"
                        >
                          Mitchell-Netravali
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="w-full">
                <Label htmlFor="quality" className="text-right select-none">
                  Quality
                </Label>
                {type === "jpg" && (
                  <Slider
                    value={jpegQuality}
                    step={1}
                    max={100}
                    min={0}
                    onValueChange={(value) => {
                      setJpegQuality(value);
                    }}
                  ></Slider>
                )}

                {type === "png" && (
                  <Slider
                    value={pngQuality}
                    step={1}
                    max={9}
                    min={0}
                    onValueChange={(value) => {
                      setPngQuality(value);
                    }}
                  ></Slider>
                )}

                {type === "webp" && (
                  <Slider
                    value={webpQuality}
                    step={1}
                    max={100}
                    min={0}
                    onValueChange={(value) => {
                      setWebpQuality(value);
                    }}
                  ></Slider>
                )}

                <Input
                  className=" dark:bg-[#333] dark:text-white dark:border-slate-400 mt-1  focus-visible:ring-offset-0 focus-visible:ring-1"
                  value={resizeWidth}
                  onChange={(e) => setResizeWidth(parseInt(e.target.value))}
                />
                <Input
                  className=" dark:bg-[#333] dark:text-white dark:border-slate-400 mt-1  focus-visible:ring-offset-0 focus-visible:ring-1"
                  value={resizeHeight}
                  onChange={(e) => setResizeHeight(parseInt(e.target.value))}
                />
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
