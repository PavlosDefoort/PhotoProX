import { Post } from "./galleryInterfaces";

const tags = require("./tags.json");

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

export const downloadImage = async (image: Post) => {
  const response = await fetch("http://127.0.0.1:5000/get_image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: image.file_url }),
  });
  const data = await response.json();
  const imageBase64 = data.image_base64;
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/png" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${image.id}.png`;
  link.click();
};

export const fetchTags = async (
  image: Post,
  useAI: boolean,
  website: string,
  setValue: (value: Tag[]) => void
) => {
  if (useAI) {
    let useImage;
    if (website === "danbooru" || website === "gelbooru") {
      // Convert image from url to base64

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
    // Split the tags into an array
    const tagList = data.caption.split(", ");

    // Add underscores to any tags whose name contains a space, some may have multiple words
    tagList.forEach((tag: string, index: number) => {
      if (tag.includes(" ")) {
        tagList[index] = tag.replace(/ /g, "_");
      }
    });

    // Interorate and find the matching tag in the tags.json file
    const tagListObjects = tagList.map((tag: string) => {
      const tagObject = tags.tags.find((t: Tag) => t.name === tag);
      return tagObject;
    });
    const filteredTags = tagListObjects.filter((tag: Tag) => tag !== undefined);
    setValue(filteredTags as Tag[]);
  } else {
    const tagList = image.tags;

    const tagListObjects = tagList.split(" ").map((tag: string) => {
      const tagObject = tags.tags.find((t: Tag) => t.name === tag);
      return tagObject;
    });
    const filteredTags = tagListObjects.filter(
      (tag: Tag | undefined) => tag !== undefined
    );
    setValue(filteredTags as Tag[]);
  }
};

export const fetchScout = async (
  tags: string[],
  blackList: string[],
  rating: string,
  website: string[],
  setValue: React.Dispatch<React.SetStateAction<Post[]>>
) => {
  // Convert the tags array to a string

  const tagsString = tags.join(" ");
  // Put in the form tag1+tag2+tag3
  const addString = tagsString.replace(/ /g, "+");

  // Add the blacklist tags
  const blackListString = blackList.join(" ");
  // Put in the form -tag1 -tag2 -tag3
  const blackListAddString = blackListString.replace(/ /g, " -");

  // Combine the addString and blackListAddString
  const combinedString = addString + " -" + blackListAddString;
  combinedString;
  // Put in the form tag1, tag2, tag3
  const stringArr: string[] = [];
  stringArr.push(rating);

  const response = await fetch("http://127.0.0.1:5000/scout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      website: website,
      tags: combinedString,
      rating: JSON.stringify(stringArr),
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch image data");
  }
  let images;
  const data = await response.json();

  // Put all the images in an array

  const filteredPosts = data.filter((image: any) => {
    // Check if the 'tags' property exists and is not null
    if (image.tags && Array.isArray(image.tags)) {
      // If it exists and is an array, check if it includes "loli"
      return !image.tags.includes("loli");
    }
    // If the 'tags' property does not exist or is not an array, include the image
    return true;
  });
  setValue(filteredPosts);
  return filteredPosts;
};
