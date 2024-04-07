import { NextApiRequest, NextApiResponse } from "next";

// pages/api/github.js
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const apiToken =
    "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";
  const repoOwner = "PavlosDefoort";
  const repoName = "PhotoProX";
  const branch = "main";
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=${branch}&per_page=1&page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    const linkHeader = response.headers.get("Link");
    const lastPageMatch = linkHeader
      ? linkHeader.match(/&page=(\d+)&.*?rel="last"/)
      : null;
    const totalCommits = lastPageMatch ? parseInt(lastPageMatch[1]) : 0;
    res.status(200).json({ totalCommits });
  } catch (error) {
    console.error("Error fetching commits:", error);
    res.status(500).json({ error: "Failed to fetch commits" });
  }
}
