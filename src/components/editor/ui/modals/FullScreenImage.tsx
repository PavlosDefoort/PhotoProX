import { EnterFullScreenIcon } from "@radix-ui/react-icons";
import React, { useRef, useEffect } from "react";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";

interface ImageViewerProps {
  image: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ image }) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.src = image; // Update the src attribute
    }
  }, [image]);

  useEffect(() => {
    if (!viewerRef.current && imageRef.current) {
      viewerRef.current = new Viewer(imageRef.current, {
        // Add any Viewer.js options here
        zIndex: 9999,
        inline: false, // Display the viewer in a modal
      });
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  const handleImageClick = () => {
    if (viewerRef.current) {
      viewerRef.current.show();
    }
  };

  return (
    <div className="z-50">
      <EnterFullScreenIcon
        className="w-8 h-8 bg-black opacity-80 cursor-pointer"
        onClick={() => handleImageClick()}
      ></EnterFullScreenIcon>
      <img ref={imageRef} src={image} className="hidden" />
    </div>
  );
};

export default ImageViewer;
