import GridGalleryTwo from "@/components/Editor/PhotoEditor/UI/offthegridTwo";
import Tags from "@/components/Editor/PhotoEditor/UI/tagInput";
import GallerySettingsInterface from "@/components/Gallery/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchScout } from "@/utils/calls";
import { GallerySettings, Post, Tag } from "@/utils/galleryInterfaces";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Poppins } from "next/font/google";
import React, { useEffect, useState } from "react";
import "viewerjs/dist/viewer.css";
import { useAuth } from "../../../../../app/authcontext";
import { InputValueContext } from "../../../../../app/contexts";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface DiscoveryProps {}

const Discovery: React.FC<DiscoveryProps> = () => {
  const initialGallerySettings = new GallerySettings();

  const [apiImage, setApiImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [website, setWebsite] = useState<string[]>([]);
  const [rating, setRating] = useState<string>("");
  const [scoutImages, setScoutImages] = useState<Post[]>([]);
  const [blackListedTags, setBlackListedTags] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [inputValue, setInputValue] = useState<Tag[]>([]);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings>(
    initialGallerySettings
  );

  const { user } = useAuth();

  useEffect(() => {
    // Define a function to fetch the image data
  }, []); // Empty dependency array to run the effect only once

  const rembg = () => {
    const fetchRembg = async () => {
      const response = await fetch("http://127.0.0.1:5000/rembg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input_image: apiImage }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch image data");
      }
      const data = await response.json();
      const image64 = data.image;
      const image = new Image();
      image.src = `data:image/png;base64,${image64}`;
      image.onload = () => {
        setApiImage(image.src);
      };
    };
    fetchRembg();
  };

  const generate_image = () => {
    setIsGenerating(true);

    const fetchImageData = async () => {
      try {
        const prompts = tags.join(", ");
        const prompt = {
          prompt: prompts,
          negative_prompt:
            " (ugly:1.3), (fused fingers), (too many fingers), (bad anatomy:1.5), (watermark:1.5), (words), letters, untracked eyes, asymmetric eyes, floating head, (logo:1.5), (bad hands:1.3), (mangled hands:1.2), (missing hands), (missing arms), backward hands, floating jewelry, unattached jewelry, floating head, doubled head, unattached head, doubled head, head in body, (misshapen body:1.1), (badly fitted headwear:1.2), floating arms, (too many arms:1.5), limbs fused with body, (facial blemish:1.5), badly fitted clothes, imperfect eyes, untracked eyes, crossed eyes, hair growing from clothes, partial faces, hair not attached to head",
          steps: 50,
          width: 512,
          height: 512,
          cfg_scale: 8,
        };
        const raw = JSON.stringify(prompt);

        const response = await fetch("http://127.0.0.1:5000/generate_image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: raw,
        });
        if (!response.ok) {
          throw new Error("Failed to fetch image data");
        }
        const data = await response.json();
        const image64 = data.image_base64;
        const image = new Image();
        image.src = `data:image/png;base64,${image64}`;
        image.onload = () => {
          setApiImage(image.src);
        };
      } catch (error: any) {}
    };

    // Call the fetchImageData function
    fetchImageData();
  };
  useEffect(() => {
    setBlackListedTags(gallerySettings.blacklistedTags);
  }, [website, rating, gallerySettings.blacklistedTags]);

  useEffect(() => {
    setWebsite(gallerySettings.website);
    setRating(gallerySettings.rating);
  }, [gallerySettings]);

  const [openGallery, setOpenGallery] = React.useState(false);
  let timer: any;
  const handleMouseEnter = () => {
    clearTimeout(timer); // Clear any existing timeout
    setOpenGallery(true);
  };

  const handleMouseLeave = () => {
    // Set a timeout to close the popover after a delay
    timer = setTimeout(() => {
      setOpenGallery(false);
    }, 200); // Adjust the delay time as needed
  };
  return (
    <InputValueContext.Provider value={{ inputValue, setInputValue }}>
      <Dialog modal={true}>
        <Popover open={openGallery}>
          <PopoverTrigger
            asChild
            className="focus-visible:ring-offset-0 focus-visible:ring-0"
          >
            <DialogTrigger asChild>
              <Button
                className="w-6 flex flex-row items-center justify-center bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover"
                variant="outline"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <span>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-6 h-6 text-gray-500 dark:text-gray-100"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"></path>
                  </svg>
                </span>
              </Button>
            </DialogTrigger>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            className={`w-72 ${poppins.className} select-none`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Discovery</h4>
                <p className="text-sm text-muted-foreground">
                  Search for the perfect image to edit
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <DialogContent
          className={`max-w-screen-2xl h-screen flex flex-col justify-center items-center bg-gradient-to-t from-[#f5f5f5] to-[#f1f1f1] dark:from-[#000000]  dark:to-[#434343]  ${poppins.className}`}
        >
          <div className="w-full overflow-y-scroll">
            <div
              className="fixed top-0 left-0 z-50 bg-slate-100 w-full h-20 flex flex-row items-center justify-center bg-navbarBackground dark:bg-navbarBackground border-b-2 border-[#cdcdcd] dark:border-[#252525]"
              id="search"
            >
              {/* {user ? (
                <NavigationMenuDemo />
              ) : (
                <div className="flex flex-row items-center justify-center text-sm ml-2">
                  <button onClick={handleSignIn}>Sign In with Google</button>
                </div>
              )} */}

              <div className="flex flex-row justify-center items-center">
                <GallerySettingsInterface
                  gallerySettings={gallerySettings}
                  setGallerySettings={setGallerySettings}
                />

                <div className="flex flex-row items-center justify-center w-full px-4">
                  <Tags
                    setTags={setTags}
                    scoutImages={scoutImages}
                    apiImage={apiImage}
                    setApiImage={setApiImage}
                    website={website}
                    setScoutImages={setScoutImages}
                    rating={rating}
                    blackListedTags={blackListedTags}
                  />
                  <div className="ml-2">
                    <Button
                      onClick={() => {
                        const newTags = [
                          ...tags,
                          ...gallerySettings.persistentTags,
                        ];

                        // Remove duplicates from the new tags array
                        const uniqueTags = Array.from(new Set(newTags));

                        fetchScout(
                          uniqueTags,
                          blackListedTags,
                          rating,
                          website,
                          setScoutImages
                        );
                      }}
                      className="h-10 "
                    >
                      <MagnifyingGlassIcon className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {scoutImages.length == 0 && (
              <div className="animate-fade-left h-screen animate-ease-linear flex flex-col justify-center items-center">
                <div className=" p-10 text-black dark:text-white">
                  <h1 className="text-7xl mb-6 text-center">
                    <span className="">PhotoProX</span>{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
                      Discovery
                    </span>
                  </h1>
                  <p className="text-lg text-center text-back">
                    Find the next <strong>stunning </strong>image for your
                    amazing project
                  </p>
                </div>
                <div className="flex flex-col justify-center items-center space-y-5">
                  <div className="w-96 max-h-96 overflow-hidden"></div>
                </div>
              </div>
            )}

            <div className="mt-20 ">
              <div id="gallery" className="w-full">
                <GridGalleryTwo
                  gallery={scoutImages}
                  gallerySettings={gallerySettings}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InputValueContext.Provider>
  );
};
export default Discovery;
