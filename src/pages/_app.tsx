import "@/styles/globals.css";
import type { AppProps } from "next/app";
import MyCursor from "@/components/cursor";
import Head from "next/head";
import ThemeProvider from "../components/ThemeProvider/themeprovider";
import DarkMode from "@/components/ThemeProvider/darkmode";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <Head>
        <title>PhotoProX</title>
      </Head>
      {/* <MyCursor /> */}
      <ThemeProvider>
        <DarkMode />
        <Component {...pageProps}></Component>
      </ThemeProvider>
    </div>
  );
}
