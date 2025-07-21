import Link from "next/link";

export const Plan: React.FC = () => {
  return (
    <section className="text-gray-600 body-font overflow-hidden dark:bg-[#111111] dark:text-white">
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col text-center w-full mb-20">
          <h1 className="sm:text-4xl text-3xl font-medium title-font mb-2 text-gray-900 dark:text-white">
            Completely Free!
          </h1>
          <p className="lg:w-2/3 mx-auto leading-relaxed text-base text-gray-500 dark:text-zinc-100">
            PhotoProX is completely free to use. No hidden fees or charges.
          </p>
        </div>
        <div className="flex flex-row items-center justify-center -m-4">
          <div className="p-4 xl:w-1/4 md:w-1/2 w-full">
            <div className="h-full p-6 rounded-lg border-2 border-gray-300 flex flex-col relative overflow-hidden">
              <h2 className="text-sm tracking-widest title-font mb-1 font-medium">
                START
              </h2>
              <h1 className="text-5xl text-gray-900 dark:text-white pb-4 mb-4 border-b border-gray-200 leading-none">
                Free
              </h1>
              <p className="flex items-center text-gray-600 dark:text-zinc-200 mb-2">
                <span className="w-4 h-4 mr-2 inline-flex items-center justify-center bg-gray-400 text-white rounded-full flex-shrink-0">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </span>
                Everything
              </p>
              <p className="flex items-center text-gray-600 dark:text-zinc-200 mb-2">
                <span className="w-4 h-4 mr-2 inline-flex items-center justify-center bg-gray-400 text-white rounded-full flex-shrink-0">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </span>
                Did we mention everything?
              </p>
              <Link href={"./editor"}>
                <button className="flex items-center mt-auto text-white bg-gray-400 border-0 py-2 px-4 w-full focus:outline-none hover:bg-gray-500 rounded">
                  Get Started
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="w-4 h-4 ml-auto"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                  </svg>
                </button>
              </Link>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-3">
                Get started today! For free!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
