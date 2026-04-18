import { NextApiRequest, NextApiResponse } from "next";

export interface InpaintRequest {
  prompt: string;
  negative_prompt?: string;
  init_images: string[];
  mask: string;
  width: number;
  height: number;
  steps?: number;
  cfg_scale?: number;
  denoising_strength?: number;
  sampler_name?: string;
  seed?: number;
}

export interface InpaintResponse {
  images: string[];
  parameters: Record<string, unknown>;
  info: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Log request without huge base64 strings
  const { init_images, mask, ...loggableBody } = req.body;
  console.log(
    "Inpaint request:",
    JSON.stringify(
      {
        ...loggableBody,
        init_images: init_images
          ? `[${init_images.length} image(s), first ${
              init_images[0]?.length || 0
            } chars]`
          : undefined,
        mask: mask ? `[${mask.length} chars]` : undefined,
      },
      null,
      2,
    ),
  );

  try {
    const {
      prompt,
      negative_prompt = "",
      init_images,
      mask,
      width,
      height,
      steps = 20,
      cfg_scale = 7,
      denoising_strength = 0.75,
      sampler_name = "Euler",
      seed = -1,
    }: InpaintRequest = req.body;

    if (!init_images || !mask) {
      return res
        .status(400)
        .json({ error: "Missing required fields: init_images and mask" });
    }

    // Strip data URL prefix if present
    const cleanImage = (img: string) =>
      img.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const payload = {
      prompt,
      negative_prompt,
      init_images: init_images.map(cleanImage),
      mask: cleanImage(mask),
      width,
      height,
      steps,
      cfg_scale,
      denoising_strength,
      sampler_name,
      seed,
      resize_mode: 0,
      inpainting_fill: 1, // 0: fill, 1: original, 2: latent noise, 3: latent nothing
      inpaint_full_res: false,
      inpaint_full_res_padding: 32,
      inpainting_mask_invert: 0,
      mask_blur: 4,
    };

    const response = await fetch("http://127.0.0.1:7860/sdapi/v1/img2img", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("A1111 API error:", errorData);

      // Handle validation errors (422)
      if (response.status === 422 && errorData?.detail) {
        const errorMessages = errorData.detail
          .map(
            (d: { msg: string; loc: (string | number)[] }) =>
              `${d.loc.join(".")}: ${d.msg}`,
          )
          .join(", ");
        return res
          .status(422)
          .json({ error: `Validation error: ${errorMessages}` });
      }

      return res
        .status(response.status)
        .json({ error: "Failed to process inpainting request" });
    }

    const data: InpaintResponse = await response.json();

    console.log("A1111 response - images count:", data.images?.length);
    console.log("A1111 response - info:", data.info);
    console.log(
      "A1111 response - first image length:",
      data.images?.[0]?.length,
    );

    // Add data URL prefix back to the images
    const processedImages = data.images.map(
      (img) => `data:image/png;base64,${img}`,
    );

    return res.status(200).json({ images: processedImages, info: data.info });
  } catch (error) {
    console.error("Inpainting error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during inpainting" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
