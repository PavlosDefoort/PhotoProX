import Link from "next/link";
import { gitStats, openSourceData } from "./OpenSourceData";

export const OpenSource: React.FC = () => {
  return (
    <section
      className="text-slate-100 body-font bg-[#475569] dark:bg-black"
      style={{
        backgroundImage: 'url("/github-mark.svg")',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="z-50 container px-5 py-24 mx-auto">
        <div className="container px-5 py-12 mx-auto">
          <div className="text-center mb-20">
            <h1 className="sm:text-3xl text-2xl font-medium title-font text-white mb-4 dark:text-white">
              Open Source Philosophy
            </h1>
            <p className="text-base leading-relaxed xl:w-2/4 lg:w-3/4 mx-auto text-gray-500s">
              PhotoProX is an open source project. We believe in the power of
              community and collaboration.
            </p>
            <div className="flex mt-6 justify-center">
              <div className="w-16 h-1 rounded-full bg-indigo-500 inline-flex"></div>
            </div>
          </div>
          <div className="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4 md:space-y-0 space-y-6">
            {openSourceData.map((data, index) => (
              <div
                className="p-4 md:w-1/3 flex flex-col text-center items-center"
                key={index}
              >
                <div className="w-20 h-20 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-5 flex-shrink-0">
                  <data.icon />
                </div>
                <div className="flex-grow">
                  <h2 className="text-white text-lg title-font font-medium mb-3 dark:text-zinc-100">
                    {data.title}
                  </h2>
                  <p className="leading-relaxed text-base">
                    {data.description}
                  </p>
                  <Link
                    className="mt-3 dark:text-indigo-500 text-indigo-200 inline-flex items-center"
                    href={data.href}
                    target="_blank"
                  >
                    {data.direction}
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="w-4 h-4 ml-2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap -m-4 text-center bg-gray-800 dark:bg-black ">
          {gitStats.map((stat, index) => (
            <div className="p-4 md:w-1/4 sm:w-1/2 w-full " key={index}>
              <div className="border-2 border-gray-200 px-4 py-6 rounded-lg">
                <stat.icon className="w-12 h-12 inline-block mb-4" />
                <h2 className="title-font font-medium text-3xl text-white">
                  {stat.count}
                </h2>
                <p className="leading-relaxed">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
