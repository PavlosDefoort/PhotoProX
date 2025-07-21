import Decimal from "decimal.js";
import { AnalysisData } from "@/interfaces/types/AdjustmentTypes";

export function calculateAspectRatio(width: number, height: number): string {
  // Function to calculate the Greatest Common Divisor (GCD) using Euclid's algorithm
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // Calculate the GCD of width and height
  const gcdValue = gcd(width, height);

  // Simplify the width and height by dividing by the GCD
  const aspectWidth = width / gcdValue;
  const aspectHeight = height / gcdValue;

  // Return the simplified ratio as a string
  return `${aspectWidth}:${aspectHeight}`;
}

export function roundToDecimalPlaces(value: number, decimalPlaces: number) {
  return (
    Math.round(value * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  );
}

export function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function widthRotate(
  width: number,
  height: number,
  rotateValue: number
) {
  const newWidth =
    Math.abs(width * Math.cos((rotateValue * Math.PI) / 180)) +
    Math.abs(height * Math.sin((rotateValue * Math.PI) / 180));
  return newWidth;
}

export function heightRotate(
  width: number,
  height: number,
  rotateValue: number
) {
  const newHeight =
    Math.abs(width * Math.sin((rotateValue * Math.PI) / 180)) +
    Math.abs(height * Math.cos((rotateValue * Math.PI) / 180));
  return newHeight;
}

export function calculateScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  maxArea = 4096 * 4096
) {
  const aspectRatio = originalWidth / originalHeight;
  const area = originalWidth * originalHeight;
  if (area <= maxArea) {
    return { width: originalWidth, height: originalHeight };
  } else {
    // Calculate new dimensions, keeping aspect ratio and area <= maxArea

    const newHeight = Math.floor(Math.sqrt(maxArea / aspectRatio));
    const newWidth = Math.floor(aspectRatio * newHeight);

    return { width: newWidth, height: newHeight };
  }
}

export function calculateMaxDimensions(
  width: number,
  height: number,
  maxArea = 4096 * 4096
) {
  const aspectRatio = width / height;
  const newHeight = Math.floor(Math.sqrt(maxArea / aspectRatio));
  const newWidth = Math.floor(aspectRatio * newHeight);

  return { width: newWidth, height: newHeight };
}

