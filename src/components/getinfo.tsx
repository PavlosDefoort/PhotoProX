import { getGPUTier } from "detect-gpu";
import { useEffect } from "react";

export const GetInfo = async (): Promise<Object> => {
  try {
    const gpuTier = await getGPUTier();
    return gpuTier; // Return an object with the GPU tier info
  } catch (error) {
    return {}; // Return empty object if getGPUTier() fails
  }
};
