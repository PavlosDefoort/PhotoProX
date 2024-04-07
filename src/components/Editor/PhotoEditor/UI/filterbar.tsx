import React, { useRef } from "react";

interface FilterBarProps {
  components: FilterElement[];
  changeActive: (mode: string) => void;
  handleEnable: (name: string) => void;
  handleMultiply: (name: string) => void;
  setComponents: (component: FilterElement[]) => void;
}

type FilterElement = {
  name: string;
  enabled: boolean;
  multiply: boolean;
  filterIcon: JSX.Element;
  background: string;
};

const FilterBar: React.FC<FilterBarProps> = ({
  components,
  changeActive,
  handleEnable,
  handleMultiply,
  setComponents,
}) => {
  // React.useEffect(() => {
  //   const init = async () => {
  //     const { initTE, Sidenav } = await import("tw-elements");

  //     initTE({ Sidenav });
  //   };
  //   init();
  // }, []);

  const componentsRef = useRef(components);

  const handleCancel = () => {
    componentsRef.current;
    setComponents(componentsRef.current);
    changeActive("");
  };

  return (
    <div className="z-10">
      {/* <nav
        id="sidenav-1"
        className="animate-fade-right animate-once animate-duration-[500ms] animate-ease-out overflow-y-scroll hover: scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-200 absolute left-0 top-0 z-[1035] h-full w-60 -translate-x-full overflow-hidden bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.07),_0_2px_4px_rgba(0,0,0,0.05)] data-[te-sidenav-hidden='false']:translate-x-0 dark:bg-[#3b3b3b]"
        data-te-sidenav-init
        data-te-sidenav-hidden="false"
        data-te-sidenav-position="absolute"
      >
        <ul
          className="relative m-0 list-none px-[0.2rem] pt-16"
          data-te-sidenav-menu-ref
        >
          <li
            className="relative"
            onClick={() => {
              handleCancel();
            }}
          >
            <a
              className=" flex h-12 cursor-pointer items-center truncate rounded-[5px] px-6 py-4 text-[0.875rem] text-gray-600 outline-none transition duration-300 ease-linear  hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300  dark:focus:bg-white/10 dark:active:bg-white/10"
              data-te-sidenav-link-ref
            >
              <span className="mr-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300 ">
                <svg>
                  <KeyboardBackspaceIcon />
                </svg>
              </span>
              <span className="text-base">Filters</span>
            </a>
          </li>
          {components.map((component) => (
            <li className="relative" key={component.name}>
              <a
                // style={{ background: component.background }}
                className="flex h-12 cursor-pointer items-center truncate rounded-[5px] px-6 py-4 text-[0.875rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
                data-te-sidenav-link-ref
              >
                <span className="mr-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-300">
                  <svg>{component.filterIcon}</svg>
                </span>
                <span>
                  {component.name.charAt(0).toUpperCase() +
                    component.name.slice(1)}
                </span>
                <span
                  className="absolute right-0 ml-auto mr-[0.8rem] transition-transform duration-300 ease-linear motion-reduce:transition-none [&>svg]:text-gray-600 dark:[&>svg]:text-gray-300"
                  data-te-sidenav-rotate-icon-ref
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </a>
              <ul
                className="!visible relative m-0 hidden list-none p-0 data-[te-collapse-show]:block "
                data-te-sidenav-collapse-ref
              >
                <li
                  className="relative"
                  onClick={() => handleEnable(component.name)}
                >
                  <a
                    className="flex h-6 cursor-pointer items-center truncate rounded-[5px] py-4 pl-[3.4rem] pr-6 text-[0.78rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
                    data-te-sidenav-link-ref
                  >
                    {component.enabled ? (
                      <span>Disable</span>
                    ) : (
                      <span>Enable</span>
                    )}
                  </a>
                </li>
                <li
                  className="relative"
                  onClick={() => handleMultiply(component.name)}
                >
                  <a
                    className="flex h-6 cursor-pointer items-center truncate rounded-[5px] py-4 pl-[3.4rem] pr-6 text-[0.78rem] text-gray-600 outline-none transition duration-300 ease-linear hover:bg-slate-50 hover:text-inherit hover:outline-none focus:bg-slate-50 focus:text-inherit focus:outline-none active:bg-slate-50 active:text-inherit active:outline-none data-[te-sidenav-state-active]:text-inherit data-[te-sidenav-state-focus]:outline-none motion-reduce:transition-none dark:text-gray-300 dark:hover:bg-white/10 dark:focus:bg-white/10 dark:active:bg-white/10"
                    data-te-sidenav-link-ref
                  >
                    {component.multiply ? (
                      <span>Original</span>
                    ) : (
                      <span>Multiply</span>
                    )}
                  </a>
                </li>
              </ul>
            </li>
          ))}
        </ul>
      </nav> */}
    </div>
  );
};
export default FilterBar;
