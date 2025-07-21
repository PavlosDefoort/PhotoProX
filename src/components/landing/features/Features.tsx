import Link from "next/link";
import { features } from "./FeaturesData";

export const Features: React.FC = () => {
  return (
    <section className="text-gray-600 body-font bg-gradient-to-r from-neutral-50 to-gray-50 dark:from-[#111111] dark:to-black">
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap w-full mb-20 flex-col items-center text-center">
          <h1 className="sm:text-3xl text-2xl font-medium title-font mb-2 text-gray-900 dark:text-zinc-100">
            Features
          </h1>
          <p className="lg:w-1/2 w-full leading-relaxed text-gray-500 dark:text-zinc-200">
            PhotoProX comes equipped with a variety of features to help you
            create stunning images.
          </p>
        </div>
        <div className="flex flex-wrap -m-4 dark:text-slate-400">
          {features.map((feature, index) => (
            <div key={index} className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 dark:text-indigo-100 dark:bg-indigo-500 mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg text-gray-900 font-semibold title-font mb-2 dark:text-white">
                  {feature.title}
                </h2>
                <p className="leading-relaxed text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Link href={"/editor"}>
          <button className="flex mx-auto mt-16 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg">
            Get Started
          </button>
        </Link>
      </div>
    </section>
  );
};
