import React, { HtmlHTMLAttributes, use, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { useState, useCallback } from "react";
import { Slider } from "@mui/material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { SelectChangeEvent } from "@mui/material";
import configurationsObject from "./configurations.json";
import { set } from "lodash";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import NextImage from "next/image";

type ImageSelectHandler = (
  selectedImage: HTMLImageElement | string | ArrayBuffer | null,
  natWidth: number,
  natHeight: number,
  realWit: number,
  realHit: number,
  fileName: string
) => void;

interface ImageSelectorProps {
  onImageSelect: ImageSelectHandler;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ onImageSelect }) => {
  const [progressValue, setProgress] = useState(0);
  const [progressString, setProgressString] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [maxConfiguredSize, setMaxConfiguredSize] = useState(2);
  const [currentConfig, setCurrentConfig] = useState("godquality");
  const [scaleOption, setScaleOption] = useState("all");
  const [compressImage, setCompressImage] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCompressImage(false);
  };

  const agreeCompression = () => {
    setOpen(false);
    setCompressImage(true);
  };

  interface Configurations {
    [key: string]: {
      maxSizeMB: number;
      maxWidthOrHeight: number;
      useWebWorker: boolean;
      fileType: string;
      onProgress?: (progress: number) => void;
      // Other propertiess
    };
  }

  const setPhoto = useCallback(
    async (file: File) => {
      // Your setPhoto logic
      const target = file;
      const reader = new FileReader();
      let result: string | ArrayBuffer | null;

      reader.addEventListener("load", () => {
        const image = new Image();
        image.addEventListener("load", () => {
          console.log("Loading Image");
          const { naturalWidth, naturalHeight } = image;
          result = reader.result;

          // Calculate the ratio of the image to the screen
          const widthRatio = (screen.width - 210) / naturalWidth;
          const heightRatio = (screen.height - 210) / naturalHeight;

          // Use whichever ratio is smaller to ensure that the image fits on the screen
          const factor = Math.min(widthRatio, heightRatio);
          const widthScalar = naturalWidth * factor;
          const heightScalar = naturalHeight * factor;
          // Pass the image source and its dimensions to the onImageSelect function
          onImageSelect(
            result,
            widthScalar,
            heightScalar,
            naturalWidth,
            naturalHeight,
            target.name
          );
        });

        if (reader.result) {
          image.src = reader.result as string;
        }
      });

      reader.readAsDataURL(target);
    },
    [onImageSelect]
  );

  const configurations: Configurations = configurationsObject;
  console.log(configurations);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  useEffect(() => {
    async function compressAndSetPhoto(imageFile: File) {
      if (compressImage) {
        console.log("Compressing Image");
        let options: {
          maxSizeMB?: number;
          maxWidthOrHeight?: number;
          useWebWorker?: boolean;
          fileType?: string;
          onProgress?: (progress: number) => void;
        } = {};

        if (currentConfig === "custom") {
          options = {
            maxSizeMB: maxConfiguredSize,
            maxWidthOrHeight: 3840,
            useWebWorker: true,
            fileType: "image/png",
          };
        } else {
          options = configurations[currentConfig];
        }
        options.onProgress = (progress: number) => {
          onProgress(progress);
        };

        try {
          const compressedFile = await imageCompression(imageFile, options);
          console.log(
            "compressedFile instanceof Blob",
            compressedFile instanceof Blob
          ); // true
          console.log(
            `compressedFile size ${compressedFile.size / 1024 / 1024} MB`
          ); // smaller than maxSizeMB
          console.log(compressedFile);
          await setPhoto(compressedFile); // write your own logic
        } catch (error) {
          console.log(error);
        }
      } else {
        console.log("No Compression");
        console.log(imageFile.size / 1024 / 1024);
        await setPhoto(imageFile); // Load the image without compression
      }
    }
    if (!open) {
      if (currentPhoto && compressImage) {
        console.log("Compressing Image");
        compressAndSetPhoto(currentPhoto);
      } else if (currentPhoto && !compressImage) {
        console.log("No Compression");
        setPhoto(currentPhoto);
      }
    }
  }, [
    currentPhoto,
    compressImage,
    currentConfig,
    maxConfiguredSize,
    scaleOption,
    setPhoto,
    configurations,
    open,
  ]);

  function onProgress(progress: number) {
    setProgress(progress);
    if (progress >= 0 && progress < 5) {
      setProgressString("Initializing Compression Process...");
    } else if (progress >= 5 && progress < 15) {
      setProgressString("Analyzing Image...");
    } else if (progress >= 15 && progress < 30) {
      setProgressString("Finding Optimal Resolution...");
    } else if (progress >= 30 && progress < 100) {
      setProgressString("Compressing Image Size...");
      setProgress(progress);
    } else if (progress === 100) {
      console.log("Done!");
      setProgressString("Done!");
      setProgress(100);
    }
  }

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    e.preventDefault();

    if (
      (e.target.files && e.target.files.length > 0) ||
      (e.dataTransfer.files && e.dataTransfer.files.length > 0)
    ) {
      console.log("Loading Image");
      setLoadingImage(true);

      const imageFile = e.target?.files?.[0] ?? e.dataTransfer?.files?.[0];
      console.log("originalFile instanceof Blob", imageFile instanceof Blob); // true
      console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

      if (imageFile.size / 1024 / 1024 > 5) {
        console.log("Image is larger than 5MB");
        setCompressImage(true);
        setOpen(true);
      } else {
        setCompressImage(false);
      }
      setCurrentPhoto(imageFile);
    }
  };

  const handleConfigChanged = (e: SelectChangeEvent<string>) => {
    setCurrentConfig(e.target.value);
  };

  const handleScaleChanged = (e: SelectChangeEvent<string>) => {
    setScaleOption(e.target.value);
  };

  return (
    <div
      className="flex items-center justify-center w-64 z-10"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {loadingImage ? (
        <div>
          {" "}
          <div className="flex justify-between mb-2">
            <span className="text-base  text-white font-bold dark:text-white">
              {progressString}
            </span>
            <span className="text-sm font-bold text-white dark:text-white">
              {progressValue}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progressValue}%` }}
            ></div>
          </div>
          {currentPhoto && (
            <Dialog
              open={open}
              onClose={handleClose}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">
                {"Compress Image?"}
              </DialogTitle>
              <DialogContent className="flex flex-col justify-center items-center overflow-visible">
                <DialogContentText id="alert-dialog-description">
                  This image ({(currentPhoto.size / 1024 / 1024).toFixed(2)}MB)
                  is larger than 5MB, which may cause some performance issues.
                  Would you like to compress it?
                </DialogContentText>

                <NextImage
                  className="pt-2"
                  alt="Chosen image"
                  src={URL.createObjectURL(currentPhoto)}
                  width={300} // Set the desired width here
                  height={100} // Set the desired height here
                ></NextImage>
              </DialogContent>
              <DialogActions className="flex flex-row justify-center items-center">
                <Button onClick={handleClose}>Do not compress</Button>
                <Button onClick={agreeCompression} autoFocus>
                  Compress
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleImageChange}
          className=""
        >
          <label
            htmlFor="dropzone-file"
            className="hover:animate-jump flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-[#666666] dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-[#7c7c7c] dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          >
            <div className="w-96 flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                aria-hidden="true"
                className="w-10 h-10 mb-3 text-gray-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <p className="mb-2 text-sm text-gray-100 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-100 dark:text-gray-400">
                SVG, PNG, JPG or GIF (MAX. 5MB)
              </p>
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              onChange={handleImageChange}
              accept=".png,.jpg,.jpeg,.gif,.svg"
            />
          </label>
          <div className="pt-8">
            <div className="bg-white flex justify-center items-center ">
              {/* <Select value={currentConfig} onChange={handleConfigChanged}>
                <MenuItem value={"potato"}>Very Low Quality</MenuItem>
                <MenuItem value={"lowquality"}>Low-Quality</MenuItem>
                <MenuItem value={"performance"}>HD Quality</MenuItem>
                <MenuItem value={"highquality"}>FHD Quality</MenuItem>
                <MenuItem value={"ultraquality"}>QHD Quality</MenuItem>
                <MenuItem value={"maxquality"}>UHD Quality</MenuItem>
                <MenuItem value={"godquality"}>UHD-2 Quality</MenuItem>
                <MenuItem value={"custom"}>Custom</MenuItem>
              </Select>
              <Select value={scaleOption} onChange={handleScaleChanged}>
                <MenuItem value={"none"}>Do not Scale</MenuItem>
                <MenuItem value={"some"}>Scale if too big</MenuItem> 
                <MenuItem value={"all"}>Scale Anyways</MenuItem>
              </Select> */}
              {/*  
            <Slider
              defaultValue={2}
              aria-label="Default"
              valueLabelDisplay="auto"
              min={0.1}
              max={100}
              step={0.1}
              onChange={handlemaxConfiguredSizeChange}
            ></Slider>*/}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ImageSelector;
