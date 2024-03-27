import * as React from "react";
import Chip, { ChipProps } from "@mui/material/Chip";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { useState, useEffect } from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { PaletteOptions } from "@mui/material";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FixedSizeList as List } from "react-window";
import { Theme, width } from "@mui/system";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import GridGalleryTwo from "./offthegridTwo";
import { InputValueContext } from "../../../../../app/contexts";
import { set } from "lodash";
import { fetchScout } from "@/utils/calls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Post } from "@/utils/galleryInterfaces";

type post = {
  file_url: string;
  preview_url: string;
  rating: string;
  tags: string;
  title: string;
  width: number;
  height: number;
  created_at: string;
  source: string;
  id: number;
  website: string;
};

interface TagsProps {
  setTags: (tags: string[]) => void;
  setApiImage: (image: string) => void;
  apiImage: string;
  scoutImages: Post[];
  website: string[];
  rating: string;
  setScoutImages: React.Dispatch<React.SetStateAction<Post[]>>;
  blackListedTags: string[];
}
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

const Tags: React.FC<TagsProps> = ({
  setTags,
  setApiImage,
  apiImage,
  scoutImages,
  website,
  rating,
  setScoutImages,
  blackListedTags,
}) => {
  type InputValueContextType = {
    inputValue: Tag[];
    setInputValue: React.Dispatch<React.SetStateAction<Tag[]>>;
  };
  const { inputValue, setInputValue } = React.useContext(
    InputValueContext
  ) as InputValueContextType;

  useEffect(() => {
    // When the inputValue changes, update the tags state
    setTags(inputValue.map((tag) => tag.name));
  }, [inputValue, setTags]);

  const handleInputChange = (event: any, value: Tag[], reason: string) => {
    event, value, reason;
    if (reason === "removeOption") {
      setHistory((prevHistory) => [...prevHistory, inputValue]);
    }
    setInputValue(value);
  };

  interface NewPaletteOptions extends PaletteOptions {
    artist?: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    series?: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    character?: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    technical?: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
  }

  interface NewTheme extends Theme {
    palette: NewPaletteOptions & {
      mode: "light" | "dark" | "main" | "contrastText";
    };
  }

  const tags: { tags: Tag[] } = require("../../../../utils/tags.json");

  const theme: NewTheme = createTheme({
    palette: {
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
    } as NewPaletteOptions,
  });

  const interrogate_image = (image: any, useAI = true, website: string) => {
    const fetchTags = async (image: any, useAI: boolean, website: string) => {
      if (useAI) {
        let useImage;
        if (website === "danbooru" || website === "gelbooru") {
          // Convert image from url to base64
          "image", image;
          const response = await fetch("http://127.0.0.1:5000/get_image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image: image.file_url }),
          });
          if (!response.ok) {
            throw new Error("Failed to fetch image data");
          } else {
            const data = await response.json();
            useImage = data.image_base64;
          }
        }
        const response = await fetch("http://127.0.0.1:5000/interrogate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: useImage }),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch image data");
        }
        const data = await response.json();
        "data", data;
        // Split the tags into an array
        const tagList = data.caption.split(", ");

        // Add underscores to any tags whose name contains a space, some may have multiple words
        tagList.forEach((tag: string, index: number) => {
          if (tag.includes(" ")) {
            tagList[index] = tag.replace(/ /g, "_");
          }
        });

        "tagList", tagList;

        // Interorate and find the matching tag in the tags.json file
        const tagListObjects = tagList.map((tag: string) => {
          const tagObject = tags.tags.find((t: Tag) => t.name === tag);
          "tagObject", tagObject;
          return tagObject;
        });
        const filteredTags = tagListObjects.filter(
          (tag: Tag) => tag !== undefined
        );
        setInputValue(filteredTags as Tag[]);
      } else {
        let tagList = "";
        if (website === "danbooru") {
          tagList = image.tag_string;
        } else if (website === "gelbooru") {
          tagList = image.tags;
        }

        const tagListObjects = tagList.split(" ").map((tag: string) => {
          const tagObject = tags.tags.find((t: Tag) => t.name === tag);
          "tagObject", tagObject;
          return tagObject;
        });
        const filteredTags = tagListObjects.filter(
          (tag: Tag | undefined) => tag !== undefined
        );
        setInputValue(filteredTags as Tag[]);
      }
    };
    if (!apiImage && !scoutImages.length) {
      return;
    } else {
      fetchTags(image, useAI, website);
    }
  };

  const getChipStyle = (option: Tag) => {
    let color: keyof NewPaletteOptions = "primary" as keyof NewPaletteOptions;
    switch (option.category) {
      case 1:
        color = "artist" as keyof NewPaletteOptions;
        break;
      case 3:
        color = "series" as keyof NewPaletteOptions;
        break;
      case 4:
        color = "character" as keyof NewPaletteOptions;
        break;
      case 5:
        color = "technical" as keyof NewPaletteOptions;
        break;
      default:
        break;
    }

    return { color };
  };

  const [history, setHistory] = useState<Tag[][]>([]);

  const handleDelete = (chipToDelete: Tag) => {
    setHistory((prevHistory) => [...prevHistory, inputValue]);
    setInputValue((chips) =>
      chips.filter((chip) => chip.id !== chipToDelete.id)
    );
  };

  const [filter, setFilter] = useState("");
  const filteredTags = React.useMemo(() => {
    return tags.tags.filter((tag: Tag) =>
      tag.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [tags, filter]);

  // Add this state variable
  const [deletedTags, setDeletedTags] = useState<Tag[]>([]);

  // Add this useEffect hook
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "z" && event.ctrlKey) {
        event.preventDefault();
        if (history.length > 0) {
          const lastState = history[history.length - 1];
          setInputValue(lastState);
          setHistory((prevHistory) => prevHistory.slice(0, -1));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [history, setInputValue]);

  const [filterMode, setFilterMode] = useState<number[]>([0, 1, 3, 4, 5]);

  useEffect(() => {
    "filterMode", scoutImages;
  }, [scoutImages]);

  const [inputValueTwo, setInputValueTwo] = useState<string>("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  const handleInputChangeTwo = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value.trim();
    setInputValueTwo(inputValue);
    "inputValue", inputValue;
    if (inputValue.length > 0) {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/tagSearch?query=${inputValue}`
        );
        const data = await response.json();
        // Create an array with all the tags
        const tags = data.map((tag: any) => tag.name);
        "tags", tags;
        setTagSuggestions(tags);
      } catch (error) {
        console.error("Error fetching tag suggestions:", error);
      }
    } else {
      setTagSuggestions([]);
    }
  };

  const findRandomArtistTag = () => {
    const artistTags = tags.tags.filter(
      (tag: Tag) =>
        tag.category === 1 &&
        tag.post_count > 100 &&
        tag.is_deprecated === false
    );
    "artistTags", artistTags;
    const randomArtistTag =
      artistTags[Math.floor(Math.random() * artistTags.length)];
    setInputValue([randomArtistTag]);
    fetchScout(
      [randomArtistTag.name],
      blackListedTags,
      rating,
      website,
      setScoutImages
    );
    return randomArtistTag;
  };

  const findRandomSeriesTag = () => {
    const seriesTags = tags.tags.filter(
      (tag: Tag) =>
        tag.category === 3 &&
        tag.post_count > 10000 &&
        tag.is_deprecated === false
    );
    "seriesTags", seriesTags;
    const randomSeriesTag =
      seriesTags[Math.floor(Math.random() * seriesTags.length)];
    setInputValue([randomSeriesTag]);
    fetchScout(
      [randomSeriesTag.name],
      blackListedTags,
      rating,
      website,
      setScoutImages
    );
    return randomSeriesTag;
  };
  const findRandomCharacterTag = () => {
    const characterTags = tags.tags.filter(
      (tag: Tag) =>
        tag.category === 4 &&
        tag.post_count > 1000 &&
        tag.is_deprecated === false
    );
    "characterTags", characterTags;
    const randomCharacterTag =
      characterTags[Math.floor(Math.random() * characterTags.length)];
    const newArray = [randomCharacterTag];
    const newNames = newArray.map((tag) => tag.name);
    setInputValue(newArray);
    fetchScout(newNames, blackListedTags, rating, website, setScoutImages);
    return randomCharacterTag;
  };

  const assignRandomTags = (numTags: number) => {
    const fetching = async (
      tags: string[],
      rating: string,
      website: string[],
      setValue: React.Dispatch<React.SetStateAction<Post[]>>
    ) => {
      const response = await fetchScout(
        tags,
        blackListedTags,
        rating,
        website,
        setValue
      );
      return response;
    };
    const availableTags = tags.tags.filter(
      (tag: Tag) =>
        ![1, 3, 5].includes(tag.category) &&
        tag.post_count > 200000 &&
        tag.is_deprecated === false
    );
    "availableTags", availableTags.length;
    const randomTags: Tag[] = [];

    // Ensure at least one character tag
    const characterTags = availableTags.filter(
      (tag: Tag) => tag.category !== 4
    );
    const randomCharacterTag =
      characterTags[Math.floor(Math.random() * characterTags.length)];
    randomTags.push(randomCharacterTag);

    // Assign additional random tags if needed
    while (randomTags.length < numTags) {
      const remainingTags = availableTags.filter(
        (tag: Tag) => !randomTags.includes(tag)
      );
      const randomTag =
        remainingTags[Math.floor(Math.random() * remainingTags.length)];
      randomTags.push(randomTag);
    }
    // Ensure that the tags lead to a valid search
    const randomNames = randomTags.map((tag) => tag.name);
    fetching(randomNames, rating, website, setScoutImages).then((data) => {
      if (data.length > 0) {
        setInputValue(randomTags);
      } else {
        assignRandomTags(numTags);
      }
    });
  };

  return (
    <div>
      <ThemeProvider theme={theme}>
        <div className="flex flex-row justify-center items-center">
          <Popover modal={true}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CasinoIcon />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Gallery Roulette</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-80 z-50">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Gallery Roulette</h4>
                  <p className="text-sm text-muted-foreground">
                    The odds are in your favor, or are they?
                  </p>
                </div>
                <div className="grid gap-2">
                  <Button
                    onClick={findRandomArtistTag}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <span className="text-sm">Artist</span>
                  </Button>

                  <Button
                    className="bg-pink-500 hover:bg-pink-600"
                    onClick={findRandomSeriesTag}
                  >
                    <span className="text-sm">Series</span>
                  </Button>

                  <Button
                    onClick={findRandomCharacterTag}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <span className="text-sm">Character</span>
                  </Button>

                  <Button
                    onClick={() => assignRandomTags(3)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <span className="text-sm">Random Search</span>
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div
            className={`ml-2 flex flex-col justify-center `}
            style={{
              width: 400,
              height: 70,

              overflowX: "auto",
              display: "flex",
              whiteSpace: "nowrap", // Prevent chips from wrapping to a new line
            }}
          >
            <Autocomplete
              onChange={(event, value, reason) =>
                handleInputChange(event, value, reason)
              }
              autoSave={"true"}
              autoComplete={true}
              autoFocus={true}
              autoHighlight={true}
              autoSelect={true}
              multiple
              renderOption={(props, option) => (
                <li {...props}>
                  <div
                    className={`${option.category === 0 && "bg-blue-100"} ${
                      option.category === 1 && "bg-red-100"
                    } 
                ${option.category === 3 && "bg-purple-100"}
                ${option.category === 4 && "bg-green-100"}
                ${option.category === 5 && "bg-orange-100"}`}
                  >
                    {option.name}
                  </div>
                </li>
              )}
              filterOptions={(options, state) => {
                const displayOptions = options.filter(
                  (option) =>
                    option.name
                      .toLowerCase()
                      .trim()
                      .includes(filter.toLowerCase().trim()) &&
                    filterMode.includes(option.category)
                );

                return displayOptions.slice(0, 400); // Set the maximum number of elements to 100
              }}
              id="tags-standard"
              options={tags.tags}
              value={inputValue}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  value={filter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilter(e.target.value)
                  }
                  label="Enter Tags"
                  placeholder="solo, 1girl, etc."
                  InputProps={{
                    ...params.InputProps,
                    style: {
                      wordSpacing: "10px",
                      overflowX: "hidden",
                      whiteSpace: "nowrap",
                      display: "flex",
                    },
                    startAdornment: inputValue.map((option) => (
                      <Chip
                        onDelete={() => handleDelete(option)}
                        key={option.id}
                        label={option.name}
                        sx={{
                          ml: 0.5,
                          my: 0.5,
                          padding: 0.5,
                          mr: 0.5,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        color={getChipStyle(option).color as ChipProps["color"]}
                      />
                    )),
                    // add some right padding to the input field
                  }}
                />
              )}
            />
          </div>

          {/* {scoutImages.length > 0 && (
          <>
            {scoutImages.map((image, index) => (
              <div key={index} className="flex flex-col space-y-4">
                <Button onClick={() => setApiImage(image)}>Save Image</Button>
                <Button onClick={() => interrogate_image(image, true, website)}>
                  Interrogate Image
                </Button>
                <Button
                  onClick={() => interrogate_image(image, false, website)}
                >
                  Use Image Tags
                </Button>
                <Image
                  key={index}
                  src={`/api/proxy?url=${encodeURIComponent(image.file_url)}`}
                  alt={image.id}
                  width={image.width}
                  height={image.height}
                />
              </div>
            ))}
          </>
        )} */}
        </div>
      </ThemeProvider>
    </div>
  );
};

export default Tags;
