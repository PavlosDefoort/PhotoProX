import React, {
  useState,
  useEffect,
  ChangeEvent,
  useContext,
  Dispatch,
  SetStateAction,
  useRef,
} from "react";
import VisibilitySensor from "react-visibility-sensor";
import { Info } from "@mui/icons-material";
import { PermIdentity } from "@mui/icons-material";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@mui/material";
import Image from "next/image";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { some } from "lodash";
import "viewerjs/dist/viewer.css";
import Viewer from "viewerjs";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import Inspect from "@/components/Gallery/inspect";
import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { downloadImage, fetchTags } from "@/utils/calls";

import Link from "next/link";
import { uploadFileFromGallery } from "../../../../../app/firebase";
import { useAuth } from "../../../../../app/authcontext";
import { toast } from "sonner";
import {
  GallerySettings,
  createImageNameFromTags,
  sortByImportant,
} from "@/utils/galleryInterfaces";
import { InputValueContext } from "../../../../../app/contexts";
import { useProjectContext } from "@/pages/editor";
import { ImageData } from "@/utils/editorInterfaces";
import { Post } from "@/utils/galleryInterfaces";

type Tag = {
  id: number;
  name: string;
  post_count: number;
  category: number;
  created_at: string;
  updated_at: string;
  is_deprecated: boolean;
  words: string[];
};
interface Tags {
  tags: Tag[];
}

