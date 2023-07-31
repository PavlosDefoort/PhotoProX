import Link from "next/link";
import Image from "next/image";

const TopBar = () => {
  return (
    <nav className="fixed top-0 z-40 w-full bg-white dark:bg-[#3b3b3b] border-b border-gray-500">
      <div className="px-3 py-3 lg:px-5 lg:pl-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex md:mr-24">
              <Image
                width={35}
                height={35}
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/1051px-Adobe_Photoshop_CC_icon.svg.png"
                className="h-8 mr-3"
                alt="PhotoProX Logo"
              />
              <span className="self-center text-black dark:text-white text-xl font-semibold sm:text-2xl whitespace-nowrap ">
                PhotoProX
              </span>
            </Link>
          </div>
          <div className="mr-7"></div>
        </div>
      </div>
    </nav>
  );
};
export default TopBar;
