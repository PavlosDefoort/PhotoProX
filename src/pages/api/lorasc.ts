import type { NextApiRequest, NextApiResponse } from "next";

const A1111_URL = "http://127.0.0.1:7860";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(`${A1111_URL}/sdapi/v1/lorasc`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `A1111 API error: ${response.statusText}`,
        details: errorText,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      loras: Array.isArray(data?.loras) ? data.loras : [],
    });
  } catch (error) {
    console.error("LoRA list proxy error:", error);
    return res.status(500).json({
      error: "Failed to fetch LoRAs",
      details: (error as Error).message,
    });
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};
