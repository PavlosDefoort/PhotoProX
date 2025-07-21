import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import RenameProject from "./components/RenameProject";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/hooks/useProject";
import ResizeProject from "./components/ResizeProject";
import ProjectInfo from "./components/ProjectInfo";

const ProjectDropDown: React.FC = () => {
  const [showRename, setShowRename] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [somethingOpen, setSomethingOpen] = useState(false);
  const { project, setProject } = useProject();

  useEffect(() => {
    setSomethingOpen(showRename || showInfo || showResize);
  }, [showRename, showInfo, showResize]);

  useEffect(() => {
    // Create a listener for f2 key
    const keyListener = (e: KeyboardEvent) => {
      if (e.key === "F2" && !somethingOpen) {
        e.preventDefault();
        setShowRename(true);
      } else if (e.key === "F8" && !somethingOpen) {
        e.preventDefault();
        setShowInfo(true);
      }
    };
    // Create a listener for ctrl + r
    const keyListener2 = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "r" && !somethingOpen) {
        e.preventDefault();
        setShowResize(true);
      }
    };

    // Create a listener for 'esc' key
    const escListener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && somethingOpen) {
        setShowRename(false);
        setShowInfo(false);
        setShowResize(false);
      }
    };

    document.addEventListener("keydown", keyListener);
    document.addEventListener("keydown", keyListener2);
    document.addEventListener("keydown", escListener);
    return () => {
      document.removeEventListener("keydown", keyListener);
      document.removeEventListener("keydown", keyListener2);
      document.removeEventListener("keydown", escListener);
    };
  });

  return (
    <div className="">
      <ProjectInfo open={showInfo} setOpen={setShowInfo} />
      <RenameProject open={showRename} setOpen={setShowRename} />
      <ResizeProject open={showResize} setOpen={setShowResize} />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            className="dark:bg-navbarBackground bg-navbarBackground border-0 h-8 py-1 px-2 dark:hover:bg-buttonHover hover:bg-buttonHover flex items-center"
            variant="outline"
          >
            <span className="text-xs flex-grow">{project.settings.name}</span>
            <ChevronDownIcon className="w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Project Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setShowRename(true);
              }}
            >
              Rename
              <DropdownMenuShortcut>f2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setShowInfo(true);
              }}
            >
              Project info
              <DropdownMenuShortcut>f8</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setShowResize(true);
              }}
            >
              Resize Project
              <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
            </DropdownMenuItem>
            {/* <DropdownMenuItem>
              Version History
              <DropdownMenuShortcut>Ctrl+H</DropdownMenuShortcut>
            </DropdownMenuItem> */}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ProjectDropDown;
