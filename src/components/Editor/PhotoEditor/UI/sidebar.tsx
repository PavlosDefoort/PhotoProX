import React from "react";
import { Slider } from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import PhotoSizeSelectLargeIcon from "@mui/icons-material/PhotoSizeSelectLarge";
import Brightness6Icon from "@mui/icons-material/Brightness6";
import { Poppins } from "next/font/google";

interface SideBarProps {
  changeActive: (mode: string) => void;
}

const SideBar: React.FC<SideBarProps> = ({ changeActive }) => {
  return (
    <div className="z-10">
      <nav
        id="sidenav-8"
        className="animate-fade-right animate-once animate-duration-[500ms] overflow-y-scroll hover: scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200 absolute left-0 top-0 z-[1035] h-full w-64 -translate-x-full overflow-hidden bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.07),_0_2px_4px_rgba(0,0,0,0.05)] data-[te-sidenav-hidden='false']:translate-x-0 dark:bg-[#3b3b3b]"
        data-te-sidenav-init
        data-te-sidenav-hidden="false"
        data-te-sidenav-position="absolute"
        data-te-sidenav-accordion="true"
      >
        <ul
          className="relative m-0 list-none px-[0.2rem] pb-12 pt-16"
          data-te-sidenav-menu-ref
        >
          <li className="relative ">
            <span className="px-6 py-4 text-[0.6rem] font-bold uppercase text-gray-600 dark:text-gray-400">
              Transform
            </span>
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
              onClick={() => changeActive("rotate")}
            >
              <span className="mr-4 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg>
                  <RefreshIcon />
                </svg>
              </span>
              <span>Rotate</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
              onClick={() => changeActive("resize")}
            >
              <span className="mr-4 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg>
                  <PhotoSizeSelectLargeIcon />
                </svg>
              </span>
              <span>Resize</span>
            </a>
          </li>
          <li className="relative pt-4">
            <span className="px-6 py-4 text-[0.6rem] font-bold uppercase text-gray-600 dark:text-gray-400">
              Colour Adjustment
            </span>
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
              onClick={() => changeActive("filters")}
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg>
                  <FilterAltIcon />
                </svg>
              </span>
              <span>Filters</span>
            </a>
          </li>
          {/* <li className="relative" onClick={() => changeActive("sepia")}>
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg>
                  <Brightness6Icon />
                </svg>
              </span>
              <span>Exposure</span>
            </a>
          </li> */}

          {/* <li className="relative pt-4">
            <span className="px-6 py-4 text-[0.6rem] font-bold uppercase text-gray-600 dark:text-gray-400">
              Maintain
            </span>
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z"
                    clip-rule="evenodd"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <span>Analytics</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <span>Backups</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <span>Security</span>
            </a>
          </li>
          <li className="relative pt-4">
            <span className="px-6 py-4 text-[0.6rem] font-bold uppercase text-gray-600 dark:text-gray-400">
              Admin
            </span>
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                  <path
                    fill-rule="evenodd"
                    d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z"
                    clip-rule="evenodd"
                  />
                  <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
                </svg>
              </span>
              <span>Billing</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
                    clip-rule="evenodd"
                  />
                  <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                </svg>
              </span>
              <span>License</span>
            </a>
          </li>
          <li className="relative pt-4">
            <span className="px-6 py-4 text-[0.6rem] font-bold uppercase text-gray-600 dark:text-gray-400">
              Tools
            </span>
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 01-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.68zM3 10.5a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H3.75A.75.75 0 013 10.5zm14.25 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H18a.75.75 0 01-.75-.75zm-8.962 3.712a.75.75 0 010 1.061l-1.591 1.591a.75.75 0 11-1.061-1.06l1.591-1.592a.75.75 0 011.06 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <span>Drag & drop builder</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fill-rule="evenodd"
                    d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 11-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <span>Online code editor</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path d="M16.5 6a3 3 0 00-3-3H6a3 3 0 00-3 3v7.5a3 3 0 003 3v-6A4.5 4.5 0 0110.5 6h6z" />
                  <path d="M18 7.5a3 3 0 013 3V18a3 3 0 01-3 3h-7.5a3 3 0 01-3-3v-7.5a3 3 0 013-3H18z" />
                </svg>
              </span>
              <span>SFTP</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:fill-gray-400 dark:[&>svg]:fill-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path d="M487.1 425c-1.4-11.2-19-23.1-28.2-31.9-5.1-5-29-23.1-30.4-29.9-1.4-6.6 9.7-21.5 13.3-28.9 5.1-10.7 8.8-23.7 11.3-32.6 18.8-66.1 20.7-156.9-6.2-211.2-10.2-20.6-38.6-49-56.4-62.5-42-31.7-119.6-35.3-170.1-16.6-14.1 5.2-27.8 9.8-40.1 17.1-33.1 19.4-68.3 32.5-78.1 71.6-24.2 10.8-31.5 41.8-30.3 77.8.2 7 4.1 15.8 2.7 22.4-.7 3.3-5.2 7.6-6.1 9.8-11.6 27.7-2.3 64 11.1 83.7 8.1 11.9 21.5 22.4 39.2 25.2.7 10.6 3.3 19.7 8.2 30.4 3.1 6.8 14.7 19 10.4 27.7-2.2 4.4-21 13.8-27.3 17.6C89 407.2 73.7 415 54.2 429c-12.6 9-32.3 10.2-29.2 31.1 2.1 14.1 10.1 31.6 14.7 45.8.7 2 1.4 4.1 2.1 6h422c4.9-15.3 9.7-30.9 14.6-47.2 3.4-11.4 10.2-27.8 8.7-39.7zM205.9 33.7c1.8-.5 3.4.7 4.9 2.4-.2 5.2-5.4 5.1-8.9 6.8-5.4 6.7-13.4 9.8-20 17.2-6.8 7.5-14.4 27.7-23.4 30-4.5 1.1-9.7-.8-13.6-.5-10.4.7-17.7 6-28.3 7.5 13.6-29.9 56.1-54 89.3-63.4zm-104.8 93.6c13.5-14.9 32.1-24.1 54.8-25.9 11.7 29.7-8.4 65-.9 97.6 2.3 9.9 10.2 25.4-2.4 25.7.3-28.3-34.8-46.3-61.3-29.6-1.8-21.5-4.9-51.7 9.8-67.8zm36.7 200.2c-1-4.1-2.7-12.9-2.3-15.1 1.6-8.7 17.1-12.5 11-24.7-11.3-.1-13.8 10.2-24.1 11.3-26.7 2.6-45.6-35.4-44.4-58.4 1-19.5 17.6-38.2 40.1-35.8 16 1.8 21.4 19.2 24.5 34.7 9.2.5 22.5-.4 26.9-7.6-.6-17.5-8.8-31.6-8.2-47.7 1-30.3 17.5-57.6 4.8-87.4 13.6-30.9 53.5-55.3 83.1-70 36.6-18.3 94.9-3.7 129.3 15.8 19.7 11.1 34.4 32.7 48.3 50.7-19.5-5.8-36.1 4.2-33.1 20.3 16.3-14.9 44.2-.2 52.5 16.4 7.9 15.8 7.8 39.3 9 62.8 2.9 57-10.4 115.9-39.1 157.1-7.7 11-14.1 23-24.9 30.6-26 18.2-65.4 34.7-99.2 23.4-44.7-15-65-44.8-89.5-78.8.7 18.7 13.8 34.1 26.8 48.4 11.3 12.5 25 26.6 39.7 32.4-12.3-2.9-31.1-3.8-36.2 7.2-28.6-1.9-55.1-4.8-68.7-24.2-10.6-15.4-21.4-41.4-26.3-61.4zm222 124.1c4.1-3 11.1-2.9 17.4-3.6-5.4-2.7-13-3.7-19.3-2.2-.1-4.2-2-6.8-3.2-10.2 10.6-3.8 35.5-28.5 49.6-20.3 6.7 3.9 9.5 26.2 10.1 37 .4 9-.8 18-4.5 22.8-18.8-.6-35.8-2.8-50.7-7 .9-6.1-1-12.1.6-16.5zm-17.2-20c-16.8.8-26-1.2-38.3-10.8.2-.8 1.4-.5 1.5-1.4 18 8 40.8-3.3 59-4.9-7.9 5.1-14.6 11.6-22.2 17.1zm-12.1 33.2c-1.6-9.4-3.5-12-2.8-20.2 25-16.6 29.7 28.6 2.8 20.2zM226 438.6c-11.6-.7-48.1-14-38.5-23.7 9.4 6.5 27.5 4.9 41.3 7.3.8 4.4-2.8 10.2-2.8 16.4zM57.7 497.1c-4.3-12.7-9.2-25.1-14.8-36.9 30.8-23.8 65.3-48.9 102.2-63.5 2.8-1.1 23.2 25.4 26.2 27.6 16.5 11.7 37 21 56.2 30.2 1.2 8.8 3.9 20.2 8.7 35.5.7 2.3 1.4 4.7 2.2 7.2H57.7zm240.6 5.7h-.8c.3-.2.5-.4.8-.5v.5zm7.5-5.7c2.1-1.4 4.3-2.8 6.4-4.3 1.1 1.4 2.2 2.8 3.2 4.3h-9.6zm15.1-24.7c-10.8 7.3-20.6 18.3-33.3 25.2-6 3.3-27 11.7-33.4 10.2-3.6-.8-3.9-5.3-5.4-9.5-3.1-9-10.1-23.4-10.8-37-.8-17.2-2.5-46 16-42.4 14.9 2.9 32.3 9.7 43.9 16.1 7.1 3.9 11.1 8.6 21.9 9.5-.1 1.4-.1 2.8-.2 4.3-5.9 3.9-15.3 3.8-21.8 7.1 9.5.4 17 2.7 23.5 5.9-.1 3.4-.3 7-.4 10.6zm53.4 24.7h-14c-.1-3.2-2.8-5.8-6.1-5.8s-5.9 2.6-6.1 5.8h-17.4c-2.8-4.4-5.7-8.6-8.9-12.5 2.1-2.2 4-4.7 6-6.9 9 3.7 14.8-4.9 21.7-4.2 7.9.8 14.2 11.7 25.4 11l-.6 12.6zm8.7 0c.2-4 .4-7.8.6-11.5 15.6-7.3 29 1.3 35.7 11.5H383zm83.4-37c-2.3 11.2-5.8 24-9.9 37.1-.2-.1-.4-.1-.6-.1H428c.6-1.1 1.2-2.2 1.9-3.3-2.6-6.1-9-8.7-10.9-15.5 12.1-22.7 6.5-93.4-24.2-78.5 4.3-6.3 15.6-11.5 20.8-19.3 13 10.4 20.8 20.3 33.2 31.4 6.8 6 20 13.3 21.4 23.1.8 5.5-2.6 18.9-3.8 25.1zM222.2 130.5c5.4-14.9 27.2-34.7 45-32 7.7 1.2 18 8.2 12.2 17.7-30.2-7-45.2 12.6-54.4 33.1-8.1-2-4.9-13.1-2.8-18.8zm184.1 63.1c8.2-3.6 22.4-.7 29.6-5.3-4.2-11.5-10.3-21.4-9.3-37.7.5 0 1 0 1.4.1 6.8 14.2 12.7 29.2 21.4 41.7-5.7 13.5-43.6 25.4-43.1 1.2zm20.4-43zm-117.2 45.7c-6.8-10.9-19-32.5-14.5-45.3 6.5 11.9 8.6 24.4 17.8 33.3 4.1 4 12.2 9 8.2 20.2-.9 2.7-7.8 8.6-11.7 9.7-14.4 4.3-47.9.9-36.6-17.1 11.9.7 27.9 7.8 36.8-.8zm27.3 70c3.8 6.6 1.4 18.7 12.1 20.6 20.2 3.4 43.6-12.3 58.1-17.8 9-15.2-.8-20.7-8.9-30.5-16.6-20-38.8-44.8-38-74.7 6.7-4.9 7.3 7.4 8.2 9.7 8.7 20.3 30.4 46.2 46.3 63.5 3.9 4.3 10.3 8.4 11 11.2 2.1 8.2-5.4 18-4.5 23.5-21.7 13.9-45.8 29.1-81.4 25.6-7.4-6.7-10.3-21.4-2.9-31.1zm-201.3-9.2c-6.8-3.9-8.4-21-16.4-21.4-11.4-.7-9.3 22.2-9.3 35.5-7.8-7.1-9.2-29.1-3.5-40.3-6.6-3.2-9.5 3.6-13.1 5.9 4.7-34.1 49.8-15.8 42.3 20.3zm299.6 28.8c-10.1 19.2-24.4 40.4-54 41-.6-6.2-1.1-15.6 0-19.4 22.7-2.2 36.6-13.7 54-21.6zm-141.9 12.4c18.9 9.9 53.6 11 79.3 10.2 1.4 5.6 1.3 12.6 1.4 19.4-33 1.8-72-6.4-80.7-29.6zm92.2 46.7c-1.7 4.3-5.3 9.3-9.8 11.1-12.1 4.9-45.6 8.7-62.4-.3-10.7-5.7-17.5-18.5-23.4-26-2.8-3.6-16.9-12.9-.2-12.9 13.1 32.7 58 29 95.8 28.1z" />
                </svg>
              </span>
              <span>Jenkins</span>
            </a>
          </li>
          <li className="relative">
            <a
              className="flex cursor-pointer items-center truncate rounded-[5px] px-6 py-[0.45rem] text-[0.85rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:fill-gray-400 dark:[&>svg]:fill-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path d="M503.5 204.6L502.8 202.8L433.1 21.02C431.7 17.45 429.2 14.43 425.9 12.38C423.5 10.83 420.8 9.865 417.9 9.57C415 9.275 412.2 9.653 409.5 10.68C406.8 11.7 404.4 13.34 402.4 15.46C400.5 17.58 399.1 20.13 398.3 22.9L351.3 166.9H160.8L113.7 22.9C112.9 20.13 111.5 17.59 109.6 15.47C107.6 13.35 105.2 11.72 102.5 10.7C99.86 9.675 96.98 9.295 94.12 9.587C91.26 9.878 88.51 10.83 86.08 12.38C82.84 14.43 80.33 17.45 78.92 21.02L9.267 202.8L8.543 204.6C-1.484 230.8-2.72 259.6 5.023 286.6C12.77 313.5 29.07 337.3 51.47 354.2L51.74 354.4L52.33 354.8L158.3 434.3L210.9 474L242.9 498.2C246.6 500.1 251.2 502.5 255.9 502.5C260.6 502.5 265.2 500.1 268.9 498.2L300.9 474L353.5 434.3L460.2 354.4L460.5 354.1C482.9 337.2 499.2 313.5 506.1 286.6C514.7 259.6 513.5 230.8 503.5 204.6z" />
                </svg>
              </span>
              <span>GitLab</span>
            </a>
          </li> */}
        </ul>
      </nav>

      {/* <button
        className="mt-10 inline-block rounded bg-primary px-6 py-2.5 text-xs font-medium uppercase leading-tight text-white shadow-md transition duration-150 ease-in-out hover:bg-primary-700 hover:shadow-lg focus:bg-primary-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-primary-800 active:shadow-lg"
        data-te-sidenav-toggle-ref
        data-te-target="#sidenav-8"
        aria-controls="#sidenav-8"
        aria-haspopup="true"
      >
        <span className="block [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fill-rule="evenodd"
              d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </button> */}
    </div>
  );
};
export default SideBar;
