import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      imageSrc,
      model = "u2net",
      returnMask = false,
      alphaMatting = false,
      alphaMattingForegroundThreshold = 240,
      alphaMattingBackgroundThreshold = 10,
      alphaMattingErodeSize = 10,
    } = req.body ?? {};

    if (!imageSrc) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const cleanImage = String(imageSrc).replace(
      /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
      "",
    );

    const upstreamResponse = await fetch("http://127.0.0.1:7860/rembg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_image: cleanImage,
        model,
        return_mask: returnMask,
        alpha_matting: alphaMatting,
        alpha_matting_foreground_threshold: alphaMattingForegroundThreshold,
        alpha_matting_background_threshold: alphaMattingBackgroundThreshold,
        alpha_matting_erode_size: alphaMattingErodeSize,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return res.status(502).json({
        error: `A1111 rembg failed (${upstreamResponse.status}): ${
          errorText || upstreamResponse.statusText
        }`,
      });
    }

    const data = await upstreamResponse.json();
    const candidateResult =
      (typeof data === "string" ? data : undefined) ??
      data?.image ??
      data?.data ??
      data?.output_image ??
      data?.result?.image ??
      data?.result ??
      data?.images?.[0];

    if (typeof candidateResult !== "string" || candidateResult.length === 0) {
      return res
        .status(502)
        .json({ error: "A1111 rembg returned no image data" });
    }

    const dataUrl = candidateResult.startsWith("data:image")
      ? candidateResult
      : `data:image/png;base64,${candidateResult}`;

    res.status(200).json({ data: dataUrl });
  } catch (error) {
    console.error("rembg api error", error);
    res
      .status(500)
      .json({ error: "An error occurred while calling A1111 rembg" });
  }
}
