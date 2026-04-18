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
    const response = await fetch(
      `${A1111_URL}/sdapi/v1/progress?skip_current_image=true`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`A1111 API error: ${response.status}`);
    }

    const data = await response.json();

    return res.status(200).json({
      progress: data.progress, // 0-1
      eta: data.eta_relative,
      state: data.state,
      textinfo: data.textinfo,
    });
  } catch (error) {
    console.error("Progress API error:", error);
    return res.status(500).json({
      error: "Failed to get progress",
      details: (error as Error).message,
    });
  }
}
