import { Inter } from "next/font/google";
import { Poppins } from "next/font/google";

import { colors } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { set } from "lodash";
import Tags from "@/components/Editor/PhotoEditor/UI/tagInput";
import "../styles/animations.css";
import MyCursor from "@/components/cursor";

const inter = Inter({ subsets: ["latin"] });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function Home() {
  return (
    <main className={`${poppins.className} `}>
      <header className="z-50 text-gray-600 body-font sticky top-0 bg-white shadow border-b  border-gray-500">
        <div className="container mx-auto flex flex-wrap p-2 flex-col md:flex-row items-center">
          <a className="flex title-font font-medium items-center text-gray-900 mb-4 md:mb-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              className="w-10 h-10 text-white p-2 bg-indigo-500 rounded-full"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-3 text-xl">PhotoProX</span>
          </a>
          <nav className="md:ml-auto md:mr-auto flex flex-wrap items-center text-base justify-center">
            <a className="mr-5 hover:text-gray-900">Features</a>

            <a className="mr-5 hover:text-gray-900">Pricing?</a>
            <a className="mr-5 hover:text-gray-900">Contact</a>
            <a className="mr-5 hover:text-gray-900">Learn</a>
          </nav>
          <Link href="/editor">
            <button className="inline-flex items-center bg-gray-100 border-0 py-1 px-3 focus:outline-none hover:bg-gray-200 rounded text-base mt-4 md:mt-0">
              Start Editing
              <svg
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                className="w-4 h-4 ml-1"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </button>
          </Link>
        </div>
      </header>
      <section className="animate-gradient-x text-gray-600 body-font  bg-gradient-to-r from-purple-300 to-rose-300">
        <div className="animate-fade-right  animate-once container mx-auto flex px-5 py-24 md:flex-row flex-col items-center">
          <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center">
            <h1 className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-800">
              Make Ordinary Photos{" "}
              <span className="text-color-change  font-bold">
                Extraordinary
              </span>
            </h1>
            <p className="mb-8 leading-relaxed text-black text-lg">
              Introducing PhotoProX, the ultimate free web based photo editing
              tool.
            </p>
            <div className="flex flex-row w-full md:justify-center justify-center items-center">
              {/* <div className="relative mr-4 md:w-full lg:w-full xl:w-1/2 w-2/4">
                <label className="leading-7 text-sm text-gray-600">
                  Generative Fill Demo
                </label>
                <input
                  type="text"
                  id="hero-field"
                  name="hero-field"
                  className="w-full bg-white rounded border bg-opacity-80 border-gray-300 focus:ring-2 focus:ring-indigo-200 focus:bg-gray-100 focus:border-indigo-500 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
                />
              </div> */}
              <Link href="/editor">
                <button className="animate-bounce  text-white bg-indigo-500 border-0 py-2 px-6 focus:outline-none hover:bg-indigo-600 rounded text-lg">
                  Start Editing
                </button>
              </Link>
            </div>
            <p className="text-sm mt-2 text-gray-500 mb-8 w-full">
              Try out our new generative fill feature. Just type in a prompt and
              let the AI do the rest!
            </p>
            <div className="flex lg:flex-row md:flex-col">
              <button className="bg-gray-100 inline-flex py-3 px-5 rounded-lg items-center hover:bg-gray-200 focus:outline-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  className="w-6 h-6"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  ></path>
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  ></path>
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  ></path>
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  ></path>
                </svg>
                <span className="ml-4 flex items-start flex-col leading-none">
                  <span className="text-xs text-gray-600 mb-1">
                    SIGN IN WITH
                  </span>
                  <span className="title-font font-medium">Google</span>
                </span>
              </button>
              <button className="bg-gray-100 inline-flex py-3 px-5 rounded-lg items-center lg:ml-4 md:ml-0 ml-4 md:mt-4 mt-0 lg:mt-0 hover:bg-gray-200 focus:outline-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  className="w-6 h-6"
                  viewBox="0 0 305 305"
                >
                  <path d="M40.74 112.12c-25.79 44.74-9.4 112.65 19.12 153.82C74.09 286.52 88.5 305 108.24 305c.37 0 .74 0 1.13-.02 9.27-.37 15.97-3.23 22.45-5.99 7.27-3.1 14.8-6.3 26.6-6.3 11.22 0 18.39 3.1 25.31 6.1 6.83 2.95 13.87 6 24.26 5.81 22.23-.41 35.88-20.35 47.92-37.94a168.18 168.18 0 0021-43l.09-.28a2.5 2.5 0 00-1.33-3.06l-.18-.08c-3.92-1.6-38.26-16.84-38.62-58.36-.34-33.74 25.76-51.6 31-54.84l.24-.15a2.5 2.5 0 00.7-3.51c-18-26.37-45.62-30.34-56.73-30.82a50.04 50.04 0 00-4.95-.24c-13.06 0-25.56 4.93-35.61 8.9-6.94 2.73-12.93 5.09-17.06 5.09-4.64 0-10.67-2.4-17.65-5.16-9.33-3.7-19.9-7.9-31.1-7.9l-.79.01c-26.03.38-50.62 15.27-64.18 38.86z"></path>
                  <path d="M212.1 0c-15.76.64-34.67 10.35-45.97 23.58-9.6 11.13-19 29.68-16.52 48.38a2.5 2.5 0 002.29 2.17c1.06.08 2.15.12 3.23.12 15.41 0 32.04-8.52 43.4-22.25 11.94-14.5 17.99-33.1 16.16-49.77A2.52 2.52 0 00212.1 0z"></path>
                </svg>
                <span className="ml-4 flex items-start flex-col leading-none">
                  <span className="text-xs text-gray-600 mb-1">
                    Download on the
                  </span>
                  <span className="title-font font-medium">App Store</span>
                </span>
              </button>
            </div>
          </div>
          <div className="lg:max-w-xl lg:w-full md:w-1/2 w-5/6">
            <img alt="penguins" src="\pexels-david-dibert-1299391.jpg" />
          </div>
        </div>
      </section>
      <section className="text-gray-600 body-font bg-gradient-to-r from-neutral-50 to-gray-50">
        <div className="container px-5 py-24 mx-auto">
          <div className="flex flex-wrap w-full mb-20 flex-col items-center text-center">
            <h1 className="sm:text-3xl text-2xl font-medium title-font mb-2 text-gray-900">
              Features
            </h1>
            <p className="lg:w-1/2 w-full leading-relaxed text-gray-500">
              PhotoProX comes equipped with a variety of features to help you
              create stunning images.
            </p>
          </div>
          <div className="flex flex-wrap -m-4">
            <div className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <h2 className="text-lg text-gray-900 font-medium title-font mb-2">
                  Transform
                </h2>
                <p className="leading-relaxed text-base">
                  Rotations, skewing, and scaling.
                </p>
              </div>
            </div>
            <div className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="6" cy="6" r="3"></circle>
                    <circle cx="6" cy="18" r="3"></circle>
                    <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"></path>
                  </svg>
                </div>
                <h2 className="text-lg text-gray-900 font-medium title-font mb-2">
                  Filters
                </h2>
                <p className="leading-relaxed text-base">
                  Commonly used filters, such as blue, sepia, grayscale, and
                  much more!
                </p>
              </div>
            </div>
            <div className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h2 className="text-lg text-gray-900 font-medium title-font mb-2">
                  Adjustment/Clipping Layers
                </h2>
                <p className="leading-relaxed text-base">
                  Apply adjustments to your images without changing the original
                </p>
              </div>
            </div>
            <div className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"></path>
                  </svg>
                </div>
                <h2 className="text-lg text-gray-900 font-medium title-font mb-2">
                  Image Discovery
                </h2>
                <p className="leading-relaxed text-base">
                  Don&apos;t have an image? No problem! We have a streamlined
                  tag-based image search.
                </p>
              </div>
            </div>
            <div className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
                  </svg>
                </div>
                <h2 className="text-lg text-gray-900 font-medium title-font mb-2">
                  Artificial Intelligence
                </h2>
                <p className="leading-relaxed text-base">
                  Utilise the power of AI to enhance your images. Background
                  removal, object detection, and more coming soon!
                </p>
              </div>
            </div>
            <div className="xl:w-1/3 md:w-1/2 p-4">
              <div className="border border-gray-200 p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <h2 className="text-lg text-gray-900 font-medium title-font mb-2">
                  Secure Cloud Storage
                </h2>
                <p className="leading-relaxed text-base">
                  All your work done on PhotoProX is saved to the cloud. No need
                  to worry about downloading your projects.
                </p>
              </div>
            </div>
          </div>
          <Link href={"/editor"}>
            <button className="flex mx-auto mt-16 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg">
              Get Started
            </button>
          </Link>
        </div>
      </section>
      <section className="text-gray-600 body-font">
        <div className="container px-5 py-24 mx-auto flex flex-wrap">
          <div className="flex w-full mb-20 flex-wrap">
            <h1 className="sm:text-3xl text-2xl font-medium title-font text-gray-900 lg:w-1/3 lg:mb-0 mb-4">
              Enjoy some sample images
            </h1>
            <p className="lg:pl-6 lg:w-2/3 mx-auto leading-relaxed text-base">
              Here are some sample images that have been edited with PhotoProX.
            </p>
          </div>
          <div className="flex flex-wrap md:-m-2 -m-1">
            <div className="flex flex-wrap w-1/2">
              <div className="md:p-2 p-1 w-1/2">
                <img
                  alt="gallery"
                  className="w-full object-cover h-full object-center block"
                  src="\pexels-david-dibert-1299391.jpg"
                />
              </div>
              <div className="md:p-2 p-1 w-1/2">
                <img
                  alt="gallery"
                  className="w-full object-cover h-full object-center block"
                  src="\pexels-david-dibert-1299391.jpg"
                />
              </div>
              <div className="md:p-2 p-1 w-full">
                <img
                  alt="gallery"
                  className="w-full h-full object-cover object-center block"
                  src="\pexels-david-dibert-1299391.jpg"
                />
              </div>
            </div>
            <div className="flex flex-wrap w-1/2">
              <div className="md:p-2 p-1 w-full">
                <img
                  alt="gallery"
                  className="w-full h-full object-cover object-center block"
                  src="\pexels-david-dibert-1299391.jpg"
                />
              </div>
              <div className="md:p-2 p-1 w-1/2">
                <img
                  alt="gallery"
                  className="w-full object-cover h-full object-center block"
                  src="\pexels-david-dibert-1299391.jpg"
                />
              </div>
              <div className="md:p-2 p-1 w-1/2">
                <img
                  alt="gallery"
                  className="w-full object-cover h-full object-center block"
                  src="\pexels-david-dibert-1299391.jpg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        className="text-slate-100 body-font bg-[#475569]"
        style={{
          backgroundImage: 'url("/github-mark.svg")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="z-50 container px-5 py-24 mx-auto">
          <div className="flex flex-col text-center w-full mb-20">
            <div className="flex flex-row justify-center items-center mb-4 space-x-3">
              <h1 className="sm:text-3xl text-2xl font-medium title-font text-white">
                Open Source Philosophy
              </h1>
            </div>

            <div className="mt-4 mb-16">
              <p className="lg:w-2/3 mx-auto leading-relaxed text-base">
                PhotoProX is built on the principles of open source software.
              </p>
              <Link
                href={"https://github.com/PavlosDefoort/PhotoProX"}
                target="_blank"
              >
                <button className="flex mx-auto mt-4 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg">
                  Check out our GitHub
                </button>
              </Link>
            </div>
            <div className="mb-16">
              <p className="lg:w-2/3 mx-auto leading-relaxed text-base">
                If you have a feature request or a bug report, feel free to
                submit an issue on our GitHub page.
              </p>
              <Link
                href={"https://github.com/PavlosDefoort/PhotoProX/issues"}
                target="_blank"
              >
                <button className="flex mx-auto mt-4 text-white bg-cyan-500 border-0 py-2 px-8 focus:outline-none hover:bg-cyan-600 rounded text-lg">
                  Submit a Request
                </button>
              </Link>
            </div>
            <div className="">
              <p className="lg:w-2/3 mx-auto leading-relaxed text-base">
                The development build is available on Github. Feel free to check
                out what we are working on before it is released!
              </p>
              <Link href={"https://photoprox-dev.vercel.app/"} target="_blank">
                <button className="flex mx-auto mt-4 text-white bg-blue-500 border-0 py-2 px-8 focus:outline-none hover:bg-blue-600 rounded text-lg">
                  Development Build
                </button>
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap -m-4 text-center bg-gray-800 ">
            <div className="p-4 md:w-1/4 sm:w-1/2 w-full ">
              <div className="border-2 border-gray-200 px-4 py-6 rounded-lg">
                <svg
                  className="text-indigo-500 w-12 h-12 mb-3 inline-block"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.79286 1.20708L7.14642 1.56063L7.14642 1.56063L6.79286 1.20708ZM1.20708 6.79287L0.853524 6.43931H0.853524L1.20708 6.79287ZM1.20708 8.20708L1.56063 7.85352L1.56063 7.85352L1.20708 8.20708ZM6.79287 13.7929L6.43931 14.1464L6.79287 13.7929ZM8.20708 13.7929L7.85352 13.4393L8.20708 13.7929ZM13.7929 8.20708L14.1464 8.56063L13.7929 8.20708ZM13.7929 6.79286L13.4393 7.14642L13.7929 6.79286ZM8.20708 1.20708L8.56063 0.853524V0.853524L8.20708 1.20708ZM6.43931 0.853525L0.853524 6.43931L1.56063 7.14642L7.14642 1.56063L6.43931 0.853525ZM0.853525 8.56063L6.43931 14.1464L7.14642 13.4393L1.56063 7.85352L0.853525 8.56063ZM8.56063 14.1464L14.1464 8.56063L13.4393 7.85352L7.85352 13.4393L8.56063 14.1464ZM14.1464 6.43931L8.56063 0.853524L7.85352 1.56063L13.4393 7.14642L14.1464 6.43931ZM14.1464 8.56063C14.7322 7.97484 14.7322 7.0251 14.1464 6.43931L13.4393 7.14642C13.6346 7.34168 13.6346 7.65826 13.4393 7.85352L14.1464 8.56063ZM6.43931 14.1464C7.0251 14.7322 7.97485 14.7322 8.56063 14.1464L7.85352 13.4393C7.65826 13.6346 7.34168 13.6346 7.14642 13.4393L6.43931 14.1464ZM0.853524 6.43931C0.267737 7.0251 0.267739 7.97485 0.853525 8.56063L1.56063 7.85352C1.36537 7.65826 1.36537 7.34168 1.56063 7.14642L0.853524 6.43931ZM7.14642 1.56063C7.34168 1.36537 7.65826 1.36537 7.85352 1.56063L8.56063 0.853524C7.97484 0.267737 7.0251 0.267739 6.43931 0.853525L7.14642 1.56063ZM5.14642 2.85352L6.14642 3.85352L6.85352 3.14642L5.85352 2.14642L5.14642 2.85352ZM7.49997 4.99997C7.22383 4.99997 6.99997 4.77611 6.99997 4.49997H5.99997C5.99997 5.3284 6.67154 5.99997 7.49997 5.99997V4.99997ZM7.99997 4.49997C7.99997 4.77611 7.77611 4.99997 7.49997 4.99997V5.99997C8.3284 5.99997 8.99997 5.3284 8.99997 4.49997H7.99997ZM7.49997 3.99997C7.77611 3.99997 7.99997 4.22383 7.99997 4.49997H8.99997C8.99997 3.67154 8.3284 2.99997 7.49997 2.99997V3.99997ZM7.49997 2.99997C6.67154 2.99997 5.99997 3.67154 5.99997 4.49997H6.99997C6.99997 4.22383 7.22383 3.99997 7.49997 3.99997V2.99997ZM8.14642 5.85352L9.64642 7.35352L10.3535 6.64642L8.85352 5.14642L8.14642 5.85352ZM10.5 7.99997C10.2238 7.99997 9.99997 7.77611 9.99997 7.49997H8.99997C8.99997 8.3284 9.67154 8.99997 10.5 8.99997V7.99997ZM11 7.49997C11 7.77611 10.7761 7.99997 10.5 7.99997V8.99997C11.3284 8.99997 12 8.3284 12 7.49997H11ZM10.5 6.99997C10.7761 6.99997 11 7.22383 11 7.49997H12C12 6.67154 11.3284 5.99997 10.5 5.99997V6.99997ZM10.5 5.99997C9.67154 5.99997 8.99997 6.67154 8.99997 7.49997H9.99997C9.99997 7.22383 10.2238 6.99997 10.5 6.99997V5.99997ZM6.99997 5.49997V9.49997H7.99997V5.49997H6.99997ZM7.49997 11C7.22383 11 6.99997 10.7761 6.99997 10.5H5.99997C5.99997 11.3284 6.67154 12 7.49997 12V11ZM7.99997 10.5C7.99997 10.7761 7.77611 11 7.49997 11V12C8.3284 12 8.99997 11.3284 8.99997 10.5H7.99997ZM7.49997 9.99997C7.77611 9.99997 7.99997 10.2238 7.99997 10.5H8.99997C8.99997 9.67154 8.3284 8.99997 7.49997 8.99997V9.99997ZM7.49997 8.99997C6.67154 8.99997 5.99997 9.67154 5.99997 10.5H6.99997C6.99997 10.2238 7.22383 9.99997 7.49997 9.99997V8.99997Z"
                    fill="rgb(99,102,241)"
                  />
                </svg>
                <h2 className="title-font font-medium text-3xl text-white">
                  70
                </h2>
                <p className="leading-relaxed">Commits</p>
              </div>
            </div>
            <div className="p-4 md:w-1/4 sm:w-1/2 w-full">
              <div className="border-2 border-gray-200 px-4 py-6 rounded-lg">
                <svg
                  className="text-indigo-500 w-12 h-12 mb-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-width="2"
                    d="M11.083 5.104c.35-.8 1.485-.8 1.834 0l1.752 4.022a1 1 0 0 0 .84.597l4.463.342c.9.069 1.255 1.2.556 1.771l-3.33 2.723a1 1 0 0 0-.337 1.016l1.03 4.119c.214.858-.71 1.552-1.474 1.106l-3.913-2.281a1 1 0 0 0-1.008 0L7.583 20.8c-.764.446-1.688-.248-1.474-1.106l1.03-4.119A1 1 0 0 0 6.8 14.56l-3.33-2.723c-.698-.571-.342-1.702.557-1.771l4.462-.342a1 1 0 0 0 .84-.597l1.753-4.022Z"
                  />
                </svg>

                <h2 className="title-font font-medium text-3xl text-white">
                  1
                </h2>
                <p className="leading-relaxed">Stars</p>
              </div>
            </div>
            <div className="p-4 md:w-1/4 sm:w-1/2 w-full">
              <div className="border-2 border-gray-200 px-4 py-6 rounded-lg">
                <svg
                  className="text-indigo-500 w-12 h-12 mb-3 inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 256"
                  id="git-fork"
                >
                  <rect width="256" height="256" fill="none"></rect>
                  <circle
                    cx="128"
                    cy="188"
                    r="28"
                    fill="none"
                    stroke="rgb(99,102,241)"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="15"
                  ></circle>
                  <circle
                    cx="188"
                    cy="67.998"
                    r="28"
                    fill="none"
                    stroke="rgb(99,102,241)"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="15"
                  ></circle>
                  <circle
                    cx="68"
                    cy="67.998"
                    r="28"
                    fill="none"
                    stroke="rgb(99,102,241)"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="15"
                  ></circle>
                  <path
                    fill="none"
                    stroke="rgb(99,102,241)"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="15"
                    d="M68,95.99756v8.002a24,24,0,0,0,24.00049,24l72-.00146a24,24,0,0,0,23.99951-24V95.99756"
                  ></path>
                  <line
                    x1="128.002"
                    x2="128"
                    y1="128"
                    y2="160"
                    fill="rgb(99,102,241)"
                    stroke="rgb(99,102,241)"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="15"
                  ></line>
                </svg>
                <h2 className="title-font font-medium text-3xl text-white">
                  0
                </h2>
                <p className="leading-relaxed">Forks</p>
              </div>
            </div>
            <div className="p-4 md:w-1/4 sm:w-1/2 w-full">
              <div className="border-2 border-gray-200 px-4 py-6 rounded-lg">
                <svg
                  className="text-indigo-500 w-12 h-12 mb-3 inline-block"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-width="2"
                    d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6Z"
                  />
                  <path
                    stroke="currentColor"
                    stroke-width="2"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>

                <h2 className="title-font font-medium text-3xl text-white">
                  1
                </h2>
                <p className="leading-relaxed">Watching</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="text-gray-600 body-font overflow-hidden">
        <div className="container px-5 py-24 mx-auto">
          <div className="flex flex-col text-center w-full mb-20">
            <h1 className="sm:text-4xl text-3xl font-medium title-font mb-2 text-gray-900">
              Completely Free! (for now...)
            </h1>
            <p className="lg:w-2/3 mx-auto leading-relaxed text-base text-gray-500">
              PhotoProX is completely free to use for now. We are working on
              features that will require a subscription in the future.
            </p>
          </div>
          <div className="flex flex-row items-center justify-center -m-4">
            <div className="p-4 xl:w-1/4 md:w-1/2 w-full">
              <div className="h-full p-6 rounded-lg border-2 border-gray-300 flex flex-col relative overflow-hidden">
                <h2 className="text-sm tracking-widest title-font mb-1 font-medium">
                  START
                </h2>
                <h1 className="text-5xl text-gray-900 pb-4 mb-4 border-b border-gray-200 leading-none">
                  Free
                </h1>
                <p className="flex items-center text-gray-600 mb-2">
                  <span className="w-4 h-4 mr-2 inline-flex items-center justify-center bg-gray-400 text-white rounded-full flex-shrink-0">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                  </span>
                  Everything
                </p>
                <p className="flex items-center text-gray-600 mb-2">
                  <span className="w-4 h-4 mr-2 inline-flex items-center justify-center bg-gray-400 text-white rounded-full flex-shrink-0">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                  </span>
                  Did we mention everything?
                </p>

                <button className="flex items-center mt-auto text-white bg-gray-400 border-0 py-2 px-4 w-full focus:outline-none hover:bg-gray-500 rounded">
                  Get Started
                  <svg
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    className="w-4 h-4 ml-auto"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                  </svg>
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  Get started today! For free!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="text-gray-600 body-font">
        <div className="container px-5 py-8 mx-auto flex items-center sm:flex-row flex-col">
          <a className="flex title-font font-medium items-center md:justify-start justify-center text-gray-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              className="w-10 h-10 text-white p-2 bg-indigo-500 rounded-full"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-3 text-xl">PhotoProX</span>
          </a>
          <p className="text-sm text-gray-500 sm:ml-4 sm:pl-4 sm:border-l-2 sm:border-gray-200 sm:py-2 sm:mt-0 mt-4">
            © 2024 PhotoProX —
            <a
              href="https://twitter.com/knyttneve"
              className="text-gray-600 ml-1"
              rel="noopener noreferrer"
              target="_blank"
            >
              @PavlosDefoort
            </a>
          </p>
          <span className="inline-flex sm:ml-auto sm:mt-0 mt-4 justify-center sm:justify-start">
            <a className="text-gray-500">
              <svg
                fill="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
              </svg>
            </a>
            <a className="ml-3 text-gray-500">
              <svg
                fill="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
              </svg>
            </a>
            <a className="ml-3 text-gray-500">
              <svg
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
              </svg>
            </a>
            <a className="ml-3 text-gray-500">
              <svg
                fill="currentColor"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="0"
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="none"
                  d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"
                ></path>
                <circle cx="4" cy="4" r="2" stroke="none"></circle>
              </svg>
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}
