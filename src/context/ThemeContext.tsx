import { ThemeContextValue } from "@/interfaces/ContextInterfaces";
import { createContext } from "react";

export const ThemeContext = createContext<ThemeContextValue>({
  darkMode: true,
  toggleDarkMode: () => {},
});
