import { ThemeContext } from "@/context/ThemeContext";
import { ThemeProviderProps } from "@/interfaces/ContextInterfaces";
import React, { useEffect, useState } from "react";

const DARK_MODE_STORAGE_KEY = "darkMode";

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const savedMode = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (savedMode !== null) {
      return savedMode === "true";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [hasUserPreference, setHasUserPreference] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(DARK_MODE_STORAGE_KEY) !== null;
  });

  useEffect(() => {
    if (hasUserPreference) {
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemPreferenceChange = (event: MediaQueryListEvent) => {
      setDarkMode(event.matches);
    };

    prefersDark.addEventListener("change", handleSystemPreferenceChange);

    return () => {
      prefersDark.removeEventListener("change", handleSystemPreferenceChange);
    };
  }, [hasUserPreference]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    window.localStorage.setItem(
      DARK_MODE_STORAGE_KEY,
      JSON.stringify(newDarkMode),
    );
    setHasUserPreference(true);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;
