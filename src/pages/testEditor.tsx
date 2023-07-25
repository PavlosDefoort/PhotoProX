import React, { useEffect, useRef, useState } from "react";
import { Application, Sprite, BlurFilter } from "pixi.js";

const ImageEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const appRef = useRef<Application | null>(null); // Ref to hold the PixiJS Application instance
  const [zoomValue, setZoomValue] = useState(1); // State to hold the zoom value

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!appRef.current) {
      // If the app doesn't exist, create it
      appRef.current = new Application({
        view: canvasRef.current,
        width: 2800,
        height: 1400,
        antialias: true,
        preserveDrawingBuffer: true,
      });
    }

    const app = appRef.current; // Use the existing app instance

    if (imagePath) {
      const imageWidth = 6000;
      const imageHeight = 3780;
      app.stage.removeChildren();
      const blurFilter = new BlurFilter();
      // Load image with PIXI

      const canvasWidth = 2800;
      const canvasHeight = 1400;

      const scaleFactor = Math.min(
        app.screen.width / imageWidth,
        app.screen.height / imageHeight
      );

      // Calculate the new dimensions of the image
      const newWidth = imageWidth * scaleFactor;
      const newHeight = imageHeight * scaleFactor;

      // Calculate the coordinates to position the image at the center of the canvas
      const imageX = (canvasWidth - newWidth) / 2;
      const imageY = (canvasHeight - newHeight) / 2;

      const image = Sprite.from(imagePath);

      image.filterArea = app.screen;
      // Calculate the scale factor

      console.log(canvasRef.current);
      image.width = imageWidth * scaleFactor;
      image.height = imageHeight * scaleFactor;
      image.roundPixels = true;

      image.scale.set(scaleFactor);
      image.position.set(imageX, imageY);

      app.stage.addChild(image);
    }

    app.start(); // Start the app

    return () => {
      // The cleanup function will be called when the component unmounts
      // No need to destroy the app here, as we want to reuse it if the component mounts again
    };
  }, [imagePath, zoomValue]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setImagePath(imageURL);
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="fixed bottom-0 z-10 w-full bg-[#3b3b3b]  dark:bg-gray-800 dark:border-gray-700 border-t border-gray-500">
        <div className="px-3 py-6 lg:px-5 lg:pl-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <div className=" ">
                {/* <span className=" text-white text-lg font-semibold sm:text-sm whitespace-nowrap dark:text-white">
                  Workspace: {fileName}
                </span> */}
                <div className="flex justify-center"></div>
              </div>
            </div>
            <div className="flex items-center justify-center w-full">Hello</div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default ImageEditor;