export function calculateMaxScale(width: number, height: number) {
  const maxWidth = calculateMaxDimensions(width, height).width;
  const maxScale = maxWidth / width;
  // Round scale to 2 decimal places
  const maxScaleRounded = Math.round(maxScale * 100) / 100;

  return maxScaleRounded;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateZoomPan(
  deltaY: number,
  deltaX: number,
  newScaleFactorX: number,
  newScaleFactorY: number,
  fakeX: number,
  fakeY: number,
  zoomX: number,
  zoomY: number,
  maxHorizontalOffset: number,
  maxVerticalOffset: number
) {
  if (deltaY !== 0) {
    // Zoom vertically
    if (zoomY > 0) {
      // Taking min of positive values
      newScaleFactorY = Math.min(
        fakeY + zoomY,
        maxVerticalOffset !== 0 ? maxVerticalOffset + 100 : maxVerticalOffset
      );
    } else {
      // Taking max of negative values
      newScaleFactorY = Math.max(
        fakeY + zoomY,
        -maxVerticalOffset !== 0 ? -maxVerticalOffset - 100 : -maxVerticalOffset
      );
    }
  } else if (deltaX !== 0) {
    // Pan horizontally
    if (zoomX > 0) {
      newScaleFactorX = Math.min(
        fakeX + zoomX,
        maxHorizontalOffset !== 0
          ? maxHorizontalOffset + 100
          : maxHorizontalOffset
      );
    } else {
      newScaleFactorX = Math.max(
        fakeX + zoomX,
        -maxHorizontalOffset !== 0
          ? -maxHorizontalOffset - 100
          : -maxHorizontalOffset
      );
    }
  }

  return { newScaleFactorX, newScaleFactorY };
}

export function fitImageToScreen(
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  rotateValue: number
) {
  const newWidth = widthRotate(width, height, rotateValue);
  const newHeight = heightRotate(width, height, rotateValue);

  const widthRatio = new Decimal(canvasWidth).dividedBy(newWidth).toNumber();
  const heightRatio = new Decimal(canvasHeight).dividedBy(newHeight).toNumber();

  const newScale = Decimal.min(widthRatio, heightRatio).toDecimalPlaces(2);

  return newScale.toNumber();
}

export function fillImageToScreen(
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  rotateValue: number
) {
  const widthRatio = canvasWidth / width;
  const heightRatio = canvasHeight / height;

  return Math.max(widthRatio, heightRatio);
}

export const calculateHueAngle = (red: number, green: number, blue: number) => {
  const hueAngle = Math.atan2(
    Math.sqrt(3) * (green - blue),
    2 * red - green - blue
  );

  let hueDegrees = hueAngle * (180 / Math.PI);

  // Round to the nearest whole number
  hueDegrees = Math.round(hueDegrees);

  return -hueDegrees;
};

/**
 * Calculates the relative luminance of a color based on its RGB values.
 * @param red - The red component of the color (0-255).
 * @param green - The green component of the color (0-255).
 * @param blue - The blue component of the color (0-255).
 * @returns The relative luminance of the color.
 */
const calculateRelativeLuminance = (
  red: number,
  green: number,
  blue: number
) => {
  const relativeLuminance = 0.3 * red + 0.59 * green + 0.11 * blue;
  return relativeLuminance;
};

export function takeSamples(
  arr: Uint8Array,
  sampleSize: number
): [number[], number[]] {
  // Sort the luminance values
  const sortedArr = sortIntensityArray(arr);

  // Find the minimum and maximum values
  const min = sortedArr[0];
  const max = sortedArr[arr.length - 1];

  // Calculate the bin width
  const binWidth = (max - min) / sampleSize;

  // Initialize arrays to store bin edges and frequencies
  const binEdges: number[] = [];
  const frequencies: number[] = [];

  // Initialize variables to track current bin
  let currentBinStart = min;
  let currentBinEnd = min + binWidth;
  let currentFrequency = 0;

  // Iterate through sorted luminance values
  for (const value of sortedArr) {
    // If the value is within the current bin, increment frequency
    if (value >= currentBinStart && value < currentBinEnd) {
      currentFrequency++;
    } else {
      // If the value is outside the current bin, store the bin edge and frequency,
      // and move to the next bin
      binEdges.push(currentBinStart);
      frequencies.push(currentFrequency);

      currentBinStart = currentBinEnd;
      currentBinEnd += binWidth;
      currentFrequency = 1; // Start counting frequency for new bin
    }
  }

  // Store the last bin edge and frequency
  binEdges.push(currentBinStart);
  frequencies.push(currentFrequency);

  // Convert the bin edges and frequencies to Uint8Arrays

  return [binEdges, frequencies];
}

export function takeMultipleSamples(
  analysis: AnalysisData,
  sampleSize: number,
  properties: (keyof AnalysisData)[]
): Record<string, [number[], number[]]> {
  const samples: Record<string, [number[], number[]]> = {};

  properties.forEach((property) => {
    samples[property] = takeSamples(analysis[property], sampleSize);
  });

  return samples;
}

export function convertFloat32ArrayToNumberArray(
  float32Array: Float32Array
): number[] {
  // Convert the Float32Array to a regular array of numbers
  const numberArray = Array.from(float32Array);

  // Convert each number to an integer using Math.floor()
  return numberArray.map((num) => Math.floor(num));
}

/**
 * Sorts the luminance array from lowest to highest using Merge Sort algorithm.
 *
 * @param luminanceValues - The array of luminance values.
 * @returns The sorted array of luminance values.
 */
export function sortIntensityArray(luminanceValues: Uint8Array): Uint8Array {
  mergeSort(luminanceValues, 0, luminanceValues.length - 1);
  return luminanceValues;
}

function mergeSort(arr: Uint8Array, left: number, right: number) {
  if (left >= right) return;

  const mid = left + Math.floor((right - left) / 2);

  // Use insertion sort for small subarrays
  if (right - left <= 10) {
    insertionSort(arr, left, right);
    return;
  }

  mergeSort(arr, left, mid);
  mergeSort(arr, mid + 1, right);

  merge(arr, left, mid, right);
}

function merge(arr: Uint8Array, left: number, mid: number, right: number) {
  const temp = new Uint8Array(right - left + 1);
  let i = left,
    j = mid + 1,
    k = 0;

  while (i <= mid && j <= right) {
    if (arr[i] <= arr[j]) {
      temp[k++] = arr[i++];
    } else {
      temp[k++] = arr[j++];
    }
  }

  while (i <= mid) {
    temp[k++] = arr[i++];
  }

  while (j <= right) {
    temp[k++] = arr[j++];
  }

  for (let l = 0; l < temp.length; l++) {
    arr[left + l] = temp[l];
  }
}

function insertionSort(arr: Uint8Array, left: number, right: number) {
  for (let i = left + 1; i <= right; i++) {
    const key = arr[i];
    let j = i - 1;

    while (j >= left && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }

    arr[j + 1] = key;
  }
}

/**
 * Analyzes the luminance values of an image.
 *
 * @param imageData - The image data as a Uint8Array.
 * @returns An array of luminance values.
 */
export const analyseImageLuminance = (imageData: Uint8Array) => {
  const luminanceValues = new Float32Array(imageData.length / 4);
  let luminanceIndex = 0;

  for (let i = 0; i < imageData.length; i += 16) {
    const red1 = imageData[i];
    const green1 = imageData[i + 1];
    const blue1 = imageData[i + 2];
    const luminance1 = calculateRelativeLuminance(red1, green1, blue1);
    luminanceValues[luminanceIndex++] = luminance1;

    const red2 = imageData[i + 4];
    const green2 = imageData[i + 5];
    const blue2 = imageData[i + 6];
    const luminance2 = calculateRelativeLuminance(red2, green2, blue2);
    luminanceValues[luminanceIndex++] = luminance2;

    const red3 = imageData[i + 8];
    const green3 = imageData[i + 9];
    const blue3 = imageData[i + 10];
    const luminance3 = calculateRelativeLuminance(red3, green3, blue3);
    luminanceValues[luminanceIndex++] = luminance3;

    const red4 = imageData[i + 12];
    const green4 = imageData[i + 13];
    const blue4 = imageData[i + 14];
    const luminance4 = calculateRelativeLuminance(red4, green4, blue4);
    luminanceValues[luminanceIndex++] = luminance4;
  }

  return luminanceValues;
};

export const analyseImageRedIntensities = (imageData: Uint8Array) => {
  const redIntensities = new Float32Array(imageData.length / 4);
  let redIndex = 0;

  for (let i = 0; i < imageData.length; i += 16) {
    const red1 = imageData[i];
    redIntensities[redIndex++] = red1;

    const red2 = imageData[i + 4];
    redIntensities[redIndex++] = red2;

    const red3 = imageData[i + 8];
    redIntensities[redIndex++] = red3;

    const red4 = imageData[i + 12];
    redIntensities[redIndex++] = red4;
  }

  return redIntensities;
};

export const analyseImageGreenIntensities = (imageData: Uint8Array) => {
  const greenIntensities = new Float32Array(imageData.length / 4);
  let greenIndex = 0;

  for (let i = 0; i < imageData.length; i += 16) {
    const green1 = imageData[i + 1];
    greenIntensities[greenIndex++] = green1;

    const green2 = imageData[i + 5];
    greenIntensities[greenIndex++] = green2;

    const green3 = imageData[i + 9];
    greenIntensities[greenIndex++] = green3;

    const green4 = imageData[i + 13];
    greenIntensities[greenIndex++] = green4;
  }

  return greenIntensities;
};

export const analyseEverything = (imageData: Uint8Array) => {
  const numPixels = imageData.length / 4;

  // Choosing to use a Uint8Array for the result to save memory, and since the bins will be integers
  const result = {
    luminance: new Uint8Array(numPixels),
    red: new Uint8Array(numPixels),
    green: new Uint8Array(numPixels),
    blue: new Uint8Array(numPixels),
    alpha: new Uint8Array(numPixels),
  };

  let resultIndex = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const red = imageData[i];
    const green = imageData[i + 1];
    const blue = imageData[i + 2];
    const alpha = imageData[i + 3];

    const relativeLuminance = 0.3 * red + 0.59 * green + 0.11 * blue;

    result.red[resultIndex] = red;
    result.green[resultIndex] = green;
    result.blue[resultIndex] = blue;
    result.alpha[resultIndex] = alpha;
    result.luminance[resultIndex] = relativeLuminance;

    resultIndex++;
  }

  return result;
};

