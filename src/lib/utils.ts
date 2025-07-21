import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Poppins } from "next/font/google";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400"],
  style: "normal",
});
export function cn(...inputs: ClassValue[]) {
  // Add poppins.className to the inputs
  inputs.push(poppins.className);

  return twMerge(clsx(inputs));
}
