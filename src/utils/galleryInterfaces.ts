export type Tag = {
  id: number;
  name: string;
  post_count: number;
  category: number;
  created_at: string;
  updated_at: string;
  is_deprecated: boolean;
  words: string[];
};

export type Post = {
  file_url: string;
  preview_url: string;
  rating: string;
  tags: string;
  width: number;
  height: number;
  created_at: string;
  source: string;
  id: number;
  website: string;
};

export class GallerySettings {
  public rating: string = "general";
  public website: string[] = ["safebooru"];
  public showPopups: boolean = true;
  public showAI: boolean = true;
  public enableNSFWMode: boolean = false;
  public persistentTags: string[] = [];
  public favoriteTags: string[] = ["one_piece"];
  public blacklistedTags: string[] = ["yaoi"];
}

const tags: {
  tags: Tag[];
} = require("./tags.json");

export const sortByImportant = (postTags: string[]) => {
  // Find the matching tag in the tag json
  const matchingTags = tags.tags.filter((tag) => postTags.includes(tag.name));
  // Sort the tags by the post count
  matchingTags.sort((a, b) => b.post_count - a.post_count);

  // Sort .categories: series first (3), then characters (4), then artists (1), then technical (5), then general (0)
  const categoryOrder = [3, 4, 1, 5, 0];

  // Sort by categories
  matchingTags.sort((a, b) => {
    return (
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    );
  });
  return matchingTags;
};

export const createImageNameFromTags = (tags: string) => {
  // Image name criteria: Use any character tags, use first 5 most popular general tags, max character length of 50
  const important = sortByImportant(tags.split(" "));
  const characterTags = important.filter((tag) => tag.category === 4);
  const generalTags = important.filter((tag) => tag.category === 0);
  // Take the first 5 general tags with the highest post count
  const generalTagsSlice = generalTags.slice(0, 5);
  // Create the image name
  let imageName = "";
  characterTags.forEach((tag) => {
    imageName += tag.name + " ";
  });
  generalTagsSlice.forEach((tag) => {
    imageName += tag.name + " ";
  });
  // Remove any special characters
  imageName = imageName.replace(/[^a-zA-Z0-9 ]/g, "");
  // Remove any extra spaces
  imageName = imageName.replace(/\s+/g, " ");
  // Remove any leading or trailing spaces
  imageName = imageName.trim();
  // Replace spaces with underscores
  imageName = imageName.replace(/ /g, "_");
  // Limit to 30 characters
  imageName = imageName.substring(0, 30);
  return imageName;
};