export const analyseImageBlueIntensities = (imageData: Uint8Array) => {
  const blueIntensities = new Float32Array(imageData.length / 4);
  let blueIndex = 0;

  for (let i = 0; i < imageData.length; i += 16) {
    const blue1 = imageData[i + 2];
    blueIntensities[blueIndex++] = blue1;

    const blue2 = imageData[i + 6];
    blueIntensities[blueIndex++] = blue2;

    const blue3 = imageData[i + 10];
    blueIntensities[blueIndex++] = blue3;

    const blue4 = imageData[i + 14];
    blueIntensities[blueIndex++] = blue4;
  }

  return blueIntensities;
};

export const analyseAlphaValues = (imageData: Uint8Array) => {
  const alphaValues = new Float32Array(imageData.length / 4);
  let alphaIndex = 0;

  for (let i = 3; i < imageData.length; i += 16) {
    const alpha1 = imageData[i];
    alphaValues[alphaIndex++] = alpha1;

    const alpha2 = imageData[i + 4];
    alphaValues[alphaIndex++] = alpha2;

    const alpha3 = imageData[i + 8];
    alphaValues[alphaIndex++] = alpha3;

    const alpha4 = imageData[i + 12];
    alphaValues[alphaIndex++] = alpha4;
  }

  return alphaValues;
};

