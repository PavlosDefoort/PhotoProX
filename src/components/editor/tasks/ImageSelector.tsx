import React, { useRef, useState } from "react";
import ImageInput from "../ui/components/input/ImageInput";
import { useProject } from "@/hooks/useProject";
import {
  isFilePickerCancellation,
  isSupportedImageFile,
  openDocumentWithPicker,
  supportsFileSystemAccess,
} from "@/utils/DocumentSave";
import { toast } from "sonner";

const ImageSelector: React.FC = () => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openImageFile, openProjectFile, setLoading } = useProject();

  const openDroppedFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    try {
      if (lowerName.endsWith(".zyn") || lowerName.endsWith(".json")) {
        await openProjectFile(file);
      } else if (isSupportedImageFile(file)) {
        setLoading(true);
        await openImageFile(file);
        setLoading(false);
      } else {
        toast.error("Choose a PNG, JPEG, WebP, or Zynalo project file.");
      }
    } catch (error) {
      setLoading(false);
      console.error("Failed to open dropped file", error);
      toast.error("The dropped file could not be opened.");
    }
  };

  const handleClick = async () => {
    if (!supportsFileSystemAccess()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const selected = await openDocumentWithPicker();
      if (!selected) return;
      const lowerName = selected.file.name.toLowerCase();
      if (lowerName.endsWith(".zyn") || lowerName.endsWith(".json")) {
        await openProjectFile(selected.file, selected.handle);
      } else if (isSupportedImageFile(selected.file)) {
        await openImageFile(selected.file, selected.handle);
      } else {
        toast.error("Choose a PNG, JPEG, WebP, or Zynalo project file.");
      }
    } catch (error) {
      if (!isFilePickerCancellation(error)) toast.error("The selected file could not be opened.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void openDroppedFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const itemType = e.dataTransfer.items[0]?.type ?? "";
    const isPotentiallySupported =
      e.dataTransfer.types.includes("Files") &&
      (itemType === "" ||
        itemType.startsWith("image/") ||
        itemType === "application/json" ||
        itemType === "application/vnd.zyn+json");
    e.dataTransfer.dropEffect = isPotentiallySupported ? "copy" : "none";
    setDragging(isPotentiallySupported);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void handleClick()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") void handleClick();
      }}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className={`flex flex-col items-center justify-center w-full h-64 border-2 border-black dark:border-gray-400 border-collapse rounded-lg cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-orange-500 bg-orange-100 shadow-[0_0_0_6px_rgba(249,115,22,0.35),0_0_32px_rgba(249,115,22,0.7)] dark:border-orange-400 dark:bg-orange-950/40"
          : "bg-[#fef2e7] hover:animate-jump hover:bg-[#feead8] dark:bg-[#171717] dark:hover:bg-[#242424]"
      }`}
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
          <span className="font-semibold">
            {dragging ? "Release to open" : "Click to upload"}
          </span>{" "}
          {dragging ? "your file" : "or drag and drop"}
        </p>
        <p className="text-xs text-black dark:text-gray-100 ">
          SVG, PNG, JPG, or WebP (MAX. 12MB)
        </p>
      </div>
      <ImageInput inputRef={fileInputRef} />
    </div>
  );
};
export default ImageSelector;
