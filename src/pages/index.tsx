import Image from "next/image";
import { Inter } from "next/font/google";
import { Poppins } from "next/font/google";

import dynamic from "next/dynamic";
import { colors } from "@mui/material";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const AnimatedCursor = dynamic(() => import("react-animated-cursor"), {
  ssr: false,
});

export default function Home() {
  return (
    <main
      className={`z-0 bg-gradient-to-t from-[#f2709c] to-[#ff9472] flex flex-col min-h-screen items-center justify-center p-24 ${poppins.className}`}
    >
      <AnimatedCursor
        innerSize={15}
        outerSize={15}
        color="255, 255 ,255"
        outerAlpha={0.4}
        innerScale={0.7}
        outerScale={3}
      />

      <div className="animate-jump absolute top-0 right-0 mt-4 mr-14 flex ">
        <a href="https://github.com/PavlosDefoort/PhotoProX" className="pr-4">
          <svg
            className="w-6 h-6  text-gray-800 dark:text-white hover:animate-bounce"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: "white" }}
          >
            <path
              fill-rule="evenodd"
              d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z"
              clip-rule="evenodd"
            />
          </svg>
        </a>
        <a href="https://www.linkedin.com/in/pavlos-defoort-04a93b223/">
          <svg
            className="w-6 h-6 text-gray-800 dark:text-white hover:animate-bounce"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 15 15"
            style={{ color: "white" }}
          >
            <path
              fill-rule="evenodd"
              d="M7.979 5v1.586a3.5 3.5 0 0 1 3.082-1.574C14.3 5.012 15 7.03 15 9.655V15h-3v-4.738c0-1.13-.229-2.584-1.995-2.584-1.713 0-2.005 1.23-2.005 2.5V15H5.009V5h2.97ZM3 2.487a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
              clip-rule="evenodd"
            />
            <path d="M3 5.012H0V15h3V5.012Z" />
          </svg>
        </a>
      </div>

      <div className="animate-fade relative flex flex-col items-center justify-center text-center ">
        <h1 className=" text-7xl font-medium text-transparent bg-clip-text bg-gradient-to-t from-white to-teal-50 leading-tight">
          Introducing: PhotoProX
        </h1>
        <p className="pt-2 text-3xl text-white font-light ">
          Make <span style={{ color: "white" }}>Ordinary</span> Photos Look{" "}
          <span style={{ color: "white" }}>Extraordinary</span>
        </p>
        <Link href="/editor">
          <button
            type="button"
            className="mt-8  text-slate-200 hover:text-black border border-slate-200 hover:bg-slate-200 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800 hover:animate-jump"
          >
            Start Editing
          </button>
        </Link>
      </div>
      {/* <div
        className="absolute inset-x-0 -top-40 z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#eeebd9] to-[#ffcef6] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div> */}
      <footer className="animate-fade rounded-lg shadow  fixed bottom-0 left-0 w-full dark:bg-gray-800">
        <div className="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-center">
          <span className="text-sm text-gray-100 sm:text-center dark:text-gray-100">
            © 2023{" "}
            <Link href="/" className="hover:underline">
              PhotoProX
            </Link>
            . All Rights Reserved.
          </span>
        </div>
      </footer>
    </main>
  );
}
