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

  useEffect(() => {
    // Check if dark mode is enabled in the user's system preference
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

  const toggleDarkMode = () => {
    setDarkMode((prevDarkMode) => !prevDarkMode);
    document.documentElement.classList.toggle("dark");
    // Add or remove the 'dark' class to the <html> element
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;