interface GridGalleryTwoProps {
  gallery: Post[];
  gallerySettings: GallerySettings;
}
interface GridGalleryCardProps {
  post: Post;
  show: boolean;
}
const GridGalleryCard: React.FC<GridGalleryCardProps> = ({ post, show }) => {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  // useEffect(() => {
  //   console.log(post.file_url);
  //   setViewer(new Viewer(document.getElementById(post.id.toString())!));
  // }, [post, show]);

  type InputValueContextType = {
    inputValue: [];
    setInputValue: Dispatch<SetStateAction<Tag[]>>;
  };

  const { inputValue, setInputValue } = useContext(
    InputValueContext
  ) as InputValueContextType;

  const { user } = useAuth();

  const aspectRatio = post.width / post.height;
  const style = {
    width: "300px", // Change this to the size you want
    height: "300px", // Make this the same as the width to create a square
    // This allows the image to be positioned relative to the container
  };

  const convertFileLinktoFile = async (url: string) => {
    const response = await fetch("http://127.0.0.1:5000/get_image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: post.file_url }),
    });
    const data = await response.json();
    // Convert the base64 string to a blob
    const byteCharacters = atob(data.image_base64);
    const byteNumbers = new Array(byteCharacters.length);
    // Create an array of the byte characters
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    // Convert to a Uint8Array
    const byteArray = new Uint8Array(byteNumbers);
    // Create a blob
    const blob = new Blob([byteArray], { type: "image/png" });
    // Create a file from the blob
    const file = new File([blob], `${post.id}.png`, {
      type: "image/png",
    });
    return file;
  };

  const { project, setProject, trigger, setTrigger } = useProjectContext();

  const createLayerFromPost = () => {
    convertFileLinktoFile(post.file_url).then((file): File => {
      // Convert file to base64 image string
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64data = reader.result;
        // Create a new layer from the base64 image string
        const newLayer = {
          name: post.tags,
          src: base64data as string,
          imageHeight: post.height,
          imageWidth: post.width,
        };
        const layer = project.layerManager.createLayer(
          post.width,
          post.height,
          newLayer,
          file,
          project.id,
          user?.uid!,
          false
        );

        setProject((draft) => {
          draft.layerManager.addLayer({
            ...layer,
            type: "image", // Add the missing 'type' property
          });
          setTrigger(!trigger);
        });
        toast(`Layer ${createImageNameFromTags(post.tags)} added to project`, {
          duration: 3000,
          description: "You can now start editing the image",
          // action: {
          //   label: "Undo",
          //   // onClick: () => {
          //   //   // Undo the addition of the layer
          //   //   project.removeLayer(layer, setProject,project.);
          //   // },
          // },
        });
      };
      return file;
    });
  };

  return (
    <div
      style={style}
      className={`relative transition ease-in  duration-300 transform border-2 border-black dark:border-slate-400 ${
        show ? "" : "translate-y-16 opacity-0"
      }`}
    >
      <a target="_blank" rel="noopener noreferrer">
        <div className="absolute inset-0 flex transition duration-200 ease-in hover:opacity-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="mx-auto text-white  self-center uppercase text-center">
            {/* {post.title} */}
          </div>
        </div>

        <div>
          <ContextMenu modal={true}>
            <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md text-sm">
              <img
                onClick={() => {
                  window.open(post.file_url, "_blank");
                }}
                id={post.id.toString()}
                src={`/api/proxy?url=${post.file_url}`}
                className="absolute"
                style={{
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  inset: "0px",
                  objectFit: "contain",
                  color: "transparent",

                  cursor: "pointer",
                }}
              ></img>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64 ">
              <ContextMenuSeparator />
              <ContextMenuRadioGroup value="pedro">
                <ContextMenuLabel inset>PhotoProX Functions</ContextMenuLabel>
                <ContextMenuSeparator />
                <Link href={"/editor"}>
                  <ContextMenuRadioItem
                    value="pedro"
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={createLayerFromPost}
                  >
                    Add Layer
                  </ContextMenuRadioItem>
                </Link>
                <ContextMenuRadioItem
                  value="colm"
                  onClick={async () => {
                    uploadFileFromGallery(
                      await convertFileLinktoFile(post.file_url),
                      post,
                      user?.uid!
                    );
                  }}
                >
                  Save to PhotoProX Storage
                </ContextMenuRadioItem>
              </ContextMenuRadioGroup>
              <ContextMenuSeparator />
              <ContextMenuLabel inset>General Functions</ContextMenuLabel>
              <ContextMenuSeparator />

              <ContextMenuItem
                inset
                onClick={() => {
                  window.open(post.file_url, "_blank");
                }}
              >
                Open image in new tab
                {/* <ContextMenuShortcut>⌘[</ContextMenuShortcut> */}
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  window.open(
                    `https://gelbooru.com/index.php?page=post&s=view&id=${post.id}`,
                    "_blank"
                  );
                }}
              >
                Open post in new tab
                {/* <ContextMenuShortcut>⌘[</ContextMenuShortcut> */}
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  navigator.clipboard.writeText(post.file_url);
                  toast("Image address has been copied to keyboard", {
                    duration: 3000,
                    description: "You can now paste the image address anywhere",
                    action: {
                      label: "Undo",
                      onClick: () => {
                        // Undo the copy of the address
                        navigator.clipboard.writeText("");
                      },
                    },
                  });
                }}
              >
                Copy image address
                {/* <ContextMenuShortcut>⌘[</ContextMenuShortcut> */}
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${post.source ? post.source : "No source available"}`
                  );
                  toast("Post address has been copied to keyboard", {
                    description: "You can now paste the post address anywhere",
                    action: {
                      label: "Undo",
                      onClick: () => {
                        // Undo the copy of the address
                        navigator.clipboard.writeText("");
                      },
                    },
                  });
                }}
              >
                Copy post address
                {/* <ContextMenuShortcut>⌘[</ContextMenuShortcut> */}
              </ContextMenuItem>
              <ContextMenuItem inset onClick={() => downloadImage(post)}>
                Download Original Image
                <ContextMenuShortcut>⌘⇧B</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuLabel inset>Gallery Functions</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem
                inset
                onClick={() =>
                  fetchTags(post, false, post.website, setInputValue)
                }
              >
                Inject original tags into search
                {/* <ContextMenuShortcut>⌘]</ContextMenuShortcut> */}
              </ContextMenuItem>
              <ContextMenuItem
                inset
                onClick={() =>
                  fetchTags(post, true, post.website, setInputValue)
                }
              >
                Interrogate tags into search
                {/* <ContextMenuShortcut>⌘R</ContextMenuShortcut> */}
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger inset>View Mode</ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  <ContextMenuItem>
                    Small
                    <ContextMenuShortcut>⇧⌘S</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem>Medium</ContextMenuItem>
                  <ContextMenuItem>Large</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>Extra Large</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuCheckboxItem></ContextMenuCheckboxItem>
            </ContextMenuContent>
          </ContextMenu>

          {/* <Image
            loading="eager"
            src={`/api/proxy?url=${post.file_url}`}
            // onError={(e) => {
            //   e.target.src = post.preview_url;
            // }}
            layout="fill" //Make the image fit the size of the container
            objectFit="contain" // This makes the image maintain its aspect ratio while filling the container
            alt="Description of the image"
            // Set imageLoaded to true when the image loads successfully
          /> */}
        </div>
      </a>
    </div>
  );
};

const GridGalleryTwo: React.FC<GridGalleryTwoProps> = ({
  gallery,
  gallerySettings,
}) => {
  const tags: Tags = require("../../../../utils/tags.json");
  const [imagesShownArray, setImagesShownArray] = useState(
    gallery ? Array(gallery.length).fill(false) : []
  );
  const imageVisibleChange = (index: number, isVisible: boolean) => {
    if (isVisible) {
      setImagesShownArray((currentImagesShownArray) => {
        currentImagesShownArray[index] = true;
        return [...currentImagesShownArray];
      });
    }
  };
  const [videoError, setVideoError] = useState(false);
  const [size, setSize] = useState("4");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewerGallery, setViewerGallery] = useState<Viewer | null>(null);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = gallery.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(gallery.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Check if gallery changed
  useEffect(() => {
    // setImagesShownArray(gallery ? Array(gallery.length).fill(false) : []);
    // Reset pagination
    setCurrentPage(1);
  }, [gallery]);

  // const determineCharacters = (post: any) => {
  //   const characterArray = post.tags.split(" ");
  //   // get the tags that have category 4
  //   const filteredCategoryFour = tags.tags.filter((tag) => tag.category === 4);
  //   // get the name that have category 4
  //   const filteredCategoryFourNames = filteredCategoryFour.map(
  //     (tag) => tag.name
  //   );
  //   // match the names with the character array
  //   const matchedCharacters = characterArray.filter((character: string) =>
  //     filteredCategoryFourNames.includes(character)
  //   );
  //   // return the matched characters as a string seperated by commas
  //   const matchedCharactersString = matchedCharacters.join(", ");
  //   return matchedCharactersString;
  // };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Your event handling logic here

      if (event.key === "d") {
        setCurrentPage((prevPage) =>
          Math.min(prevPage + 1, Math.ceil(gallery.length / itemsPerPage))
        );
      } else if (event.key === "a") {
        setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
      } else if (event.key === "1") {
        setSize("grid grid-cols-1 gap 2");
      } else if (event.key === "2") {
        setSize("grid grid-cols-2 gap 2");
      } else if (event.key === "3") {
        setSize("grid grid-cols-3 gap 2");
      } else if (event.key === "4") {
        setSize("grid grid-cols-4 gap 2");
      } else if (event.key === "5") {
        setSize("grid grid-cols-5 gap 2");
      } else if (event.key === "6") {
        setSize("grid grid-cols-6 gap 2");
      } else if (event.key === "7") {
        setSize("grid grid-cols-7 gap 2");
      } else if (event.key === "8") {
        setSize("grid grid-cols-8 gap 2");
      } else if (event.key === "9") {
        setSize("grid grid-cols-9 gap 2");
      } else {
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gallery.length, itemsPerPage, currentPage, size]);

  const handleVideoError = () => {
    setVideoError(true);
  };

  const calculateColour = (tag: Tag): string => {
    const palette = {
      artist: {
        light: "#ff0f00",
        main: "#ff0f00",
        dark: "#ff0f00",
        contrastText: "#fff",
      },
      series: {
        light: "#ff00e7",
        main: "#ff00e7",
        dark: "#ff00e7",
        contrastText: "#fff",
      },
      character: {
        light: "#01A75E",
        main: "#01A75E",
        dark: "#01A75E",
        contrastText: "#fff",
      },
      technical: {
        light: "#ff6100",
        main: "#ff6100",
        dark: "#ff6100",
        contrastText: "#fff",
      },
    };
    if (tag.category === 1) {
      return palette.artist.main;
    } else if (tag.category === 3) {
      return palette.series.main;
    } else if (tag.category === 4) {
      return palette.character.main;
    } else if (tag.category === 5) {
      return palette.technical.main;
    } else {
      return "#1e81b0";
    }
  };

  const people = [
    { name: "Wade Cooper" },
    { name: "Arlene Mccoy" },
    { name: "Devon Webb" },
    { name: "Tom Cook" },
    { name: "Tanya Fox" },
    { name: "Hellen Schmidt" },
  ];

  const [selected, setSelected] = useState(people[0]);

  const renderPaginationItems = () => {
    const maxPageButtons = 9; // Including previous and next buttons
    const midPageButtons = Math.floor(maxPageButtons / 2);

    const renderPageLinks = () => {
      const links: JSX.Element[] = [];
      let startPage = Math.max(1, currentPage - midPageButtons);
      let endPage = Math.min(startPage + maxPageButtons - 1, totalPages);

      // Ensure there are maxPageButtons displayed unless at the beginning or end
      if (endPage - startPage < maxPageButtons - 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        links.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={i === currentPage}
              onClick={() => paginate(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      return links;
    };

    return (
      <>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            isActive={currentPage === 1}
            onClick={() => paginate(Math.max(currentPage - 1, 1))}
          />
        </PaginationItem>
        {renderPageLinks()}
        <PaginationItem>
          <PaginationNext
            href="#"
            isActive={currentPage === totalPages}
            onClick={() => paginate(Math.min(currentPage + 1, totalPages))}
          />
        </PaginationItem>
      </>
    );
  };
  const divRef = useRef(null);

  return (
    <div className="flex flex-col justify-center items-center ">
      <div className="lg:grid lg:grid-cols-5 lg:gap-4 md:grid md:grid-cols-4 md:gap-4 ">
        {currentItems.map((post, index: number) => {
          const actualIndex = indexOfFirstItem + index;
          if (gallerySettings.showPopups === false) {
            return (
              <div key={index}>
                <div>
                  <GridGalleryCard post={post} show={true} />
                </div>
              </div>
            );
          } else {
            return (
              <HoverCard key={index}>
                <HoverCardTrigger asChild>
                  <div>
                    <VisibilitySensor
                      ref={divRef}
                      partialVisibility={true}
                      key={actualIndex}
                      onChange={(isVisible: boolean) =>
                        imageVisibleChange(actualIndex, isVisible)
                      }
                      offset={{ bottom: 80 }}
                    >
                      <div>
                        <GridGalleryCard
                          post={post}
                          show={imagesShownArray[actualIndex]}
                        />
                      </div>
                    </VisibilitySensor>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="max-h-80 w-auto max-w-xl overflow-y-scroll">
                  {/* <a
                      href={`https://gelbooru.com/index.php?page=post&s=view&id=${post.id}`}
                    >
                      <Avatar>
                        {post.website === "danbooru" && (
                          <div>
                            <AvatarImage src="https://danbooru.donmai.us/favicon.ico" />
                            <AvatarFallback>VC</AvatarFallback>
                          </div>
                        )}
                        {post.website === "gelbooru" && (
                          <div>
                            <AvatarImage src="https://s3.castbox.fm/b3/8b/3c/bd12ac46fa93f1da0c8c0f2c20.jpg" />
                            <AvatarFallback>VC</AvatarFallback>
                          </div>
                        )}
                      </Avatar>
                    </a> */}{" "}
                  <div className="flex flex-col items-center justify-center ">
                    <p className="text-sm text-muted-foreground">
                      {post.width} x {post.height}
                    </p>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold"></h4>
                      <p className="text-sm ">
                        {sortByImportant(post.tags.split(" ")).map(
                          (tag, index) => (
                            <Badge
                              key={index}
                              style={{
                                backgroundColor: `${calculateColour(tag)}`,
                              }}
                              className={`m-1 text-white`}
                            >
                              {tag.name}
                            </Badge>
                          )
                        )}
                      </p>
                    </div>
                    {/* <div className="flex flex-col justify-center items-center pt-2">
                       <div className="flex flex-row justify-center items-center">
                          <CalendarDays className="mr-2 h-4 w-4 opacity-70" />{" "}
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toString()}
                          </span>
                        </div>
                    </div> */}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }
        })}
      </div>

      {gallery.length > itemsPerPage && (
        <div className="pt-2 flex flex-row items-center justify-center">
          <Pagination>
            <PaginationContent>{renderPaginationItems()}</PaginationContent>
          </Pagination>
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="pl-2"
          >
            {Array.from({ length: totalPages }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* <div className="w-20">
          <Listbox
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e))}
          >
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                <span className="block truncate">{currentPage}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute mt-1 max-h-48 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <Listbox.Option
                      key={index + 1}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active
                            ? "bg-amber-100 text-amber-900"
                            : "text-gray-900"
                        }`
                      }
                      value={index + 1}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? "font-medium" : "font-normal"
                            }`}
                          >
                            {index + 1}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox> 
        </div>*/}
    </div>
  );
};
export default GridGalleryTwo;
