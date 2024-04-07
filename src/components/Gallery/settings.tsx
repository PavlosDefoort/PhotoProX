import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { GallerySettings } from "@/utils/galleryInterfaces";
import { zodResolver } from "@hookform/resolvers/zod";
import { GearIcon } from "@radix-ui/react-icons";
import { FC, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface GallerySettingsProps {
  gallerySettings: GallerySettings;
  setGallerySettings: (gallerySettings: GallerySettings) => void;
}

const items = [
  {
    id: "gelbooru",
    label: "Gelbooru",
  },
  {
    id: "danbooru",
    label: "Danbooru",
  },
] as const;

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one website.",
  }),
});

const GallerySettingsInterface: FC<GallerySettingsProps> = ({
  gallerySettings,
  setGallerySettings,
}) => {
  useEffect(() => {
    gallerySettings.rating;
  }, [gallerySettings.rating]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: ["recents", "home"],
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast("You submitted the following values:", {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }
  const [openDialog, setOpenDialog] = useState(false);
  return (
    <div>
      <Dialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button>
                  <GearIcon className="w-6 h-6" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Gallery Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DialogContent className="overflow-y-scroll max-h-screen text-black dark:text-white">
          <DialogHeader>
            <DialogTitle>Gallery Settings</DialogTitle>
            <DialogDescription>
              Configurate the gallery settings to your liking
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label className="text-md font-semibold ">Rating</Label>
            <p className="text-sm text-gray-600">
              Set the ESRB rating for images in search.
            </p>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.rating === "general"}
                  disabled={gallerySettings.rating === "general"}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      rating: "general",
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Everyone 10+ (Safe/General)
                </label>
                <p className="text-xs text-muted-foreground">
                  May contain more cartoon, fantasy, or mild violence, mild
                  language, and/or minimal suggestive themes.{" "}
                  <span className="text-red-500">
                    This rating may not always be consistent across all boorus.
                    If you encounter an image that is not rated properly, please
                    report it to the website.
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.rating === "sensitive"}
                  disabled={gallerySettings.rating === "sensitive"}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      rating: "sensitive",
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <Label className="text-sm font-medium leading-none pb-1">
                  Teenagers 13+ (Sensitive)
                </Label>
                <p className="text-xs text-muted-foreground">
                  May contain violence, suggestive themes, crude humor, minimal
                  blood, simulated gambling, and/or infrequent use of strong
                  language.{" "}
                  <span className="text-xs text-red-500">
                    Some boorus may not have this rating, and will be converted
                    to safe rating if this condition applies.
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.rating === "questionable"}
                  disabled={gallerySettings.rating === "questionable"}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      rating: "questionable",
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <Label className="text-sm font-medium leading-none pb-1">
                  Mature 17+ (Questionable)
                </Label>
                <p className="text-xs text-muted-foreground">
                  May contain intense violence, blood and gore, sexual content,
                  and/or strong language
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.rating === "explicit"}
                  disabled={
                    gallerySettings.rating === "explicit" ||
                    !gallerySettings.enableNSFWMode
                  }
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      rating: "explicit",
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <Label className="text-sm font-medium leading-none pb-1">
                  Adult 18+ (Explicit)
                </Label>
                <p className="text-xs text-muted-foreground">
                  May contained scenes of intense violence and/or graphic sexual
                  content and nudity
                </p>
                {!gallerySettings.enableNSFWMode && (
                  <p className="text-xs text-red-500">
                    NSFW mode must be enabled to view explicit content
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-md font-semibold ">Website</Label>
            <p className="text-sm text-gray-600">
              Select the website you want to search images from.
            </p>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.website.includes("safebooru")}
                  disabled={gallerySettings.website.includes("safebooru")}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      website: ["safebooru"],
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Safebooru
                </label>
                <p className="text-xs text-muted-foreground">
                  Safebooru is a safe imageboard intended for all ages. Search
                  for anime pictures categorized by thousands of tags. Note that
                  although NSFW content is not allowed, some images may still
                  be.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.website.includes("danbooru")}
                  disabled={gallerySettings.website.includes("danbooru")}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      website: ["danbooru"],
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Danbooru
                </label>
                <p className="text-xs text-muted-foreground">
                  Danbooru is the original anime image booru. Search millions of
                  anime pictures categorized by thousands of tags.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.website.includes("ai-booru")}
                  disabled={gallerySettings.website.includes("ai-booru")}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      website: ["ai-booru"],
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  AIBooru
                </label>
                <p className="text-xs text-muted-foreground">
                  AIBooru is a booru imageboard that focuses on AI generated
                  images
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.website.includes("konachan")}
                  disabled={gallerySettings.website.includes("konachan")}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      website: ["konachan"],
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Konachan
                </label>
                <p className="text-xs text-muted-foreground">
                  Konachan is an anime image board that focuses on high quality
                  wallpapers
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.website.includes("yandere")}
                  disabled={gallerySettings.website.includes("yandere")}
                  onClick={() => {
                    setGallerySettings({
                      ...gallerySettings,
                      website: ["yandere"],
                    });
                  }}
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Yande.re
                </label>
                <p className="text-xs text-muted-foreground">
                  Yande.re is an anime image board that focuses on high quality
                  scans (images of anime characters from magazines, artbooks,
                  etc.).
                </p>
              </div>
            </div>
          </div>
          {gallerySettings.enableNSFWMode && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 space-y-3">
                <div className="flex items-top space-x-2">
                  <div className="flex flex-col">
                    <Checkbox
                      className="hover:bg-gray-300"
                      checked={gallerySettings.website.includes("gelbooru")}
                      disabled={gallerySettings.website.includes("gelbooru")}
                      onClick={() => {
                        setGallerySettings({
                          ...gallerySettings,
                          website: ["gelbooru"],
                        });
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                      Gelbooru
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Gelbooru is an adult-oriented image-sharing community that
                      specializes in anime-style artwork and NSFW (Not Safe For
                      Work) content.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-y-3">
                <div className="flex items-top space-x-2">
                  <div className="flex flex-col">
                    <Checkbox
                      className="hover:bg-gray-300"
                      checked={gallerySettings.website.includes("realbooru")}
                      disabled={gallerySettings.website.includes("realbooru")}
                      onClick={() => {
                        setGallerySettings({
                          ...gallerySettings,
                          website: ["realbooru"],
                        });
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                      RealBooru
                    </label>
                    <p className="text-xs text-muted-foreground">
                      RealBooru is a booru imageboard that focuses on NSFW real
                      life images. Lots of cosplay here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-y-3">
                <div className="flex items-top space-x-2">
                  <div className="flex flex-col">
                    <Checkbox
                      className="hover:bg-gray-300"
                      checked={gallerySettings.website.includes("rule34")}
                      disabled={gallerySettings.website.includes("rule34")}
                      onClick={() => {
                        setGallerySettings({
                          ...gallerySettings,
                          website: ["rule34"],
                        });
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                      Rule 34.xxx
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      If it exists, there is p... Nevermind.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-y-3">
                <div className="flex items-top space-x-2">
                  <div className="flex flex-col">
                    <Checkbox
                      className="hover:bg-gray-300"
                      checked={gallerySettings.website.includes("xbooru")}
                      disabled={gallerySettings.website.includes("xbooru")}
                      onClick={() => {
                        setGallerySettings({
                          ...gallerySettings,
                          website: ["xbooru"],
                        });
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                      XBooru
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Often referred to as Rule 34s dirty sister. Take that as
                      you will.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-md font-semibold ">Other</Label>
            <p className="text-sm text-gray-600">
              Quality of life settings for the gallery.
            </p>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.showPopups}
                  onClick={() => {
                    if (gallerySettings.showPopups === true) {
                      setGallerySettings({
                        ...gallerySettings,
                        showPopups: false,
                      });
                    } else {
                      setGallerySettings({
                        ...gallerySettings,
                        showPopups: true,
                      });
                    }
                  }}
                />
              </div>

              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Hover Popups
                </label>
                <p className="text-xs text-muted-foreground">
                  Control the hover popups that show the image tags
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col">
                <Checkbox
                  className="hover:bg-gray-300"
                  checked={gallerySettings.showAI}
                  onClick={() => {
                    if (gallerySettings.showPopups === true) {
                      setGallerySettings({
                        ...gallerySettings,
                        showAI: false,
                      });
                    } else {
                      setGallerySettings({
                        ...gallerySettings,
                        showAI: true,
                      });
                    }
                  }}
                />
              </div>

              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Show AI Generated Images
                </label>
                <p className="text-xs text-muted-foreground">
                  Filters out any images that are indicated as AI generated by
                  tags
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col"></div>

              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Persistent Tags
                </label>
                <p className="text-xs text-muted-foreground">
                  Select your Persistent Tags. These tags will always be
                  included in your search if they are available for the website
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col"></div>

              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Favourite Tags
                </label>
                <p className="text-xs text-muted-foreground">
                  Select your Favourite Tags. These tags will be bookedmark at
                  the top of the search bar for easy access
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-y-3">
            <div className="flex items-top space-x-2">
              <div className="flex flex-col"></div>

              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1">
                  Blacklisted Tags
                </label>
                <p className="text-xs text-muted-foreground">
                  Select your Blacklisted Tags. These tags will always be
                  negated in your search if they are available for the website
                </p>
              </div>
            </div>
          </div>
          {gallerySettings.enableNSFWMode && (
            <Button
              variant={"default"}
              className="bg-green-500 hover:bg-green-600"
              onClick={() =>
                setGallerySettings({
                  ...gallerySettings,
                  rating: "general",
                  enableNSFWMode: false,
                })
              }
            >
              Disable NSFW Mode
            </Button>
          )}
          {!gallerySettings.enableNSFWMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Enable NSFW Mode</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="">Warning</AlertDialogTitle>

                  <div className="text-sm text-muted-foreground">
                    Enabling this setting will also enable the following
                    websites:
                    <ul className="list-disc pl-5 mt-1">
                      <li>Gelbooru</li>
                      <li>RealBooru</li>
                      <li>Rule34.xxx</li>
                      <li>XBooru</li>
                    </ul>
                    <div className="mt-3">
                      <p>
                        {" "}
                        It will also enable the <strong>Explicit</strong>{" "}
                        rating. By enabling NSFW mode, you are agreeing to view
                        adult content. This includes nudity, sexual content, and
                        other adult themes.
                      </p>
                      <p className="mt-3">
                        <strong>
                          You must be 18 years or older to enable this setting.
                        </strong>
                      </p>
                      <p className="mt-3">
                        You have been warned. You hear that? You have been
                        warned.
                      </p>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      setGallerySettings({
                        ...gallerySettings,
                        rating: "explicit",
                        enableNSFWMode: true,
                      })
                    }
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default GallerySettingsInterface;
