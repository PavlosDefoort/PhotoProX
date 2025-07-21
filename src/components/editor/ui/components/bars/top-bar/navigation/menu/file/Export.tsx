import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import cv from "@techstark/opencv-js";
import React, { useEffect, useMemo, useRef, useState } from "react";

import NumberInput from "@/components/editor/ui/components/input/NumberInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { exportProjectImage } from "@/utils/PixiUtils";
import { Link1Icon, LinkBreak1Icon } from "@radix-ui/react-icons";
import { debounce } from "lodash";
import { toast } from "sonner";
import MiniApplication from "../../project-dropdown/components/MiniApplication";
import { ExportInfo } from "./ExportTable";
import { KernelEnum } from "sharp";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { Application, Renderer } from "pixi.js";

interface ExportProps {
  imageType: string;
  setImageType: React.Dispatch<React.SetStateAction<string>>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  allLayers: boolean;
  openTrigger: boolean;
  setOpenTrigger: React.Dispatch<React.SetStateAction<boolean>>;
}

const Export: React.FC<ExportProps> = ({
  imageType,
  setImageType,
  triggerRef,
  allLayers,
  openTrigger,
  setOpenTrigger,
}) => {
  const { project, layerManager } = useProject();
  const { app, container } = useCanvas();
  const [exportData, setExportData] = useState<ExportInfo[]>([]);
  const [renderWidth, setRenderWidth] = React.useState<number>(
    project.settings.canvasSettings.width
  );
  const [renderHeight, setRenderHeight] = React.useState<number>(
    project.settings.canvasSettings.height
  );
  const [resizeWidth, setResizeWidth] = React.useState<number>(
    project.settings.canvasSettings.width
  );
  const [resizeHeight, setResizeHeight] = React.useState<number>(
    project.settings.canvasSettings.height
  );
  const [samples, setSamples] = React.useState<keyof KernelEnum>("lanczos3");
  const [isRatio, setIsRatio] = React.useState(true);
  const isRendering = useRef(false);
  const [loading, setLoading] = useState(false);
  const [exportSrc, setExportSrc] = useState<string>("");
  const [originalSrc, setOriginalSrc] = useState<string>("");
  const [jpegQuality, setJpegQuality] = useState(100);
  const [webpQuality, setWebpQuality] = useState(100);
  const [pngCompression, setPngCompression] = useState(6);
  const [pngQuality, setPngQuality] = useState(100);
  const [isPalette, setIsPalette] = useState(true);
  const [fileName, setFileName] = useState<string>(project.settings.name);
  const [jpegViewValue, setJpegViewValue] = useState<number>(100);

  const getBase64SizeInBytes = (base64String: string): number => {
    // Remove the data URL prefix if it exists
    const base64Data = base64String.replace(/^data:[a-zA-Z0-9+/=]+,/, "");

    // Calculate the size of the Base64 string in bytes
    const padding = base64Data.endsWith("==")
      ? 2
      : base64Data.endsWith("=")
      ? 1
      : 0;
    const sizeInBytes = (base64Data.length * 3) / 4 - padding;

    // Round to the nearest byte
    return Math.round(sizeInBytes);
  };

  useEffect(() => {
    setRenderWidth(project.settings.canvasSettings.width);
    setRenderHeight(project.settings.canvasSettings.height);
    setResizeWidth(project.settings.canvasSettings.width);
    setResizeHeight(project.settings.canvasSettings.height);
  }, [
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
  ]);

  const debouncedCreateOriginalSrc = useMemo(
    () =>
      debounce(
        async (
          app: React.MutableRefObject<Application<Renderer> | null>,
          container: ContainerX | null,
          openTrigger: boolean
        ) => {
          if (!app.current || !container || !openTrigger) return;

          const base64 = await exportProjectImage(
            app.current,
            container,
            "jpeg" as "png" | "jpg" | "webp"
          );

          // const imageLayer = await layerManager.createImageLayer(
          //   project.settings.canvasSettings.width,
          //   project.settings.canvasSettings.height,
          //   {
          //     name: "Export",
          //     src: base64,
          //     imageHeight: project.settings.canvasSettings.height,
          //     imageWidth: project.settings.canvasSettings.width,
          //   }
          // );
          setOriginalSrc(base64);
          setLoading(false);
        },
        100
      ),
    []
  );

  useEffect(() => {
    // const data: ExportInfo = {
    //   name: project.settings.name,
    //   type: imageType as "png" | "jpeg" | "webp",
    //   resolution: [
    //     exportRef.current.sprite.width,
    //     exportRef.current.sprite.height,
    //   ],
    //   size: getBase64SizeInBytes(base64),
    //   id: "1",
    //   src: exportRef.current.imageData.src,
    //   status: "pending",
    // };
    // setExportData([data]);

    setLoading(true);
    debouncedCreateOriginalSrc(app, container, openTrigger);

    return () => {
      // setOpenTrigger(false);
    };
  }, [app, container, debouncedCreateOriginalSrc, openTrigger]);

  const confirmExport = async () => {
    if (!exportSrc) return;

    setLoading(true);
    try {
      // Create a blob from the base64 data URL
      const response = await fetch(exportSrc);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Create a link element and click it to start the download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${project.settings.name}.${imageType}`;
      link.click();

      // Revoke the blob URL after the download starts
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        toast.success(
          "Export initiated successfully. Please check your downloads folder."
        );
        setLoading(false);
      }, 1000); // Adjust the timeout as needed
    } catch (error) {
      console.error("Failed to initiate download:", error);
      toast.error("Failed to initiate export.");
      setLoading(false);
    }
  };

  const throttledResample = useMemo(
    () =>
      debounce(
        (
          src: string,
          width: number,
          height: number,
          format: string = "jpeg",
          resampler: keyof KernelEnum,
          quality: number = 100,
          palette: boolean = false,
          compression: number = 6
        ): Promise<string> => {
          return new Promise(async (resolve, reject) => {
            try {
              setLoading(true);
              // const srcMat = cv.imread(image);
              // const dst = new cv.Mat();
              // const newSize = new cv.Size(width, height);
              // const determineResampler = (resampler: SampleType) => {
              //   const resamplerMap: { [key in SampleType]: number } = {
              //     spline: cv.INTER_CUBIC,
              //     lanczos4: cv.INTER_LANCZOS4,
              //     area: cv.INTER_AREA,
              //     bicubic: cv.INTER_CUBIC,
              //     bilinear: cv.INTER_LINEAR,
              //     mitchell: cv.INTER_LANCZOS4,
              //     nearest: cv.INTER_NEAREST,
              //   };

              //   return resamplerMap[resampler] ?? cv.INTER_CUBIC;
              // };
              // const method = determineResampler(resampler);

              // cv.resize(srcMat, dst, newSize, 0, 0, method); // Resize the image

              // const canvas = document.createElement("canvas");
              // canvas.width = newSize.width;
              // canvas.height = newSize.height;
              // cv.imshow(canvas, dst);
              // const resizedImage = canvas.toDataURL("image/" + format);
              const sendImage = async (base64Image: string) => {
                try {
                  // Remove the base64 data URL prefix if present
                  const base64Data = base64Image.replace(
                    /^data:image\/[a-zA-Z]+;base64,/,
                    ""
                  );
                  // Send the buffer in a JSON payload
                  console.log("Attempting to send image");
                  const response = await fetch("/api/sharp", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      buffer: base64Data,
                      format: format,
                      quality: quality,
                      palette: palette,
                      compression: compression,
                      width: Math.round(width),
                      height: Math.round(height),
                      resampler: resampler,
                    }), // Send the base64 string, not the buffer
                  });
                  console.log("Response:", response);

                  if (!response.ok) {
                    setLoading(false);
                    throw new Error("Failed to process image");
                  }

                  const data = await response.json();
                  // Set the new base64 image, though we need to add the data URL prefix
                  const newBase64 = `data:image/${format};base64,${data.base64}`;
                  return newBase64;
                } catch (error) {
                  console.error("Error sending image:", error);
                }
              };
              const response = await sendImage(src);
              if (!response) {
                throw new Error("Failed to process image");
              }
              setExportSrc(response);

              // const exportData: ExportInfo = {
              //   id: "1",
              //   name: project.settings.name,
              //   type: format as "png" | "jpeg" | "webp",
              //   src: resizedImage,
              //   size: getBase64SizeInBytes(resizedImage),
              //   resolution: [width, height],
              //   status: "pending",
              // };

              // setExportData([exportData]);

              // srcMat.delete();
              // dst.delete();
              setLoading(false);
              resolve(response);
            } catch (error) {
              reject(error);
            }
          });
        },
        100
      ),
    []
  );

  const handleChangeHeight = (newHeight: number) => {
    if (isRatio) {
      // ratio = width / height
      const aspectRatio = renderWidth / renderHeight;
      // width = height * ratio
      const newWidth = newHeight * aspectRatio;
      const rounded = roundToDecimalPlaces(newHeight * aspectRatio, 0);
      setRenderWidth(newWidth);
      setRenderHeight(newHeight);
      setResizeWidth(rounded);
    } else {
      setRenderHeight(newHeight);
    }
  };

  const handleChangeWidth = (newWidth: number) => {
    if (isRatio) {
      // ratio = width / height
      const aspectRatio = renderWidth / renderHeight;
      // height = width / ratio
      const newHeight = newWidth / aspectRatio;
      const rounded = roundToDecimalPlaces(newWidth / aspectRatio, 0);
      setRenderWidth(newWidth);
      setRenderHeight(newHeight);
      setResizeHeight(rounded);
    } else {
      setRenderWidth(newWidth);
    }
  };

  useEffect(() => {
    if (originalSrc) {
      if (imageType === "jpeg") {
        throttledResample(
          originalSrc,
          renderWidth,
          renderHeight,
          imageType,
          samples,
          jpegQuality
        );
      } else if (imageType === "webp") {
        throttledResample(
          originalSrc,
          renderWidth,
          renderHeight,
          imageType,
          samples,
          webpQuality
        );
      } else if (imageType === "png") {
        throttledResample(
          originalSrc,
          renderWidth,
          renderHeight,
          imageType,
          samples,
          pngQuality,
          isPalette,
          pngCompression
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageType,
    renderHeight,
    renderWidth,
    samples,
    throttledResample,
    jpegQuality,
    webpQuality,
    pngCompression,
    isPalette,
    pngQuality,
    originalSrc,
  ]);

  return (
    <Dialog
      open={openTrigger}
      onOpenChange={(e) => {
        if (!e.valueOf()) {
          setOpenTrigger(false);
        }
      }}
    >
      <DialogContent className=" max-w-6xl h-[700px]   text-black dark:text-white">
        <DialogHeader className="select-none">
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Export your project as a PNG, JPEG, or WebP image.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full h-96 flex flex-row space-x-4 items-center justify-center">
          {/* <div className="w-1/4 flex flex-col h-full ">
            <ExportTable data={exportData} />
          </div> */}
          <div className="relative w-2/3 h-full">
            <MiniApplication
              src={exportSrc}
              width={renderWidth}
              height={renderHeight}
              mode="export"
            />
            <div className="absolute bottom-1 right-2 bg-black flex flex-row space-x-3 text-sm">
              <p className="text-white">
                {
                  // Convert to KB if size is greater than 1KB and less than 1MB
                  // Convert to MB if size is greater than 1MB and less than 1GB

                  getBase64SizeInBytes(exportSrc) > 1000 &&
                  getBase64SizeInBytes(exportSrc) < 1000000
                    ? (getBase64SizeInBytes(exportSrc) / 1000).toFixed(2) +
                      " KB"
                    : getBase64SizeInBytes(exportSrc) > 1000000
                    ? (getBase64SizeInBytes(exportSrc) / 1000000).toFixed(2) +
                      " MB"
                    : getBase64SizeInBytes(exportSrc) + " B"
                }
              </p>
              <p className="text-gray-400">
                {getBase64SizeInBytes(exportSrc).toLocaleString()} B
              </p>
            </div>
            {/* <canvas
              ref={canvasRef}
              className="w-full flex justify-center items-center dark:bg-white bg-[#1a1a1a] border-2 border-white"
            /> */}
          </div>
          <div className="w-1/3 h-full flex flex-col space-y-2 ">
            <div className="flex flex-col space-y-1">
              <p>File Settings</p>
              <div className="flex flex-col items-start ml-2 space-y-4 ">
                <div className="flex flex-row items-center space-x-4">
                  <Label className="w-20">Format:</Label>
                  <FormatSelect
                    imageType={imageType}
                    setImageType={setImageType}
                    disable={loading}
                  />
                </div>
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-row items-center space-x-4">
                    <Label className="w-20">
                      {imageType !== "png" ? "Quality:" : "Compress:"}
                    </Label>
                    {imageType === "jpeg" && (
                      <NumberInput
                        value={jpegViewValue}
                        setValue={setJpegViewValue}
                        disable={loading}
                        max={100}
                        min={1}
                        numPlaces={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setJpegQuality(jpegViewValue);
                          }
                        }}
                      />
                    )}
                  </div>
                  {imageType === "jpeg" && (
                    <Slider
                      min={1}
                      max={100}
                      className="w-[180px]"
                      value={[jpegViewValue]}
                      onValueChange={(e) => {
                        setJpegViewValue(e[0]);
                      }}
                      onValueCommit={(e) => {
                        setJpegViewValue(e[0]);
                        setJpegQuality(e[0]);
                      }}
                      disabled={loading}
                    />
                  )}

                  {imageType === "webp" && (
                    <Slider
                      min={1}
                      max={100}
                      className="w-[180px]"
                      value={[webpQuality]}
                      onValueChange={(e) => {
                        setWebpQuality(e[0]);
                      }}
                      disabled={loading}
                    />
                  )}

                  {imageType === "png" && (
                    <Slider
                      min={0}
                      max={9}
                      className="w-[180px]"
                      value={[pngCompression]}
                      onValueChange={(e) => {
                        setPngCompression(e[0]);
                      }}
                      disabled={loading}
                    />
                  )}
                </div>

                {imageType === "png" && (
                  <div className="flex flex-col space-y-3">
                    <div className="flex flex-row space-x-4">
                      <Checkbox
                        checked={isPalette}
                        onCheckedChange={(e) =>
                          setIsPalette(e.valueOf() as boolean)
                        }
                        disabled={loading}
                      />
                      <Label className="w-24">Use palletes</Label>
                    </div>
                    {isPalette && (
                      <div className="flex flex-row items-center space-x-4">
                        <Label className="w-20">Quality:</Label>
                        <Slider
                          min={0}
                          max={100}
                          className="w-[180px]"
                          value={[pngQuality]}
                          onValueChange={(e) => {
                            setPngQuality(e[0]);
                          }}
                          disabled={loading}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <SelectSeparator />

            <div className="flex flex-col space-y-1">
              <p>Image Size</p>
              <div className="flex flex-row items-center space-x-2">
                <div className="flex flex-col items-start ml-2 space-y-2">
                  <div className="flex flex-row items-center space-x-4">
                    <Label className="w-20" htmlFor="resize-width">
                      Width:
                    </Label>
                    <NumberInput
                      setValue={setResizeWidth}
                      disable={loading}
                      value={resizeWidth}
                      max={10000}
                      min={1}
                      numPlaces={0}
                      onBlur={() => {
                        if (originalSrc && resizeWidth !== renderWidth) {
                          handleChangeWidth(resizeWidth);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (originalSrc && resizeWidth !== renderWidth) {
                            handleChangeWidth(resizeWidth);
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-row items-center space-x-4">
                    <Label className="w-20" htmlFor="resize-height">
                      Height:
                    </Label>

                    <NumberInput
                      setValue={setResizeHeight}
                      disable={loading}
                      value={resizeHeight}
                      max={10000}
                      min={1}
                      numPlaces={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (originalSrc && resizeHeight !== renderHeight) {
                            handleChangeHeight(resizeHeight);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (originalSrc && resizeHeight !== renderHeight) {
                          handleChangeHeight(resizeHeight);
                        }
                      }}
                    />
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        disabled={loading}
                        className="w-12 "
                        onClick={() => setIsRatio(!isRatio)}
                      >
                        {isRatio ? <Link1Icon /> : <LinkBreak1Icon />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isRatio ? "Maintain aspect ratio" : "Free aspect ratio"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-row items-center space-x-4">
                <Label className="w-20">Resampler:</Label>
                <ResamplerSelect
                  setResampler={setSamples}
                  resampler={samples}
                  disable={loading}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>

          <Button
            disabled={loading}
            onClick={() => {
              setRenderWidth(project.settings.canvasSettings.width);
              setRenderHeight(project.settings.canvasSettings.height);
              setResizeWidth(project.settings.canvasSettings.width);
              setResizeHeight(project.settings.canvasSettings.height);
              setIsRatio(true);
            }}
          >
            Reset
          </Button>

          <Button
            disabled={loading}
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              if (exportSrc) {
                confirmExport();
              }
            }}
          >
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Export;

interface FormatSelectProps {
  setImageType: React.Dispatch<React.SetStateAction<string>>;
  imageType: string;
  disable: boolean;
}
const FormatSelect: React.FC<FormatSelectProps> = ({
  setImageType,
  imageType,
  disable,
}) => {
  return (
    <Select
      disabled={disable}
      value={imageType}
      onValueChange={(e) => {
        setImageType(e.valueOf() as string);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Format" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Format</SelectLabel>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="jpeg">JPEG</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

interface ResamplerSelectProps {
  setResampler: (resampler: keyof KernelEnum) => void;
  resampler: keyof KernelEnum;
  disable: boolean;
}
const ResamplerSelect: React.FC<ResamplerSelectProps> = ({
  setResampler,
  resampler,
  disable,
}) => {
  return (
    <Select
      disabled={disable}
      value={resampler}
      onValueChange={(e) => {
        setResampler(e.valueOf() as keyof KernelEnum);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Resampler" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Resampler</SelectLabel>
          {/* <SelectItem value="spline">Spline</SelectItem> */}
          <SelectItem value="lanczos3">Lanczos3</SelectItem>
          <SelectItem value="lanczos2">Lanczos2</SelectItem>
          <SelectItem value="mitchell">Mitchell</SelectItem>
          <SelectItem value="cubic">Cubic Spline</SelectItem>
          <SelectItem value="linear">Linear</SelectItem>
          {/* <SelectItem value="area">Area</SelectItem> */}
          <SelectItem value="nearest">Nearest</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
