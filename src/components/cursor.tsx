import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AnimatedCursor = dynamic(() => import("react-animated-cursor"), {
  ssr: false,
});

const MyCursor = () => {
  const [cursorColor, setCursorColor] = useState("0, 0, 0");

  // useEffect(() => {
  //   const handleMouseMove = (event: MouseEvent) => {
  //     const { x, y } = event;
  //     const element = document.elementFromPoint(x, y);
  //     const computedStyle = getComputedStyle(element as Element);
  //     const backgroundColor = computedStyle.backgroundColor;
  //     console.log(backgroundColor);

  //     // Logic to determine the cursor color based on the background color
  //     if (isDarkColor(backgroundColor)) {
  //       setCursorColor("0, 0, 0"); // Black color for dark backgrounds
  //     } else {
  //       setCursorColor("255, 255, 255"); // White color for light backgrounds
  //     }
  //   };

  //   document.addEventListener("mousemove", handleMouseMove);

  //   return () => {
  //     document.removeEventListener("mousemove", handleMouseMove);
  //   };
  // }, []);

  // Function to check if a color is considered dark
  const isDarkColor = (color: string) => {
    const hex = color.replace("#", "");
    const rgb = parseInt(hex, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma < 128;
  };

  return (
    <AnimatedCursor
      innerSize={15}
      outerSize={15}
      color={cursorColor}
      outerAlpha={0.4}
      innerScale={0.7}
      outerScale={3}
    />
  );
};

export default MyCursor;
