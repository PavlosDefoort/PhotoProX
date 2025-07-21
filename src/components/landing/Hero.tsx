import { useTheme } from "@/hooks/useTheme";
import { handleSignIn } from "@/services/FireBase";
import GoogleColorIcon from "@/svg/GoogleColorIcon";
import PhotoProXDocsIcon from "@/svg/PhotoProXDocsIcon";
import { ImgComparisonSlider } from "@img-comparison-slider/react";
import Image from "next/image";
import Link from "next/link";
import "../../styles/animations.css";

export const Hero: React.FC = () => {
  const { darkMode } = useTheme();
  const checkeredLight =
    "repeating-conic-gradient(#808080 0% 25%, #ffffff 0% 50%) 50% / 20px 20px";
  const checkeredDark =
    "repeating-conic-gradient(#808080 0% 25%, #000000 0% 50%) 50% / 20px 20px";
  const currentCheck = darkMode ? checkeredDark : checkeredLight;
  return (
    <section className="animate-gradient-x text-gray-600 body-font  bg-gradient-to-r from-purple-300 to-rose-300 dark:from-[#000000] dark:to-[#434343]">
      <div className="animate-fade-right  animate-once container mx-auto flex px-5 py-24 md:flex-row flex-col items-center">
        <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center">
          <h1 className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-800 dark:text-white">
            Make Ordinary Photos{" "}
            <span className="text-color-change  font-bold">Extraordinary</span>
          </h1>
          <p className="mb-8 leading-relaxed text-black text-lg dark:text-white">
            Introducing PhotoProX, the ultimate free web based photo editing
            tool.
          </p>
          <div className="flex flex-row w-full md:justify-center justify-center items-center">
            <Link href="/editor">
              <button className="animate-bounce mb-6  text-white bg-indigo-500 border-0 py-2 px-6 focus:outline-none hover:bg-indigo-600 rounded text-lg">
                Start Editing
              </button>
            </Link>
          </div>

          <div className="flex lg:flex-row md:flex-col">
            <button
              className="bg-gray-100  dark:bg-black dark:text-slate-100 inline-flex py-3 px-5 rounded-lg items-center hover:bg-gray-200 focus:outline-none"
              onClick={() => handleSignIn()}
            >
              <GoogleColorIcon />

              <span className="ml-4 flex items-start flex-col leading-none">
                <span className="text-xs text-gray-600 mb-1 dark:text-slate-100">
                  SIGN IN WITH
                </span>
                <span className="title-font font-medium">Google</span>
              </span>
            </button>
            <Link href={"https://photoproxdocs.vercel.app/"} target="_blank">
              <button className="bg-gray-100 dark:bg-black dark:text-slate-100 inline-flex py-3 px-5 rounded-lg items-center lg:ml-4 md:ml-0 ml-4 md:mt-4 mt-0 lg:mt-0 hover:bg-gray-200 focus:outline-none">
                <PhotoProXDocsIcon />
                <span className="ml-4 flex items-start flex-col leading-none">
                  <span className="text-xs text-gray-600 mb-1 dark:text-slate-100">
                    Check Out
                  </span>
                  <span className="title-font font-medium">PhotoProX-Docs</span>
                </span>
              </button>
            </Link>
          </div>
        </div>
        <div className="lg:max-w-xl lg:w-full md:w-1/2 w-5/6 ">
          <ImgComparisonSlider
            className=""
            style={{
              background: currentCheck,
            }}
          >
            <figure slot="first" className="relative">
              <Image
                src="/landing/model_before.webp"
                alt="Model"
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: "100%", height: "auto" }} // optional
              />
              <figcaption className="text-sm text-black font-semibold absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#111111] dark:text-slate-200 bg-opacity-70 dark:bg-opacity-70 z-10">
                Try out our new AI background removal feature!
              </figcaption>
            </figure>
            <figure slot="second" className="relative">
              <Image
                src="/landing/model_after.webp"
                alt="Model"
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: "100%", height: "auto" }} // optional
              />
              <figcaption className="text-sm text-black font-semibold absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#111111] dark:text-slate-200 bg-opacity-70 dark:bg-opacity-70 z-10">
                Try out our new AI background removal feature!
              </figcaption>
            </figure>
          </ImgComparisonSlider>
        </div>
      </div>
    </section>
  );
};
