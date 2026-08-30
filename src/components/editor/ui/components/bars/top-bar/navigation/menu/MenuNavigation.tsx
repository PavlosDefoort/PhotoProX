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
import { useCallback, useEffect, useRef, useState } from "react";
import ImageInput from "../../../../input/ImageInput";
import Export from "./file/Export";
import BrightnessContrastDialog from "./image/BrightnessContrastDialog";
import CurvesDialog from "./image/CurvesDialog";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { BackgroundLayer } from "@/models/project/Layers/Layers";
import { toast } from "sonner";
import {
  BEFORE_DOCUMENT_SWITCH_EVENT,
  HISTORY_REDO_EVENT,
  HISTORY_UNDO_EVENT,
  SAVE_ACTIVE_DOCUMENT_EVENT,
} from "@/components/editor/editorEvents";
import {
  getWorkspaceDocumentTitle,
  serializeWorkspaceDocument,
} from "@/models/editor/EditorWorkspace";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "@/utils/PixelInspection";
import { copyLayer, cutLayer, hasCopiedLayer, pasteLayer } from "@/utils/LayerUtils";
import {
  isFilePickerCancellation,
  isSupportedImageFile,
  openDocumentWithPicker,
  supportsFileSystemAccess,
} from "@/utils/DocumentSave";

