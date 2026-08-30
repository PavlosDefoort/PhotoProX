import { useTheme } from "@/hooks/useTheme";
import UserNavigationMenu from "../editor/ui/components/bars/top-bar/navigation/user/UserNavigation";
import Link from "next/link";

export const Header: React.FC = () => {
  const { darkMode } = useTheme();
  return (
    <header
      className={`z-50 text-gray-600 dark:text-white body-font sticky top-0 ${
        darkMode ? "dark:navbar-blur-dark" : "navbar-blur"
      }  shadow border-b  border-gray-500 dark:border-gray-800`}
    >
      <div className="container mx-auto flex flex-wrap p-2 flex-col md:flex-row items-center">
        <Link
          className="flex title-font font-medium items-center text-gray-900 mb-4 md:mb-0"
          href="/"
        >
          <img src="/zynalo-studio.ico" alt="Zynalo" className="h-10 w-10 rounded-lg" />
          <span className="ml-3 text-xl dark:text-white">Zynalo</span>
        </Link>
        <nav className="md:ml-auto md:mr-auto flex flex-wrap items-center text-base justify-center">
          <UserNavigationMenu />
        </nav>

        <Link href="/studio">
          <button className="inline-flex items-center bg-transparent dark:bg-transparent border-0 py-1 px-3 focus:outline-none  rounded text-base mt-4 md:mt-0">
            Start Editing
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="w-4 h-4 ml-1"
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </button>
        </Link>
      </div>
    </header>
  );
};
