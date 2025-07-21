import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProject";
import { ImageData } from "@/interfaces/project/SettingsInterfaces";
import { addLayer, getBackgroundLayer } from "@/models/project/LayerManager";
import { fitItemToContainer } from "@/utils/PixiUtils";
import imageCompression, { Options } from "browser-image-compression";
import { useCallback, useEffect, useState } from "react";

interface ImageInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
}
const ImageInput: React.FC<ImageInputProps> = ({ inputRef }) => {
  const { photoProXUser } = useAuth();
  const {
    setLoadingProgress,
    setLoading,
    setLoadingTask,
    setProject,
    setLanding,
    setTrigger,
    trigger,
    layerManager,
    setLayerManager,
  } = useProject();
  const [options, setOptions] = useState<Options | null>({
    maxSizeMB: 1,
    maxIteration: 10,
    useWebWorker: true,
    fileType: "image/jpeg",
    maxWidthOrHeight: 5000,
    alwaysKeepResolution: false,
  });

  const setPhoto = useCallback(
    async (file: File) => {
      const onImageSelect = async (
        selectedImage: string,
        realWit: number,
        realHit: number,
        imageData: ImageData
      ) => {
        if (typeof selectedImage === "string") {
          // Check if a background layer already exists
          if (getBackgroundLayer(layerManager.layers) === undefined) {
            const newBackground = layerManager.createBackgroundLayer(
              false,
              "#ffffff",
              realWit,
              realHit,
              1
            );
            setLayerManager((draft) => {
              draft.layers = addLayer(draft.layers, newBackground);
            });
          }

          try {
            const newLayer = await layerManager.createImageLayer(
              realWit,
              realHit,
              imageData
            );
            fitItemToContainer(newLayer.sprite, null, realWit, realHit);
            setLayerManager((draft) => {
              draft.layers = addLayer(draft.layers, newLayer);
              draft.target = newLayer.id;
            });

            setProject((draft) => {
              if (
                draft.settings.canvasSettings.width === 1 &&
                draft.settings.canvasSettings.height === 1
              ) {
                draft.settings.canvasSettings.width = realWit;
                draft.settings.canvasSettings.height = realHit;
              }
            });
          } catch (error) {
            alert("Error: " + error);
          }
        }
        // Upload the file to the database
        setLoading(false);
        setLanding(true);
        // uploadLayer(file, project.id, user?.uid!);
        setTrigger(!trigger);
      };
      const target = file;
      const reader = new FileReader();
      let result: string | ArrayBuffer | null;

      reader.addEventListener("load", () => {
        const image = new Image();
        image.addEventListener("load", () => {
          const { naturalWidth, naturalHeight } = image;
          result = reader.result;

          if (typeof result === "string") {
            const imageData: ImageData = {
              name: target.name,
              src: result,
              imageHeight: naturalHeight,
              imageWidth: naturalWidth,
            };

            onImageSelect(result, naturalWidth, naturalHeight, imageData);
          }
        });

        if (reader.result) {
          image.src = reader.result as string;
        }
      });

      reader.readAsDataURL(target);
    },
    [
      layerManager,
      setLanding,
      setLayerManager,
      setLoading,
      setProject,
      setTrigger,
      trigger,
    ]
  );

  useEffect(() => {
    if (!photoProXUser) return;
    function onProgress(progress: number) {
      setLoadingProgress(progress);
    }
    // Set the options for the image compression
    const { compression } = photoProXUser.settings.performance;
    setOptions({
      maxSizeMB: compression.maxSizeMB,
      maxIteration: compression.maxIterations,
      fileType: `image/${compression.fileFormat}`,
      alwaysKeepResolution: compression.alwaysKeepResolution,
      useWebWorker: true,
      maxWidthOrHeight: compression.alwaysKeepResolution
        ? undefined
        : compression.maxDimension,
      onProgress: onProgress,
    });
  }, [photoProXUser, setLoadingProgress]);

  async function compressAndSetPhoto(imageFile: File) {
    if (photoProXUser?.settings.performance.useCompression && options) {
      try {
        const compressedFile = await imageCompression(imageFile, options);
        console.log(compressedFile, photoProXUser);
        await setPhoto(compressedFile); // write your own logic
      } catch (error) {
        // (error);
      }
    } else {
      console.log("No compression");
      await setPhoto(imageFile); // Load the image without compression
    }
  }

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement> | any
  ) => {
    e.preventDefault();

    if (
      (e.target.files?.length > 0 &&
        e.target.files[0].type.includes("image")) ||
      (e.dataTransfer?.files?.length > 0 &&
        e.dataTransfer.files[0].type.includes("image"))
    ) {
      const imageFile = e.target?.files?.[0] ?? e.dataTransfer?.files?.[0];

      if (!imageFile) return;

      if (photoProXUser?.settings.performance.useCompression && options) {
        setLoadingTask("compressing");
        setLoading(true);

        await compressAndSetPhoto(imageFile);
      } else {
        setLoading(true);
        await setPhoto(imageFile);
      }
    }
  };

  return (
    <input
      ref={inputRef}
      id="file-input"
      type="file"
      className="hidden"
      onChange={handleImageChange}
      accept=".png,.jpg,.jpeg,.gif,.svg"
    />
  );
};
export default ImageInput;
