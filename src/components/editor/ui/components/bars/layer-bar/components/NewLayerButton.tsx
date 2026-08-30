import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BoxIcon,
  CardStackPlusIcon,
  ComponentBooleanIcon,
  ImageIcon,
  TextIcon,
} from "@radix-ui/react-icons";
import { Folder } from "@mui/icons-material";
import { HexagonIcon } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { addLayer } from "@/models/project/LayerManager";
import { useRef } from "react";
import { toast } from "sonner";

const readImageData = (file: File) =>
  new Promise<{ src: string; width: number; height: number }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected image could not be read."));
        return;
      }
      const image = new Image();
      image.onload = () => resolve({
        src: reader.result as string,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      image.onerror = () => reject(new Error("The selected image could not be loaded."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });

const NewLayerButton: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    layerManager,
    project,
    setEditDocument,
    setLayerManager,
    setLoading,
  } = useProject();

  const handleImageLayer = async (file: File) => {
    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      toast.error("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    setLoading(true);
    try {
      const image = await readImageData(file);
      const imageLayer = await layerManager.createImageLayer(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height,
        {
          name: file.name,
          src: image.src,
          imageHeight: image.height,
          imageWidth: image.width,
          originalBlob: file,
          originalMimeType: file.type,
          originalWidth: image.width,
          originalHeight: image.height,
          originalSourceSrc: image.src,
          workingMimeType: file.type,
          fullResolutionSrc: image.src,
          fullResolutionWidth: image.width,
          fullResolutionHeight: image.height,
        },
      );

      setLayerManager((draft) => {
        draft.layers = addLayer(draft.layers, imageLayer);
        draft.target = imageLayer.id;
      });
      setEditDocument((draft) => {
        draft.imageLayers[imageLayer.id] = {
          id: imageLayer.id,
          type: "image",
          transform: {
            rotationDegrees: imageLayer.sprite.angle,
            width: imageLayer.sprite.width,
            height: imageLayer.sprite.height,
          },
          adjustmentLayerIds: [],
        };
      });
      toast.success(`Added ${file.name} as a new image layer.`);
    } catch (error) {
      console.error("Failed to add image layer", error);
      toast.error(error instanceof Error ? error.message : "The image layer could not be added.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {" "}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) await handleImageLayer(file);
        }}
      />
      <TooltipProvider>
        <Tooltip>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <CardStackPlusIcon className="w-6 h-6 cursor-pointer" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Create new layer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  inputRef.current?.click();
                }}
              >
                {" "}
                <ImageIcon className="w-5 h-5 mr-2" />
                Image Layer
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                {" "}
                <Folder className="w-5 h-5 mr-2" />
                Group Layer (Unavailable)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                {" "}
                <ComponentBooleanIcon className="w-5 h-5 mr-2" />
                Adjustment Layer (Use adjustment menu)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                {" "}
                <BoxIcon className="w-5 h-5 mr-2" />
                Background Layer (Unavailable)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                {" "}
                <TextIcon className="w-5 h-5 mr-2" />
                Text Layer (Unavailable)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                {" "}
                <HexagonIcon className="w-5 h-5 mr-2" />
                Shape Layer (Unavailable)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipContent className="text-xs" side="bottom">
            <p>Create new layer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default NewLayerButton;
