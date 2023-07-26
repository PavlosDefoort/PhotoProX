import React, { createContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled in the user's system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDark);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prevDarkMode) => !prevDarkMode);
    // Add or remove the 'dark' class to the <html> element
    document.documentElement.classList.toggle("dark");
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;