const MenuNavigation: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
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
    pixelGridEnabled,
    setPixelGridEnabled,
  } = useCanvas();
  const {
   activeDocument,
   createBlankDocument,
   markDocumentSaved,
   project,
   layerManager,
   setLayerManager,
   openProjectFile,
   openImageFile,
   loading,
   undoRedoManager,
  } = useProject();
  const selectedLayer = findLayer(layerManager.layers, layerManager.target);
  const hasEditableImage = selectedLayer instanceof ImageLayer;
  const hasActiveDocument = activeDocument !== null;
  const canEditLayer = !!selectedLayer && !(selectedLayer instanceof BackgroundLayer);
  const handleCopy = useCallback(() => { if (selectedLayer) copyLayer(selectedLayer); }, [selectedLayer]);
  const handlePaste = useCallback(() => { void pasteLayer(layerManager, setLayerManager); }, [layerManager, setLayerManager]);
  const handleCut = useCallback(() => { if (selectedLayer) cutLayer(selectedLayer, setLayerManager); }, [selectedLayer, setLayerManager]);

  const handleOpen = useCallback(async () => {
    if (!supportsFileSystemAccess()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const selected = await openDocumentWithPicker();
      if (!selected) return;
      const lowerName = selected.file.name.toLowerCase();
      if (lowerName.endsWith(".zyn") || lowerName.endsWith(".json")) {
        await openProjectFile(selected.file, selected.handle);
      } else if (isSupportedImageFile(selected.file)) {
        await openImageFile(selected.file, selected.handle);
      } else {
        toast.error("Choose a PNG, JPEG, WebP, or Zynalo project file.");
      }
    } catch (error) {
      if (!isFilePickerCancellation(error)) {
        console.error("Failed to open file", error);
        toast.error("The selected file could not be opened.");
      }
    }
  }, [openImageFile, openProjectFile]);

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
    const adjustedZoom = Math.min(currentZoom + 0.1, MAX_ZOOM_SCALE);
    applyZoom(adjustedZoom);
    clearFocusedMenuItem();
  };

  const handleDecrementZoom = () => {
    const adjustedZoom = Math.max(currentZoom - 0.1, MIN_ZOOM_SCALE);
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

  useEffect(() => {
    const handleOpenShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "o") return;
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.isContentEditable
      ) return;
      event.preventDefault();
      void handleOpen();
    };
    window.addEventListener("keydown", handleOpenShortcut);
    return () => window.removeEventListener("keydown", handleOpenShortcut);
  }, [handleOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (!["x", "c", "v"].includes(key)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.isContentEditable) return;
      event.preventDefault();
      if (key === "x") handleCut(); else if (key === "c") handleCopy(); else handlePaste();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopy, handleCut, handlePaste]);

  useEffect(() => {
    const handleDocumentSwitch = () => {
      setBrightnessContrastOpen(false);
      setCurvesOpen(false);
    };

    window.addEventListener(BEFORE_DOCUMENT_SWITCH_EVENT, handleDocumentSwitch);
    return () => {
      window.removeEventListener(
        BEFORE_DOCUMENT_SWITCH_EVENT,
        handleDocumentSwitch,
      );
    };
  }, []);

  const downloadProject = (fileName: string) => {
    if (!activeDocument) return;

    const lastDot = fileName.lastIndexOf(".");
    const projectName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
    const normalizedName = `${projectName}.zyn`;
    const blob = new Blob([serializeWorkspaceDocument(activeDocument)], {
      type: "application/vnd.zyn+json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = normalizedName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    markDocumentSaved(activeDocument.id, { fileName: normalizedName });
    toast.success(`Saved ${normalizedName}`);
  };

  const handleSave = async () => {
    if (!activeDocument) {
      toast.warning("Open a document before saving.");
      return;
    }

    window.dispatchEvent(new Event(SAVE_ACTIVE_DOCUMENT_EVENT));
  };

  const handleSaveAs = async () => {
    if (!activeDocument) {
      toast.warning("Open a document before saving.");
      return;
    }

    const currentFileName = activeDocument.fileName ?? "Untitled";
    const lastDot = currentFileName.lastIndexOf(".");
    const suggestedName = lastDot > 0
      ? currentFileName.slice(0, lastDot)
      : currentFileName;
    const input = window.prompt("Save document as", suggestedName);
    if (input === null) {
      return;
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      toast.error("Please provide a file name.");
      return;
    }

    downloadProject(trimmed);
  };

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
        <input
          ref={projectFileInputRef}
          type="file"
          accept=".json,.zyn,application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) await openProjectFile(file);
          }}
        />

        <MenubarMenu>
          <MenubarTrigger className={triggerClassName}>
            {" "}
            File
            {/* <HamburgerMenuIcon className=" mr-1 text-gray-600 dark:text-gray-100" /> */}
          </MenubarTrigger>

          <MenubarContent onCloseAutoFocus={handleCloseAutoFocus}>
            <MenubarItem onClick={() => createBlankDocument()}>
              New
              <MenubarShortcut>Ctrl+N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => void handleOpen()}>
              Open
              <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              disabled={loading}
              onClick={() => supportsFileSystemAccess()
                ? void handleOpen()
                : projectFileInputRef.current?.click()}
            >
              Open Project
            </MenubarItem>

            <MenubarItem disabled={!hasActiveDocument} onClick={handleSave}>
              Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled={!hasActiveDocument} onClick={handleSaveAs}>
              Save As…
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
            <MenubarItem disabled={undoRedoManager.undoStack.length === 0} onSelect={() => window.dispatchEvent(new Event(HISTORY_UNDO_EVENT))}>
              {undoRedoManager.undoStack.length ? `Undo ${undoRedoManager.undoStack[undoRedoManager.undoStack.length - 1].title}` : "Undo"} <MenubarShortcut>Ctrl+Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled={undoRedoManager.redoStack.length === 0} onSelect={() => window.dispatchEvent(new Event(HISTORY_REDO_EVENT))}>
              {undoRedoManager.redoStack.length ? `Redo ${undoRedoManager.redoStack[undoRedoManager.redoStack.length - 1].title}` : "Redo"} <MenubarShortcut>Ctrl+Y</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger disabled>Find (Unavailable)</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Search the web</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem disabled={!canEditLayer} onSelect={handleCut}>Cut <MenubarShortcut>Ctrl+X</MenubarShortcut></MenubarItem>
            <MenubarItem disabled={!canEditLayer} onSelect={handleCopy}>Copy <MenubarShortcut>Ctrl+C</MenubarShortcut></MenubarItem>
            <MenubarItem disabled={!hasCopiedLayer()} onSelect={handlePaste}>Paste <MenubarShortcut>Ctrl+V</MenubarShortcut></MenubarItem>
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
            <MenubarItem
              className={viewItemClassName}
              onSelect={() => setPixelGridEnabled(!pixelGridEnabled)}
            >
              {pixelGridEnabled ? "✓ " : ""}Document Pixel Grid
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
            <MenubarItem inset>Add Zynalo As Bookmark</MenubarItem>
            <MenubarItem inset>About Zynalo.</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};
export default MenuNavigation;
