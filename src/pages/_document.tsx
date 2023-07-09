import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />

        <footer className="animate-fade rounded-lg shadow  fixed bottom-0 left-0 w-full dark:bg-gray-800">
          <div className="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-center">
            <span className="text-sm text-gray-100 sm:text-center dark:text-gray-100">
              © 2023{" "}
              <a href="https://flowbite.com/" className="hover:underline">
                PhotoProX
              </a>
              . All Rights Reserved.
            </span>
          </div>
        </footer>
      </body>
    </Html>
  );
}
