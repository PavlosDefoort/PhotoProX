import "@/styles/globals.css";
import type { AppProps } from "next/app";
import MyCursor from "@/components/cursor";
import Head from "next/head";
import ThemeProvider from "../components/ThemeProvider/themeprovider";
import AuthProvider from "../../app/authcontext";
import DarkMode from "@/components/ThemeProvider/darkmode";
import { Toaster } from "@/components/ui/sonner";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <Head>
        <title>PhotoProX</title>
      </Head>

      <AuthProvider>
        <ThemeProvider>
          <DarkMode />
          <Component {...pageProps}></Component>
        </ThemeProvider>
      </AuthProvider>
      <Toaster />
    </div>
  );
}
