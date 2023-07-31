import { set } from "lodash";
import React, { createContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: true,
  toggleDarkMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [toggled, setToggled] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled in the user's system preference
    const alreadyMode = localStorage.getItem("darkMode");
    if (alreadyMode) {
      setDarkMode(JSON.parse(alreadyMode));
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

      // Function to handle changes in the system preference
      const handleSystemPreferenceChange = (event: MediaQueryListEvent) => {
        setDarkMode(event.matches);
      };

      // Listen for changes in the system preference and call the handler function
      prefersDark.addEventListener("change", handleSystemPreferenceChange);

      // Initial check of the user's system preference
      setDarkMode(prefersDark.matches);

      // Clean up the event listener when the component unmounts
      return () => {
        prefersDark.removeEventListener("change", handleSystemPreferenceChange);
      };
    }
  }, []);

  function updateTheme(newColorScheme: string) {
    if (newColorScheme === "dark") {
      // Apply dark mode styles or logic
      setDarkMode(true);
    } else {
      // Apply light mode styles or logic
      setDarkMode(false);
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (toggled) {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    }
  }, [toggled, darkMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle("dark", newDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(newDarkMode));
    setToggled(true);
    // Add or remove the 'dark' class to the <html> element
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;
