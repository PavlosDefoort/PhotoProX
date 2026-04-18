import { Html, Head, Main, NextScript } from "next/document";

const setInitialThemeScript = `
(function () {
  try {
    var savedMode = window.localStorage.getItem("darkMode");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = savedMode !== null ? savedMode === "true" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (error) {
    // Ignore errors from private mode or blocked storage.
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="PhotoProX is your one-stop shop for web based photo editing. With a wide range of tools, you can create stunning images in no time."
        />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: setInitialThemeScript }} />
      </Head>
      <body className="bg-background text-foreground">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
