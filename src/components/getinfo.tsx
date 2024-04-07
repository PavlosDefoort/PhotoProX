import { getGPUTier, TierResult } from "detect-gpu";

export const GetInfo = async (): Promise<TierResult> => {
  try {
    const gpuTier = await getGPUTier();
    return gpuTier; // Return an object with the GPU tier info
  } catch (error) {
    // Handle errors if needed
    console.error(error);
    // Return a default or placeholder value if getGPUTier() fails
    // Define a placeholder tierresult
    const placeholderTierResult: TierResult = {
      device: "unknown",
      fps: 0,
      tier: 0,
      type: "BENCHMARK",
      gpu: "unknown",
      isMobile: false,
    };
    return placeholderTierResult;
  }
};
