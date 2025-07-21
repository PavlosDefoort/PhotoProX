import { Footer } from "../landing/Footer";
import { Header } from "../landing/Header";
import Navigation from "./navigation/Navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen">
      <Header />

      <main className="flex flex-1 flex-row justify-center space-x-10 pt-10 bg-gradient-to-r from-neutral-50 to-gray-50 dark:from-[#111111] dark:to-black">
        <Navigation />
        <div className="w-1/2 text-black dark:text-white">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
