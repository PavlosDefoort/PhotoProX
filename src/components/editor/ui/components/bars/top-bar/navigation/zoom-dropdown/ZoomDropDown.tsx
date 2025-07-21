import { Button } from "@/components/ui/button";
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
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { fillImageToScreen, fitImageToScreen } from "@/utils/CalcUtils";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { set } from "lodash";
import { useEffect } from "react";

const ZoomDropDown: React.FC = () => {
  const { currentZoom, setCurrentZoom, app, container, setContainer } =
    useCanvas();
  const { project } = useProject();

  const handleFitToScreen = () => {
    // Fit to screen
    if (app.current && container && project.settings.canvasSettings) {
      const appWidth = app.current.renderer.width;
      const appHeight = app.current.renderer.height;
      const scale = fitImageToScreen(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height,
        appWidth,
        appHeight,
        0
      );
      container.scale.set(scale);
      container.position.set(appWidth / 2, appHeight / 2);
      setCurrentZoom(scale);
      setContainer(container);
    }
  };

  const handleFillToScreen = () => {
    // Fill screen
    if (app.current && container && project.settings.canvasSettings) {
      const appWidth = app.current.renderer.width;
      const appHeight = app.current.renderer.height;
      const scale = fillImageToScreen(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height,
        appWidth,
        appHeight,
        1
      );
      container.scale.set(scale);
      container.position.set(appWidth / 2, appHeight / 2);
      setCurrentZoom(scale);
      setContainer(container);
    }
  };

  const handleIncrementZoom = () => {
    if (container && currentZoom) {
      const newZoom = currentZoom + 0.1;
      const adjustedZoom = Math.min(newZoom, 5);
      container.scale.set(adjustedZoom);
      setCurrentZoom(adjustedZoom);
      setContainer(container);
    }
  };

  const handleDecrementZoom = () => {
    if (container && currentZoom) {
      const newZoom = currentZoom - 0.1;
      const adjustedZoom = Math.max(newZoom, 0.1);
      container.scale.set(adjustedZoom);
      setCurrentZoom(adjustedZoom);
      setContainer(container);
    }
  };

  useEffect(() => {
    // Listen for ctrl + 0 and ctrl + 9
    // Ctrl + 0 = Fit to screen
    // Ctrl + 9 = Fill screen
    // Ctrl + = = Increment zoom
    // Ctrl + (-) = Decrement zoom

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        handleFitToScreen();
      } else if (e.ctrlKey && e.key === "9") {
        e.preventDefault();
        handleFillToScreen();
      } else if (e.ctrlKey && e.key === "=") {
        e.preventDefault();
        handleIncrementZoom();
      } else if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        handleDecrementZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <div className="w-16">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-24 dark:bg-navbarBackground bg-navbarBackground border-0 h-5 dark:hover:bg-buttonHover hover:bg-buttonHover"
            variant="outline"
          >
            <span className="inline-block w-16 text-xs">
              {Math.round(Number(currentZoom) * 100)}%
            </span>
            <ChevronDownIcon className="ml-0.5 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Zoom Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Zoom in
              <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>
              Zoom out
              <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => handleFitToScreen()}>
              Fit to screen
              <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFillToScreen()}>
              Fill screen
              <DropdownMenuShortcut>Ctrl+9</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default ZoomDropDown;
