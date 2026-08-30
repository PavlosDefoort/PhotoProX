import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProject";
import { useCallback } from "react";

interface ImageInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
}
const ImageInput: React.FC<ImageInputProps> = ({ inputRef }) => {
  const {
    setLoading,
    openImageFile,
    openProjectFile,
  } = useProject();

  const setPhoto = useCallback(
    async (file: File) => {
      await openImageFile(file);
      setLoading(false);
    },
    [openImageFile, setLoading],
  );

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    e.preventDefault();

    const selectedFile = e.target?.files?.[0] ?? e.dataTransfer?.files?.[0];
    if (!selectedFile) return;

    const lowerName = selectedFile.name.toLowerCase();
    if (lowerName.endsWith(".zyn") || lowerName.endsWith(".json")) {
      await openProjectFile(selectedFile);
      e.target.value = "";
      return;
    }

    if (
      (e.target.files?.length > 0 &&
        e.target.files[0].type.includes("image")) ||
      (e.dataTransfer?.files?.length > 0 &&
        e.dataTransfer.files[0].type.includes("image"))
    ) {
      // Import is deliberately lossless. Any performance proxy must remain a
      // separate representation and may never replace the original source.
      setLoading(true);
      await setPhoto(selectedFile);
    }
    e.target.value = "";
  };

  return (
    <input
      ref={inputRef}
      id="file-input"
      type="file"
      className="hidden"
      onChange={handleImageChange}
      accept=".png,.jpg,.jpeg,.webp,.zyn,.json,application/vnd.zyn+json,application/json"
    />
  );
};
export default ImageInput;
