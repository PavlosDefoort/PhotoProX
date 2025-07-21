import React from "react";
import { samples } from "./SampleData";
import { ImageSlider } from "../ImageSlider";

export const Samples: React.FC = () => {
  return (
    <section className="text-gray-600 body-font dark:bg-[#111111] dark:text-white">
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        <div className="flex w-full mb-20 flex-wrap">
          <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 dark:text-white lg:w-1/3 lg:mb-0 mb-4">
            Enjoy some sample images
          </h1>
          <p className="lg:pl-6 lg:w-2/3 mx-auto leading-relaxed text-base">
            Here are some sample images that have been edited with PhotoProX.
          </p>
        </div>
        <div className="flex flex-wrap md:-m-2 -m-1">
          <div className="flex flex-wrap w-full">
            {samples.map((sample, index) => (
              <div key={index} className="md:p-2 p-1 w-1/3 relative">
                <ImageSlider
                  after={sample.after}
                  before={sample.before}
                  startValue={sample.startValue}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
