import { ThemeContext } from "@/context/ThemeContext";
import { ThemeProviderProps } from "@/interfaces/ContextInterfaces";
import React, { useEffect, useState } from "react";

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
