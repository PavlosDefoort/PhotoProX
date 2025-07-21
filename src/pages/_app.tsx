import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import AuthProvider from "../../app/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import DarkModeIcon from "../../app/DarkModeIcon";
import ThemeProvider from "../../app/ThemeProvider";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300"],
  style: "normal",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div>
      <Head>
        <title>PhotoProX</title>
      </Head>

      <AuthProvider>
        <ThemeProvider>
          <DarkModeIcon />
          <main className={poppins.className}>
            <Component {...pageProps}></Component>
          </main>
        </ThemeProvider>
      </AuthProvider>
      <Toaster visibleToasts={1} />
    </div>
  );
}
