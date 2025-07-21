import { useEffect } from "react";
import { useTheme } from "../src/hooks/useTheme";

const DarkModeIcon = () => {
  const { darkMode } = useTheme();

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

export default DarkModeIcon;
