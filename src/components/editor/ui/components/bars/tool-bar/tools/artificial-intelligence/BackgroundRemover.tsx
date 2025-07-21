import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useProject } from "@/hooks/useProject";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { base64StringToTexture } from "@/utils/ImageUtils";
import { ImageSource } from "@imgly/background-removal";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import React, { useEffect, useState } from "react";

interface SelectModelProps {
  model: string;
  setModel: (model: string) => void;
}

const SelectModel: React.FC<SelectModelProps> = ({ model, setModel }) => {
  return (
    <Select value={model} onValueChange={(value) => setModel(value)}>
      <SelectTrigger className="w-[180px] bg-input dark:bg-input border-border dark:text-white">
        <SelectValue placeholder="Models" />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup className="">
          <SelectLabel className="">Models</SelectLabel>
          <SelectSeparator />
          <SelectItem value="isnet-general-use">Isnet General Use</SelectItem>
          <SelectItem value="isnet-anime">Isnet Anime</SelectItem>
          <SelectItem value="u2net">U2net</SelectItem>
          <SelectItem value="u2netp">U2netp</SelectItem>
          <SelectItem value="u2net_human_seg">U2net Human Seg</SelectItem>
          <SelectItem value="u2net_cloth_seg">U2net Cloth Seg</SelectItem>
          <SelectItem value="silueta">Silueta</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const BackgroundRemover: React.FC = () => {
  const {
    project,
    setProject,
    loading,
    layerManager,
    setLayerManager,
    setLoading,
    trigger,
    setTrigger,
    editMode,
    setEditMode,
  } = useProject();
  const [model, setModel] = useState("isnet-anime" as string);
  const [hasHappened, setHasHappened] = useState(false);
  const [tempSrc, setTempSrc] = useState("");

  const target = findLayer(layerManager.layers, layerManager.target);

  useEffect(() => {
    console.log("editMode", editMode);
    if (editMode !== "rembg") {
      // Reset the model when the mode is not rembg
      setModel("isnet-anime");
      setHasHappened(false);
    }
  }, [editMode]);

  const saveResult = async () => {
    setEditMode("view");
    if (tempSrc.length > 0) {
      if (target instanceof ImageLayer) {
        setLayerManager((draft) => {
          draft.layers = draft.layers.map((layer) => {
            if (layer.id === target.id) {
              (layer as ImageLayer).imageData.src = tempSrc;
            }
            return layer;
          });
        });
        setTempSrc("");
      }
    }
  };

  async function removeImageBackground(imgSource: ImageSource) {
    const response = await fetch("/api/rembg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageSrc: imgSource }),
    });

    if (!response.ok) {
      console.error("Failed to remove background");
      return null;
    }

    const data = await response.json();
    console.log("data", data);
    return data.data;
  }

  const cancelResult = async () => {
    if (target === undefined || !(target instanceof ImageLayer)) return;
    const texture = await base64StringToTexture(target.imageData.src);
    target.sprite.texture = texture;
    setTempSrc("");
    setHasHappened(false);
  };

  const callRembg = async () => {
    if (target === null || !(target instanceof ImageLayer)) return;

    setLoading(true);

    const response = await removeImageBackground(target.imageData.src);
    if (response === null) {
      setLoading(false);
      return;
    }

    const newTexture = await base64StringToTexture(response);

    target.sprite.texture = newTexture;
    setTempSrc(response);
    setHasHappened(true);
    setLoading(false);
    setTrigger(!trigger);
  };

  return (
    <Sheet modal={false} open={editMode === "rembg"}>
      <SheetContent
        side={"left"}
        className="h-full top-10 w-64 border-r-2 border-[#cdcdcd] dark:border-[#252525] "
      >
        <SheetHeader>
          <SheetTitle>Remove Background</SheetTitle>
          <SheetDescription>
            Remove the background from an image using AI.
          </SheetDescription>
        </SheetHeader>
        <SelectSeparator className="m-3" />
        <div className="flex flex-col space-y-7 mt-5 items-start">
          <div className="flex flex-col items-start space-y-2">
            <div className="flex flex-col items-start space-y-1">
              <div className="flex flex-row space-x-2 text-black dark:text-white items-center">
                {/* <CodeIcon className="w-4 h-4 text-muted-foreground" /> */}
                <Label htmlFor="model" className="text-black dark:text-white">
                  Model
                </Label>
              </div>
              <div
                className="flex flex-row justify-center items-center space-x-1 "
                id="help-model-container"
              >
                <InfoCircledIcon className="text-xs cursor-pointer text-muted-foreground" />
                <Link
                  href={
                    "https://photoproxdocs.vercel.app/technical/algorithms_and_models#background-remover-models"
                  }
                  target="_blank"
                >
                  <p className="text-muted-foreground text-xs">
                    Help choosing a model
                  </p>
                </Link>
              </div>
            </div>
            <SelectModel model={model} setModel={setModel} />
          </div>

          {/* <Button onClick={() => saveResult()}>Save</Button> */}
          <div className="flex flex-row space-x-2">
            <Button
              onClick={() => cancelResult()}
              disabled={!hasHappened}
              className="text-xs"
            >
              Revert Changes
            </Button>
            <Button
              onClick={() => callRembg()}
              className="bg-green-500 hover:bg-green-600 dark:bg-white text-xs"
              disabled={hasHappened}
            >
              Remove Background
            </Button>
          </div>
          <SheetFooter className="w-full">
            <SheetClose asChild>
              <Button
                variant="ghost"
                type="submit"
                onClick={() => saveResult()}
                className="w-full text-muted-foreground bg-black text-white"
              >
                Save and Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};
export default BackgroundRemover;
