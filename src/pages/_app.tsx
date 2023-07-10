import "@/styles/globals.css";
import type { AppProps } from "next/app";
import MyCursor from "@/components/cursor";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      {/* <MyCursor /> */}
      <Component {...pageProps}></Component>
    </div>
  );
}
