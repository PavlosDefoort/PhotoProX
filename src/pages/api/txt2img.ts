import type { NextApiRequest, NextApiResponse } from "next";

const A1111_BASE_URL = "http://127.0.0.1:7860";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      prompt,
      negative_prompt,
      seed = -1,
      sampler_name = "Euler a",
      steps = 20,
      cfg_scale = 7,
      width = 512,
      height = 512,
      enable_hr = false,
      hr_scale = 2,
      hr_upscaler = "Latent",
      hr_second_pass_steps = 0,
      hr_resize_x = 0,
      hr_resize_y = 0,
      denoising_strength = 0.7,
    } = req.body;

    const payload = {
      prompt,
      negative_prompt,
      seed,
      sampler_name,
      steps,
      cfg_scale,
      width,
      height,
      enable_hr,
      hr_scale,
      hr_upscaler,
      hr_second_pass_steps,
      hr_resize_x,
      hr_resize_y,
      denoising_strength: enable_hr ? denoising_strength : 0,
      batch_size: 1,
      n_iter: 1,
      send_images: true,
      save_images: false,
    };

    console.log("Sending txt2img request to A1111:", {
      ...payload,
      prompt: payload.prompt?.substring(0, 50) + "...",
    });

    const response = await fetch(`${A1111_BASE_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("A1111 txt2img error:", errorText);
      return res.status(response.status).json({
        error: `A1111 API error: ${response.statusText}`,
        details: errorText,
      });
    }

    const data = await response.json();
    console.log("txt2img response received, images:", data.images?.length);

    // Return the base64 images directly
    return res.status(200).json({
      images: data.images,
      parameters: data.parameters,
      info: data.info,
    });
  } catch (error) {
    console.error("txt2img proxy error:", error);
    return res.status(500).json({
      error: "Failed to connect to A1111",
      details: (error as Error).message,
    });
  }
}
