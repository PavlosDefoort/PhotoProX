import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image: imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "No image URL provided" });
  }

  try {
    // Fetch the image from the provided URL
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    // Convert the response data (image buffer) to base64
    const imageBase64 = Buffer.from(response.data, "binary").toString("base64");

    // Return the base64 image string
    return res.status(200).json({ image_base64: imageBase64 });
  } catch (error) {
    console.error("Error processing image:", error);
    return res.status(500).json({ error: "Failed to process image" });
  }
}
