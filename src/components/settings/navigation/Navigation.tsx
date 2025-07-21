import Link from "next/link";
import { navigationData } from "./NavigationData";

const Navigation: React.FC = () => {
  return (
    <nav className="w-64 space-y-4 text-black dark:text-white">
      {navigationData.map((navList, index) => (
        <ul key={index} className="space-y-2 border-b-2 pb-2">
          <h1 className="text-md font-semibold">{navList.title}</h1>
          {navList.content.map((navItem, index) => (
            <li
              key={index}
              className="hover:bg-buttonHover dark:hover:bg-buttonHover"
            >
              <Link
                href={`/settings/${navItem.name}`}
                className="flex space-x-2"
              >
                <navItem.icon />
                <p className="dark:text-white text-black text-sm">
                  {" "}
                  {navItem.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </nav>
  );
};

export default Navigation;
