import { FC, useState, useEffect } from "react";
import SheetSide from "./rename";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useProjectContext } from "@/pages/editor";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Test from "@/pages/test";
interface ImageDropDownProps {
  imgName: string;
  setImgName: (value: string) => void;
}

const ImageDropDown: React.FC<ImageDropDownProps> = ({
  imgName,
  setImgName,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const openIsChanging = () => {
    console.log("open is changing");
  };
  const { project, setProject } = useProjectContext();

  useEffect(() => {
    // Create a listener for f2 key
    const keyListener = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setShowDropdown(true);
      }
    };
    document.addEventListener("keydown", keyListener);
    return () => {
      document.removeEventListener("keydown", keyListener);
    };
  });

  return (
    <div>
      <SheetSide
        open={showDropdown}
        setOpen={setShowDropdown}
        setFileName={setImgName}
        imgName={imgName}
      />
      <DropdownMenu onOpenChange={openIsChanging}>
        <DropdownMenuTrigger asChild>
          <Button
            className="dark:bg-navbarBackground bg-navbarBackground border-0 h-8 py-1 px-2 dark:hover:bg-buttonHover hover:bg-buttonHover flex items-center"
            variant="outline"
          >
            <span className="text-xs flex-grow">{project.settings.name}</span>
            <ChevronDownIcon className="w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 ">
          <DropdownMenuLabel>Project Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowDropdown(true)}>
              Rename
              <DropdownMenuShortcut>f2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Project info
              <DropdownMenuShortcut>f8</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Resize
              <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Version History
              <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default ImageDropDown;
