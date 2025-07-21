import { ThemeContext } from "@/context/ThemeContext";
import { useContext } from "react";

export function useTheme() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  return { darkMode, toggleDarkMode };
}
