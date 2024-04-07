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
import { useProjectContext } from "@/pages/editor";
import { ImageLayer } from "@/utils/editorInterfaces";
import { rembg } from "@/utils/imagecalls";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Texture } from "pixi.js";
import React, { useEffect, useState } from "react";

interface RembgProps {
  setMode: (mode: string) => void;
  mode: string;
}

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

const Rembg: React.FC<RembgProps> = ({ setMode, mode }) => {
  const { project, setProject, loading, setLoading, trigger, setTrigger } =
    useProjectContext();
  const [model, setModel] = useState("isnet-anime" as string);
  const [hasHappened, setHasHappened] = useState(false);

  useEffect(() => {
    console.log(SheetContent);
    if (mode !== "rembg") {
      // Reset the model when the mode is not rembg
      setModel("isnet-anime");
      setHasHappened(false);
    }
  }, [mode]);

  const saveResult = async () => {
    setMode("view");
  };

  const cancelResult = async () => {
    if (project.target === null || project.target.type !== "image") return;
    const target = project.target as ImageLayer;
    target.sprite.texture = Texture.from(target.imageData.src ?? "");
    setHasHappened(false);
  };

  const callRembg = async () => {
    if (project.target === null || project.target.type !== "image") return;
    setLoading(true);
    const target = project.target as ImageLayer;
    const response = await rembg(
      target.imageData.src ?? "",
      model,
      false,
      false,
      240,
      10,
      10
    );
    if (response === null) {
      setLoading(false);
      return;
    }
    const newTexture = Texture.from(response);

    target.sprite.texture = newTexture;
    setHasHappened(true);
    setLoading(false);
    setTrigger(!trigger);
  };

  return (
    <Sheet modal={false} open={mode === "rembg"}>
      <SheetContent
        side={"left"}
        className="h-full top-10 w-64 border-r-2 border-[#cdcdcd] dark:border-[#252525]"
      >
        <SheetHeader>
          <SheetTitle>Remove Background (AI)</SheetTitle>
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
export default Rembg;
