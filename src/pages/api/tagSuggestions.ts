// pages/api/tagSuggestions.ts

import { NextApiRequest, NextApiResponse } from "next";

interface GelbooruTag {
  tag: string;
}

export default async function tagSuggestions(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { query } = req.query;
  console.log("query", query); // Ensure that the query value is logged

  try {
    const response = await fetch(
      `https://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=${query}*&limit=10&json=1`,
      {
        method: "GET",
        redirect: "follow",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.posts;
    // Extract the tags from the posts
    const tags = posts.map((post: any) => post.tags);
    // Flatten the array of arrays
    const flattenedTags = tags.flat();
    // Remove duplicates
    const uniqueTags = Array.from(new Set(flattenedTags));
    // Remove the query tag
    const filteredTags = uniqueTags.filter((tag) => tag !== query);
    // Return the first 10 tags
    const tagSuggestions = filteredTags.slice(0, 10);

    res.status(200).json(tagSuggestions);
  } catch (error) {
    console.error("Error fetching tag suggestions:", error);
    res.status(500).json({ error: "Error fetching tag suggestions" });
  }
}
