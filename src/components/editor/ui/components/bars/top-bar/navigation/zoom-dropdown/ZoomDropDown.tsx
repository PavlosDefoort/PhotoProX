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
import { useEffect, useState } from "react";
import { HIGH_ZOOM_PRESETS, MAX_ZOOM_SCALE, MIN_ZOOM_SCALE, zoomScaleToPercent } from "@/utils/PixelInspection";
import { snapCssCoordinateToDevicePixels } from "@/utils/ViewportInspection";

const ZoomDropDown: React.FC = () => {
  const {
    currentZoom,
    setCurrentZoom,
    app,
    container,
    setTargetZoom,
    targetPosition,
    targetMousePos,
    targetWorldMousePos,
    zoomFromUser,
    pixelGridEnabled,
    setPixelGridEnabled,
    pixelViewEnabled,
    setPixelViewEnabled,
  } = useCanvas();
  const { project } = useProject();
  const [typedPercent, setTypedPercent] = useState("");

  const applyZoom = (zoom: number) => {
    if (container && Number.isFinite(zoom)) {
      const clamped = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, zoom));
      console.log("Applying zoom:", zoom);
      setTargetZoom(clamped);
      zoomFromUser.current = false;
    }
  };

  const applyTypedPercent = () => {
    const percent = Number(typedPercent);
    if (Number.isFinite(percent) && percent > 0) applyZoom(percent / 100);
    setTypedPercent("");
  };

  const handlePixelView = () => {
    setPixelViewEnabled(!pixelViewEnabled);
    setPixelGridEnabled(true);
    if (currentZoom < 16) applyZoom(16);
  };

  const applyCenterZoom = (
    zoom: number,
    appWidth: number,
    appHeight: number
  ) => {
    if (container) {
      applyZoom(zoom);
      targetPosition.current.x = appWidth / 2;
      targetPosition.current.y = appHeight / 2;
      targetMousePos.current = {
        x: appWidth / 2,
        y: appHeight / 2,
      };
      targetWorldMousePos.current = {
        x: project.settings.canvasSettings.width / 2,
        y: project.settings.canvasSettings.height / 2,
      };
    }
  };

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
      applyCenterZoom(scale, appWidth, appHeight);
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
      applyCenterZoom(scale, appWidth, appHeight);
    }
  };

  const handle100Percent = () => {
    if (!container || !app.current) return;
    const canvas = app.current.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    setCurrentZoom(1);
    setTargetZoom(1);
    container.scale.set(1);
    container.displaySprite?.scale.set(1);
    zoomFromUser.current = false;
    targetPosition.current.x = snapCssCoordinateToDevicePixels(rect.width / 2, dpr);
    targetPosition.current.y = snapCssCoordinateToDevicePixels(rect.height / 2, dpr);
    container.position.set(targetPosition.current.x, targetPosition.current.y);
    container.displaySprite?.position.set(targetPosition.current.x, targetPosition.current.y);
    targetMousePos.current = { ...targetPosition.current };
    targetWorldMousePos.current = {
      x: project.settings.canvasSettings.width / 2,
      y: project.settings.canvasSettings.height / 2,
    };
  };

  const handleIncrementZoom = () => {
    if (container && currentZoom) {
      const newZoom = currentZoom + 0.1;
      const adjustedZoom = Math.min(newZoom, MAX_ZOOM_SCALE);
      applyZoom(adjustedZoom);
    }
  };

  const handleDecrementZoom = () => {
    if (container && currentZoom) {
      const newZoom = currentZoom - 0.1;
      const adjustedZoom = Math.max(newZoom, MIN_ZOOM_SCALE);
      applyZoom(adjustedZoom);
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
    <div className="w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-24 dark:bg-navbarBackground bg-navbarBackground border-0 h-5 dark:hover:bg-buttonHover hover:bg-buttonHover"
            variant="outline"
          >
            <span className="inline-block w-16 text-xs">
              {Math.round(zoomScaleToPercent(Number(currentZoom)))}%
            </span>
            <ChevronDownIcon className="ml-0.5 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Zoom Settings</DropdownMenuLabel>
          <div className="flex gap-1 px-2 py-1">
            <input
              className="h-7 w-full rounded border bg-background px-2 text-xs"
              placeholder="Zoom %"
              value={typedPercent}
              onChange={(event) => setTypedPercent(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") applyTypedPercent(); }}
              type="number"
              min="5"
              max="12800"
            />
            <Button className="h-7 px-2 text-xs" onClick={applyTypedPercent}>Set</Button>
          </div>
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
            <DropdownMenuItem onClick={handle100Percent}>
              100% (Pixel inspection)
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {HIGH_ZOOM_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset} onClick={() => applyZoom(preset)}>
                {preset * 100}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePixelView}>
            {pixelViewEnabled ? "✓ " : ""}Pixel View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPixelGridEnabled(!pixelGridEnabled)}>
            {pixelGridEnabled ? "✓ " : ""}Pixel Grid
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default ZoomDropDown;
