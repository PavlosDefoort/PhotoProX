import { Fragment, useEffect, useRef, useState, FC } from "react";
import { Button } from "@/components/ui/button";
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

interface DropDownProps {
  zoomValue: string;
  requestFill: () => void;
  requestFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { ZoomIn } from "lucide-react";

const DropDown: React.FC<DropDownProps> = ({
  zoomValue,
  requestFill,
  requestFit,
  zoomIn,
  zoomOut,
}) => {
  return (
    <div className="w-16">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-24 dark:bg-navbarBackground bg-navbarBackground border-0 h-5 dark:hover:bg-buttonHover hover:bg-buttonHover"
            variant="outline"
          >
            <span className="inline-block w-16 text-xs">{zoomValue}%</span>
            <ChevronDownIcon className="ml-0.5 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Zoom Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={zoomIn}>
              Zoom in
              <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={zoomOut}>
              Zoom out
              <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={requestFit}>
              Fit to screen
              <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={requestFill}>
              Fill screen
              <DropdownMenuShortcut>Ctrl+9</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default DropDown;
