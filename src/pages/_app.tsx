import "@/styles/globals.css";
import type { AppProps } from "next/app";
import MyCursor from "@/components/cursor";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <Head>
        <title>PhotoProX</title>
      </Head>
      {/* <MyCursor /> */}
      <Component {...pageProps}></Component>
    </div>
  );
}
