import { NextApiRequest, NextApiResponse } from "next";
import { removeBackground } from "@imgly/background-removal";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { imageSrc } = req.body;

    if (!imageSrc) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const result = await removeBackground(imageSrc);
    const buffer = Buffer.from(await result.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    res.status(200).json({ data: dataUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
}
