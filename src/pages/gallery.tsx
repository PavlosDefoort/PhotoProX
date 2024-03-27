import GridGalleryTwo from "@/components/Editor/PhotoEditor/UI/offthegridTwo";
import Tags from "@/components/Editor/PhotoEditor/UI/tagInput";
import React, { use } from "react";
import {
  useEffect,
  useState,
  createContext,
  Dispatch,
  SetStateAction,
} from "react";
import dynamic, { Loader } from "next/dynamic";
import { ComponentType } from "react";
import { Poppins } from "next/font/google";
import { useInView } from "react-intersection-observer";

import { CopyIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import "viewerjs/dist/viewer.css";
import Viewer from "viewerjs";
import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import MultipleSelectCheckmarks from "@/components/Gallery/select";
import { fetchScout } from "@/utils/calls";
import { GallerySettings, Post, Tag } from "@/utils/galleryInterfaces";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import GallerySettingsInterface from "@/components/Gallery/settings";
import CasinoIcon from "@mui/icons-material/Casino";
import { NavigationMenuDemo } from "@/components/Editor/PhotoEditor/UI/navigationmenu";
import { useAuth } from "../../app/authcontext";
import { handleSignIn } from "@/components/Editor/PhotoEditor/UI/topbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

import { Gloria_Hallelujah } from "next/font/google";
const gloriaHallelujah = Gloria_Hallelujah({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export default function Generate() {
  const initialGallerySettings = new GallerySettings();
  const [ref, inView] = useInView({ threshold: 0.6 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      ("inView");
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [inView]);

  const [apiImage, setApiImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [website, setWebsite] = useState<string[]>([]);
  const [rating, setRating] = useState<string>("");
  const [scoutImages, setScoutImages] = useState<Post[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [inputValue, setInputValue] = useState<Tag[]>([]);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings>(
    initialGallerySettings
  );

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
        "prompts", prompts;
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
        "response", response;
        const data = await response.json();
        const image64 = data.image_base64;
        const image = new Image();
        image.src = `data:image/png;base64,${image64}`;
        image.onload = () => {
          setApiImage(image.src);
        };
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    };

    // Call the fetchImageData function
    fetchImageData();

    ("fetchImageData");
  };
  useEffect(() => {
    website;
    rating;
  }, [website, rating]);

  useEffect(() => {
    setRating(gallerySettings.rating);
  }, [gallerySettings]);

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center bg-gradient-to-t from-[#f5f5f5] to-[#f1f1f1] dark:from-[#000000]  dark:to-[#434343]  ${poppins.className}`}
    >
      <section className="h-screen ">
        <div className="h-full animate-fade-left animate-ease-linear flex flex-col justify-center items-center">
          <div className="p-10 text-black dark:text-white">
            <h1 className="text-7xl mb-6 text-center">
              <span className="">PhotoProX</span>{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                Gallery
              </span>
            </h1>
            <p className="text-lg text-left text-back">
              Here you can find the latest images from the web. Use the search
              bar above to find images from your favorite website.
            </p>
          </div>
          <div className="flex flex-col justify-center items-center space-y-5">
            <Link href="/gallery/anime">
              <div className="w-96 max-h-96 overflow-hidden">
                <Card className="h-full shadow-lg flex flex-row justify-center items-center">
                  <CardHeader>
                    <CardTitle>Booru</CardTitle>
                    <CardDescription>
                      Search for high-quality images from your favorite boorus
                    </CardDescription>
                  </CardHeader>
                  <CardContent
                    className="flex aspect-square items-center justify-center p-1"
                    style={{ width: "125px", height: "125px" }}
                  >
                    <img
                      src="/api/proxy?url=https://img3.gelbooru.com/images/98/02/980217137478979d7d8639ec5eaf73a3.jpg"
                      style={{
                        objectFit: "contain",
                        width: "125px",
                        height: "125px",
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </Link>
            <div className="w-96 max-h-96 overflow-hidden">
              <Card className="h-full shadow-lg flex flex-row justify-center items-center">
                <CardHeader>
                  <CardTitle>Reddit</CardTitle>
                  <CardDescription>
                    Search for high-quality images from your favorite subreddits
                  </CardDescription>
                </CardHeader>
                <CardContent
                  className="flex aspect-square items-center justify-center p-1"
                  style={{ width: "125px", height: "125px" }}
                >
                  <img
                    src="/api/proxy?url=https://1000logos.net/wp-content/uploads/2017/05/Reddit-Logo-500x281.png"
                    style={{
                      objectFit: "contain",
                      width: "125px",
                      height: "125px",
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      <div ref={ref}>
        <section className={`h-screen ${gloriaHallelujah.className}`}>
          <div className="bg-black w-full">
            <h1 className="text-5xl text-pink-400"></h1>
            <img
              className="animate-fade "
              src="7352178 (1).png"
              style={{
                objectFit: "contain",
              }}
            />
          </div>
          <div className="flex flex-col justify-center items-start">
            <h1 className="text-5xl text-pink-400">
              Introducing: Booru Search
            </h1>
            <ul className="list-decimal text-pink-400 pl-5 mt-10 text-2xl">
              <li>
                Choose your favorite booru from the list of available boorus
              </li>
              <li>Enter your search query in the search bar and press enter</li>
              <li>
                Click on the image to view the image in full resolution and
                download the image
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
