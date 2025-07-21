import React, { useRef, useState } from "react";
import ImageInput from "../ui/components/input/ImageInput";

const ImageSelector: React.FC = () => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    // Check if dropped file is an image
    if (
      e.dataTransfer.types.includes("Files") &&
      e.dataTransfer.items[0].type.includes("image")
    ) {
      // Handle the dropped image file
      // handleImageChange(e);
    }
    setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    ("dragging");
    e.preventDefault();
    // Check if file and is image
    if (
      e.dataTransfer.types.includes("Files") &&
      e.dataTransfer.items[0].type.includes("image")
    ) {
      setDragging(true);
    }
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  return (
    <label
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      htmlFor="dropzone-file"
      className="hover:animate-jump flex flex-col items-center justify-center w-full h-64 border-2 border-black  dark:border-gray-400 border-collapse rounded-lg cursor-pointer bg-[#fef2e7] dark:bg-[#3e3e3e]  hover:bg-[#feead8] dark:hover:bg-[#7c7c7c] "
    >
      <div className="w-96 flex flex-col items-center justify-center pt-5 pb-6">
        <svg
          aria-hidden="true"
          className="w-10 h-10 mb-3 text-black dark:text-gray-100"
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
        <p className="mb-2 text-sm text-black dark:text-gray-100 ">
          <span className="font-semibold">Click to upload</span> or drag and
          drop
        </p>
        <p className="text-xs text-black dark:text-gray-100 ">
          SVG, PNG, JPG, or WebP (MAX. 12MB)
        </p>
      </div>
      <ImageInput inputRef={fileInputRef} />
    </label>
  );
};
export default ImageSelector;
