import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { fillImageToScreen, fitImageToScreen } from "@/utils/CalcUtils";
import { useEffect, useRef, useState } from "react";
import ImageInput from "../../../../input/ImageInput";
import Export from "./file/Export";
import BrightnessContrastDialog from "./image/BrightnessContrastDialog";
import CurvesDialog from "./image/CurvesDialog";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";

const MenuNavigation: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [imageType, setImageType] = useState("jpeg");
  const [trigger, setTrigger] = useState(false);
  const [brightnessContrastOpen, setBrightnessContrastOpen] = useState(false);
  const [curvesOpen, setCurvesOpen] = useState(false);
  const {
    app,
    container,
    currentZoom,
    setTargetZoom,
    targetPosition,
    targetMousePos,
    targetWorldMousePos,
    zoomFromUser,
  } = useCanvas();
  const { project, layerManager } = useProject();
  const selectedLayer = findLayer(layerManager.layers, layerManager.target);
  const hasEditableImage = selectedLayer instanceof ImageLayer;

  const triggerClassName =
    "hover:bg-zinc-200 dark:hover:bg-zinc-700 focus-visible:!bg-zinc-200 dark:focus-visible:!bg-zinc-700 data-[state=open]:!bg-zinc-200 dark:data-[state=open]:!bg-zinc-700";
  const viewItemClassName =
    "focus-visible:!bg-zinc-200 dark:focus-visible:!bg-zinc-700 data-[highlighted]:!bg-zinc-200 dark:data-[highlighted]:!bg-zinc-700";

  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    clearFocusedMenuItem();
  };

  const clearFocusedMenuItem = () => {
    requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  };

  const applyZoom = (zoom: number) => {
    if (!container) return;
    setTargetZoom(zoom);
    zoomFromUser.current = false;
  };

  const applyCenterZoom = (
    zoom: number,
    appWidth: number,
    appHeight: number,
  ) => {
    if (!container) return;

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
  };

  const handleFitToScreen = () => {
    if (app.current && container && project.settings.canvasSettings) {
      const appWidth = app.current.renderer.width;
      const appHeight = app.current.renderer.height;
      const scale = fitImageToScreen(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height,
        appWidth,
        appHeight,
        0,
      );
      applyCenterZoom(scale, appWidth, appHeight);
    }
    clearFocusedMenuItem();
  };

  const handleFillToScreen = () => {
    if (app.current && container && project.settings.canvasSettings) {
      const appWidth = app.current.renderer.width;
      const appHeight = app.current.renderer.height;
      const scale = fillImageToScreen(
        project.settings.canvasSettings.width,
        project.settings.canvasSettings.height,
        appWidth,
        appHeight,
        1,
      );
      applyCenterZoom(scale, appWidth, appHeight);
    }
    clearFocusedMenuItem();
  };

  const handleIncrementZoom = () => {
    const adjustedZoom = Math.min(currentZoom + 0.1, 5);
    applyZoom(adjustedZoom);
    clearFocusedMenuItem();
  };

  const handleDecrementZoom = () => {
    const adjustedZoom = Math.max(currentZoom - 0.1, 0.05);
    applyZoom(adjustedZoom);
    clearFocusedMenuItem();
  };

  // Listen for ctrl + E to export
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        setTrigger(true);
        // triggerRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div>
      <Export
        imageType={imageType}
        setImageType={setImageType}
        triggerRef={triggerRef}
        allLayers={!true}
        openTrigger={trigger}
        setOpenTrigger={setTrigger}
      />
      <BrightnessContrastDialog open={brightnessContrastOpen} onOpenChange={setBrightnessContrastOpen} />
      <CurvesDialog open={curvesOpen} onOpenChange={setCurvesOpen} />

      <Menubar className="h-2 flex justify-center items-center border-0 bg-navbarBackground dark:bg-navbarBackground">
        <ImageInput inputRef={fileInputRef} />

        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>
            {" "}
            File
            {/* <HamburgerMenuIcon className=" mr-1 text-gray-600 dark:text-gray-100" /> */}
          </MenubarTrigger>

          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarItem onClick={() => fileInputRef.current?.click()}>
              Open
              <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>

            <MenubarItem>
              Save Project <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />

            <MenubarSub>
              <MenubarSubTrigger className="">
                Export As
                <MenubarShortcut>Ctrl+E</MenubarShortcut>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={(e) => {
                    e.preventDefault();

                    setTrigger(true);
                    setImageType("png");
                    triggerRef.current?.click();
                  }}
                >
                  PNG
                </MenubarItem>
                <MenubarItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTrigger(true);
                    setImageType("jpeg");
                    triggerRef.current?.click();
                  }}
                >
                  JPEG
                </MenubarItem>
                <MenubarItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTrigger(true);
                    setImageType("webp");
                    triggerRef.current?.click();
                  }}
                >
                  WebP
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            {/* <MenubarSeparator /> */}

            {/* <MenubarItem>
            Export Layers<MenubarShortcut>Ctrl+Alt+E</MenubarShortcut>
          </MenubarItem> */}
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>Edit</MenubarTrigger>
          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Search the web</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>Image</MenubarTrigger>
          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarSub>
              <MenubarSubTrigger>Adjustments</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem disabled={!hasEditableImage} onSelect={() => setBrightnessContrastOpen(true)}>
                  Brightness/Contrast…
                </MenubarItem>
                <MenubarItem disabled={!hasEditableImage} onSelect={() => setCurvesOpen(true)}>
                  Curves…
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>Filter</MenubarTrigger>
          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarItem disabled>No filters available</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>View</MenubarTrigger>
          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarItem
              className={viewItemClassName}
              onSelect={handleIncrementZoom}
            >
              Zoom In
            </MenubarItem>
            <MenubarItem
              className={viewItemClassName}
              onSelect={handleDecrementZoom}
            >
              Zoom Out
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              className={viewItemClassName}
              inset
              onSelect={handleFitToScreen}
            >
              Fit to Screen <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              className={viewItemClassName}
              inset
              onSelect={handleFillToScreen}
            >
              Fill Screen <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem className={viewItemClassName} inset>
              Toggle Fullscreen
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem className={viewItemClassName} inset>
              Ruler
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem className={viewItemClassName} inset>
              Mode
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>More</MenubarTrigger>
          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarRadioGroup value="benoit">
              <MenubarRadioItem value="andy">Language</MenubarRadioItem>
              <MenubarRadioItem value="benoit">Theme</MenubarRadioItem>
              <MenubarRadioItem value="Luis">
                Keyboard Shortcuts
              </MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Device Specs</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Add PhotoProX As Bookmark</MenubarItem>
            <MenubarItem inset>About PhotoProX.</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};
export default MenuNavigation;