export const combineIntensity = (imageData: Uint8Array) => {
  // Create a red, green, and blue intensity array
  const redIntensities = analyseImageRedIntensities(imageData);
  const greenIntensities = analyseImageGreenIntensities(imageData);
  const blueIntensities = analyseImageBlueIntensities(imageData);

  // Combine the red, green, and blue intensity arrays into a single array
  const combinedIntensities = new Float32Array(redIntensities.length * 3);
  let combinedIndex = 0;
  for (let i = 0; i < redIntensities.length; i++) {
    combinedIntensities[combinedIndex++] = redIntensities[i];
    combinedIntensities[combinedIndex++] = greenIntensities[i];
    combinedIntensities[combinedIndex++] = blueIntensities[i];
  }
  // Sort the combined intensity array

  return combinedIntensities;
};

export const convertPixelsToInches = (pixels: number, ppi: number) => {
  // Round to the nearest hundredth of an inch
  return pixels / ppi;
};

export const convertInchesToPixels = (inches: number, ppi: number) => {
  // Return to the nearest pixel
  return inches * ppi;
};

export const convertPPItoPPCM = (ppi: number) => {
  return ppi / 2.54;
};

export const convertPPCMtoPPI = (ppcm: number) => {
  return ppcm * 2.54;
};

export const convertPixelsToCentimeters = (pixels: number, ppcm: number) => {
  return pixels / ppcm;
};

export const convertMMtoPixels = (mm: number, ppi: number) => {
  return mm * (ppi / 25.4);
};

export const convertPixelsToMM = (pixels: number, ppi: number) => {
  return (pixels * 25.4) / ppi;
};

export const convertInchToMM = (inch: number) => {
  return inch * 25.4;
};

export const convertMMToInch = (mm: number) => {
  // Convert to the nearest hundredth of an inch
  return mm / 25.4;
};

export const convertFromTo = (
  to: string,
  from: string,
  width: number,
  height: number,
  ppi: number
): { width: number; height: number } => {
  if (to == "inch" && from == "px") {
    return {
      width: convertPixelsToInches(width, ppi),
      height: convertPixelsToInches(height, ppi),
    };
  } else if (to === "px" && from === "inch") {
    return {
      width: convertInchesToPixels(width, ppi),
      height: convertInchesToPixels(height, ppi),
    };
  } else if (to === "px" && from === "mm") {
    return {
      width: convertMMtoPixels(width, ppi),
      height: convertMMtoPixels(height, ppi),
    };
  } else if (to === "mm" && from === "px") {
    return {
      width: convertPixelsToMM(width, ppi),
      height: convertPixelsToMM(height, ppi),
    };
  } else if (to === "inch" && from === "mm") {
    return {
      width: convertMMToInch(width),
      height: convertMMToInch(height),
    };
  } else if (to === "mm" && from === "inch") {
    return {
      width: convertInchToMM(width),
      height: convertInchToMM(height),
    };
  } else {
    return { width: width, height: height };
  }
};

export function solveExponential(a: number, k: number, y: number): number {
  return Math.log(y / a) / k;
}
