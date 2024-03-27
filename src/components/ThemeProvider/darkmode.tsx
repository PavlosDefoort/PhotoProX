import { ThemeContext } from "./themeprovider";
import { useContext, useEffect } from "react";

const DarkMode = () => {
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    darkMode;
    const favicon = document.querySelector(
      'link[rel="icon"]'
    ) as HTMLLinkElement;
    favicon;
    if (favicon) {
      favicon.href = darkMode ? "/darkfavicon.ico" : "/favicon.ico";
    }
  }, [darkMode]);

  return null; // This component doesn't render anything visible
};

export default DarkMode;
