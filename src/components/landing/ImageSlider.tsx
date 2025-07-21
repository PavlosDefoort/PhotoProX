import { ImgComparisonSlider } from "@img-comparison-slider/react";
import Image from "next/image";
import { useState } from "react";
import { ImageInstance } from "./samples/SampleData";

interface ImageSliderProps {
  before: ImageInstance;
  after: ImageInstance;
  startValue: number;
}

export const ImageSlider: React.FC<ImageSliderProps> = ({
  before,
  after,
  startValue,
}) => {
  const [sliderValue, setSliderValue] = useState(startValue);

  return (
    <div className="w-full h-full">
      <ImgComparisonSlider
        value={sliderValue}
        onSlide={(event) => setSliderValue(Number(event.target.value))}
        className=""
        style={{
          background:
            "repeating-conic-gradient(#808080 0% 25%, #ffffff 0% 50%) 50% / 20px 20px",
        }}
      >
        <figure slot="first" className="relative">
          <Image
            src={`/landing/${before.name}.webp`}
            alt={before.alt}
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: "100%", height: "auto" }}
          />
          {sliderValue > 30 && (
            <figcaption className="text-sm text-slate-100 font-semibold absolute bottom-0 left-0 right-0 p-4  dark:text-slate-200 bg-opacity-50 dark:bg-opacity-50 z-10">
              Before
            </figcaption>
          )}
        </figure>
        <figure slot="second" className="relative">
          <Image
            src={`/landing/${after.name}.webp`}
            alt={after.alt}
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: "100%", height: "auto" }}
          />
          {sliderValue < 30 && (
            <figcaption className="text-sm text-slate-100 font-semibold absolute bottom-0 left-0 right-0 p-4  dark:text-slate-200 bg-opacity-50 dark:bg-opacity-50 z-10">
              After
            </figcaption>
          )}
        </figure>
      </ImgComparisonSlider>
    </div>
  );
};
