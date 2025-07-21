import { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const {
      buffer,
      quality,
      format,
      palette,
      compression,
      width,
      height,
      resampler,
    } = req.body;

    if (!buffer || !format || !width || !height) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Decode the base64 string into a buffer
    const imageBuffer = Buffer.from(buffer, "base64");

    if (format === "jpeg") {
      // Process the image using Sharp
      const compressedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: "fill",
          kernel: resampler,
        })
        .jpeg({ quality: quality || 80 }) // Adjust as needed
        .toBuffer();

      // Encode the compressed image back to base64
      const compressedBase64 = compressedBuffer.toString("base64");

      res.status(200).json({ base64: compressedBase64 });
    } else if (format === "png") {
      // Process the image using Sharp
      const compressedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: "fill",
          kernel: resampler,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png({
          compressionLevel: compression,
          palette: palette,
          quality: palette ? quality : undefined,
        }) // Adjust as needed
        .toBuffer();

      // Encode the compressed image back to base64
      const compressedBase64 = compressedBuffer.toString("base64");

      res.status(200).json({ base64: compressedBase64 });
    } else if (format === "webp") {
      // Process the image using Sharp
      const compressedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: "fill",
          kernel: resampler,
        })
        .webp({ quality: quality || 80 }) // Adjust as needed
        .toBuffer();

      // Encode the compressed image back to base64
      const compressedBase64 = compressedBuffer.toString("base64");

      res.status(200).json({ base64: compressedBase64 });
    }
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Error processing image" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4.5mb", // Adjust based on your needs
    },
  },
};
