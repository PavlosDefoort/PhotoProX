import { CanvasContext } from "@/context/CanvasContext";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import {
  getDocumentFileBaseName,
  getDocumentCloseRequirement,
  getWorkspaceDocumentTitle,
} from "@/models/editor/EditorWorkspace";
import { GetInfo } from "@/services/GpuInfo";
import { clamp, getOptimalInitialZoom } from "@/utils/CalcUtils";
import { TierResult } from "detect-gpu";
import { Application } from "pixi.js";
import React, {
  createRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { emitBeforeDocumentSwitch, SAVE_ACTIVE_DOCUMENT_EVENT } from "./editorEvents";
import ImageSelector from "./tasks/ImageSelector";
import MovementHandler from "./tasks/MovementLogic";
import UpdateCanvas, { UpdateCanvasProps } from "./tasks/UpdateCanvas";
import LayerBar from "./ui/components/bars/layer-bar/LayerBar";
import ToolBar from "./ui/components/bars/tool-bar/ToolBar";
import MoveTool from "./ui/components/bars/tool-bar/tools/move/MoveTool";
import TransformTool from "./ui/components/bars/tool-bar/tools/transform/TransformTool";
import CropTool from "./ui/components/bars/tool-bar/tools/crop/CropTool";
import LassoTool, { LassoVariant } from "./ui/components/bars/tool-bar/tools/lasso/LassoTool";
import ShowMePanel from "@/features/show-me/ShowMePanel";
import TopBar from "./ui/components/bars/top-bar/TopBar";
import CreateProject from "./ui/modals/CreateProject";
import DocumentTabs from "./ui/components/document-tabs/DocumentTabs";
import CloseDocumentDialog from "./ui/components/document-tabs/CloseDocumentDialog";
import SaveDocumentDialog from "./ui/components/document-tabs/SaveDocumentDialog";
import PixelGridOverlay from "./tasks/PixelGridOverlay";
import type { SelectionCombineMode } from "@/interfaces/editor/EditDocument";
import CrossProjectDragOverlay from "./CrossProjectDragOverlay";
import { crossProjectDragSession } from "@/models/editor/CrossProjectDragSession";
import { CanvasSource, Texture } from "pixi.js";
import { SpriteX } from "@/models/pixi-extends/SpriteX";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { checkZIndex, removeLayer } from "@/models/project/LayerManager";
import { Command } from "@/interfaces/UndoRedoInterfaces";
import { DocumentImageType, DocumentSaveTarget } from "@/interfaces/editor/EditorWorkspace";
import {
  createFlattenedBlob,
  createProjectBlob,
  getCtrlSSaveAction,
  isFilePickerCancellation,
  pickFlattenedSaveTarget,
  pickProjectSaveTarget,
  supportsFileSystemAccess,
  saveToTarget,
} from "@/utils/DocumentSave";

const PhotoEditor: React.FC = () => {
  const {
    activeDocument,
    activeDocumentId,
    activateDocument,
    closeDocument,
    cycleDocuments,
    editMode,
    setEditDocument,
    setLayerManager,
    setUndoRedoManager,
    layerManager,
    markDocumentSaved,
    project,
    reorderDocuments,
    setEditMode,
    updateActiveCanvasView,
    workspace,
  } = useProject();
  const { darkMode } = useTheme();

  const [canvasWidth, setCanvasWidth] = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1000);
  const [windowWidth, setWindowWidth] = useState(0);
  const [gpuFactor, setGpuFactor] = useState(1);
  const [windowHeight, setWindowHeight] = useState(0);
  const [pendingCloseDocumentId, setPendingCloseDocumentId] = useState<
    string | null
  >(null);
  const [saveDialogDocumentId, setSaveDialogDocumentId] = useState<string | null>(null);
  const [saveDialogFormat, setSaveDialogFormat] = useState<DocumentImageType>("png");
  const [saveBusy, setSaveBusy] = useState(false);
  const saveInFlightRef = useRef(new Set<string>());
  const [editorChromeVisible, setEditorChromeVisible] = useState(true);
  const targetPosition = useRef({ x: 0, y: 0 });
  const pendingZoomSnap = useRef<{ zoom: number; x: number; y: number } | null>(null);
  const pendingInitialFitFrame = useRef<number | null>(null);
  const [updateCanvasProps, setUpdateCanvasProps] = useState<UpdateCanvasProps>(
    {
      adjustedHeight: 0,
      adjustedWidth: 0,
      canvas: null,
      app: createRef<Application | null>(),
      container: null,
      setContainer: () => {},
      targetPosition,
    },
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const [container, setContainer] = useState<ContainerX | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [targetZoom, setTargetZoom] = useState(1);
  // Enabled by default; the visibility threshold still keeps it hidden below
  // 800%, and the View menu can disable it independently.
  const [pixelGridEnabled, setPixelGridEnabled] = useState(true);
  const [pixelViewEnabled, setPixelViewEnabled] = useState(false);
  const [lassoVariant, setLassoVariant] = useState<LassoVariant>("lasso");
  const [lassoMode, setLassoMode] = useState<SelectionCombineMode>("new");
  const target = useRef<HTMLDivElement | null>(null);
  const targetMousePos = useRef({ x: 0, y: 0 });
  const targetWorldMousePos = useRef({ x: 0, y: 0 });
  const zoomFromUser = useRef(false);
  const realNaturalWidth = useRef(project.settings.canvasSettings.width);
  const realNaturalHeight = useRef(project.settings.canvasSettings.height);
  const suppressViewPersistenceRef = useRef(false);

  useEffect(() => {
    const handleDrop = (event: Event) => {
      const detail = (event as CustomEvent<{ session: NonNullable<ReturnType<typeof crossProjectDragSession.get>>; clientX: number; clientY: number }>).detail;
      const session = detail.session;
      const renderer = appRef.current?.renderer;
      const destinationCanvas = canvasRef.current;
      if (!activeDocument || !container || !renderer || !destinationCanvas || session.sourceProjectId === activeDocument.id) return;
      const rect = destinationCanvas.getBoundingClientRect();
      if (detail.clientX < rect.left || detail.clientX > rect.right || detail.clientY < rect.top || detail.clientY > rect.bottom) return;
      const globalPoint = {
        x: ((detail.clientX - rect.left) / rect.width) * renderer.screen.width,
        y: ((detail.clientY - rect.top) / rect.height) * renderer.screen.height,
      };
      const localPointer = container.displaySprite
        ? container.displaySprite.toLocal(globalPoint)
        : container.toLocal(globalPoint);
      const displayWidth = session.payload.displayWidth ?? session.payload.width;
      const displayHeight = session.payload.displayHeight ?? session.payload.height;
      const grabX = displayWidth ? (session.grabOffsetX / displayWidth) * session.payload.width : 0;
      const grabY = displayHeight ? (session.grabOffsetY / displayHeight) * session.payload.height : 0;
      const rasterCanvas = document.createElement("canvas");
      rasterCanvas.width = session.payload.width;
      rasterCanvas.height = session.payload.height;
      rasterCanvas.getContext("2d")?.putImageData(new ImageData(session.payload.pixels, rasterCanvas.width, rasterCanvas.height), 0, 0);
      const src = rasterCanvas.toDataURL("image/png");
      const sprite = SpriteX.from(new Texture(new CanvasSource({ resource: rasterCanvas, width: rasterCanvas.width, height: rasterCanvas.height })), false);
      sprite.position.set(localPointer.x - grabX, localPointer.y - grabY);
      const layer = new ImageLayer(layerManager.layers.length, session.payload.name, { src, imageWidth: rasterCanvas.width, imageHeight: rasterCanvas.height, name: session.payload.name, fullResolutionSrc: src, fullResolutionWidth: rasterCanvas.width, fullResolutionHeight: rasterCanvas.height }, sprite);
      layer.opacity = session.payload.opacity;
      const insertAtTop = () => {
        setLayerManager((draft) => {
          draft.layers = removeLayer(draft.layers, layer.id);
          draft.layers.push(layer);
          draft.layers = checkZIndex(draft.layers);
          const inserted = draft.layers[draft.layers.length - 1];
          inserted.zIndex = draft.layers.length - 1;
          if (inserted instanceof ImageLayer) inserted.sprite.zIndex = inserted.zIndex + 2;
          draft.target = layer.id;
        });
        container.compositeNeeded = true;
      };
      const removeDroppedLayer = () => {
        setLayerManager((draft) => {
          draft.layers = checkZIndex(removeLayer(draft.layers, layer.id));
          if (draft.target === layer.id) draft.target = "";
        });
        layer.sprite.removeFromParent();
        container.compositeNeeded = true;
      };
      const command: Command = { title: "Drop content from another project", execute: insertAtTop, undo: removeDroppedLayer, redo: insertAtTop };
      command.execute();
      setUndoRedoManager((draft) => { draft.undoStack.push(command); draft.redoStack = []; });
    };
    window.addEventListener("zynalo:cross-project-drop", handleDrop);
    return () => window.removeEventListener("zynalo:cross-project-drop", handleDrop);
  }, [activeDocument, container, layerManager.layers.length, setLayerManager, setUndoRedoManager]);

  const prepareForDocumentChange = useCallback(() => {
    emitBeforeDocumentSwitch();
    if (editMode !== "move") {
      setEditMode("move");
    }
  }, [editMode, setEditMode]);

  const persistCanvasView = useCallback(
    (documentId: string | null) => {
      if (!documentId || suppressViewPersistenceRef.current) {
        return;
      }
      updateActiveCanvasView({
        currentZoom,
        targetZoom,
        position: {
          x: targetPosition.current.x,
          y: targetPosition.current.y,
        },
        initialized: true,
      });
    },
    [currentZoom, targetZoom, updateActiveCanvasView],
  );

  const performSave = useCallback(
    async (documentId: string, target: DocumentSaveTarget) => {
      const workspaceDocument = workspace.openDocuments.find(
        (candidate) => candidate.id === documentId,
      );
      if (!workspaceDocument) {
        toast.warning("Open a document before saving.");
        return false;
      }
      if (saveInFlightRef.current.has(documentId)) return false;
      saveInFlightRef.current.add(documentId);

      try {
        const isProject = target.kind === "zyn-project" ||
          (target.kind === "download-fallback" && target.format === "zyn");
        const imageFormat = target.kind === "source-image" || target.kind === "flattened-image"
          ? target.format
          : target.kind === "download-fallback" && target.format !== "zyn"
            ? target.format
            : undefined;
        const result = await saveToTarget(
          target,
          () => {
            if (target.kind === "zyn-project" ||
                (target.kind === "download-fallback" && target.format === "zyn")) {
              return createProjectBlob(workspaceDocument, target.fileName);
            }
            const app = appRef.current;
            if (!app || !container || documentId !== activeDocumentId) {
              throw new Error("The document canvas is not ready to save.");
            }
            if (!imageFormat) {
              throw new Error("The image save format is invalid.");
            }
            return createFlattenedBlob(app, container, imageFormat);
          },
          () => markDocumentSaved(documentId, {
            fileName: target.kind === "source-image" ? undefined : target.fileName,
            preferredImageType: imageFormat,
            saveTarget: target,
          }),
        );
        if (result.status === "permission-denied") {
          toast.error("Zynalo does not have permission to write to that file.");
          return false;
        }
        toast.success(
          target.kind === "download-fallback"
            ? `Downloaded ${target.fileName}`
            : `Saved ${target.fileName}`,
        );
        return true;
      } catch (error) {
        if (isFilePickerCancellation(error)) return false;
        console.error("Failed to save document", error);
        const message = error instanceof DOMException && error.name === "NotAllowedError"
          ? "Zynalo does not have permission to write to that file."
          : error instanceof Error ? error.message : "The document could not be saved.";
        toast.error(message);
        return false;
      } finally {
        saveInFlightRef.current.delete(documentId);
      }
    },
    [activeDocumentId, container, markDocumentSaved, workspace.openDocuments],
  );

  const saveDocument = useCallback(
    async (documentId: string) => {
      const workspaceDocument = workspace.openDocuments.find(
        (candidate) => candidate.id === documentId,
      );
      if (!workspaceDocument) {
        toast.warning("Open a document before saving.");
        return false;
      }
      const action = getCtrlSSaveAction(workspaceDocument);
      if (action.kind === "save") {
        return performSave(documentId, action.target);
      }
      setSaveDialogFormat(workspaceDocument.preferredImageType);
      setSaveDialogDocumentId(documentId);
      return false;
    },
    [performSave, workspace.openDocuments],
  );

  useEffect(() => {
    const handleDeselect = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "d") return;
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || activeElement?.isContentEditable) return;
      if (!layerManager.target) return;
      event.preventDefault();
      setEditDocument(draft => { delete draft.selections[layerManager.target]; });
    };
    window.addEventListener("keydown", handleDeselect);
    return () => window.removeEventListener("keydown", handleDeselect);
  }, [layerManager.target, setEditDocument]);

  useEffect(() => {
    if (
      project.settings.canvasSettings.width != null &&
      project.settings.canvasSettings.height != null
    ) {
      realNaturalWidth.current = project.settings.canvasSettings.width;
      realNaturalHeight.current = project.settings.canvasSettings.height;
    }
  }, [
    project.settings.canvasSettings.width,
    project.settings.canvasSettings.height,
  ]);

  useEffect(() => {
    const stageContainer = document.getElementById("stage-container");
    if (!stageContainer) return;

    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setWindowWidth(stageContainer.clientWidth);
        setWindowHeight(stageContainer.clientHeight);
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(stageContainer);
    handleResize();

    return () => {
      resizeObserver.unobserve(stageContainer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;

    if (app && app.renderer) {
      app.renderer.background.color = darkMode ? 0x1e1e1e : 0xcdcdcd;
    }
  }, [darkMode]);

  useEffect(() => {
    if (layerManager.layers.length > 0) {
      const adjustWidth = Math.round(windowWidth ?? 0);
      const adjustHeight = Math.round(windowHeight ?? 0);
      setCanvasWidth(adjustWidth);
      setCanvasHeight(adjustHeight);
    }
  }, [gpuFactor, windowWidth, windowHeight, project, layerManager.layers.length]);

  useEffect(() => {
    GetInfo().then((gpu: TierResult) => {
      if (gpu.tier === 0) {
        setGpuFactor(1);
      } else if (gpu.tier === 1) {
        setGpuFactor(1);
      } else if (gpu.tier === 2 || gpu.fps! <= 100) {
        setGpuFactor(1.25);
      } else if (gpu.tier === 3) {
        const fpsFactor = clamp(gpu.fps! / 100, 1.25, 2);
        setGpuFactor(fpsFactor);
      } else {
        setGpuFactor(1);
      }
    });
  }, []);

  useEffect(() => {
    setUpdateCanvasProps({
      adjustedWidth: canvasWidth,
      adjustedHeight: canvasHeight,
      canvas: canvasRef.current,
      container,
      app: appRef,
      setContainer,
      targetPosition,
    });
  }, [canvasWidth, canvasHeight, container]);

  useLayoutEffect(() => {
    if (!activeDocument) {
      if (pendingInitialFitFrame.current !== null) {
        cancelAnimationFrame(pendingInitialFitFrame.current);
        pendingInitialFitFrame.current = null;
      }
      suppressViewPersistenceRef.current = true;
      setCurrentZoom(1);
      setTargetZoom(1);
      targetPosition.current = { x: 0, y: 0 };
      suppressViewPersistenceRef.current = false;
      return;
    }

    const applyView = () => {
      suppressViewPersistenceRef.current = true;

      const savedView = activeDocument.canvasView;
      const hasMeaningfulSavedView =
        savedView.currentZoom !== 1 ||
        savedView.targetZoom !== 1 ||
        savedView.position.x !== 0 ||
        savedView.position.y !== 0;

      if (savedView.initialized && hasMeaningfulSavedView) {
        const zoom = savedView.currentZoom;
        const pos = {
          x: savedView.position.x,
          y: savedView.position.y,
        };
        setCurrentZoom(zoom);
        setTargetZoom(savedView.targetZoom);
        targetPosition.current = pos;
        // Snap the animation loop synchronously on the next frame
        pendingZoomSnap.current = { zoom, ...pos };
      } else {
        if (pendingInitialFitFrame.current !== null) {
          cancelAnimationFrame(pendingInitialFitFrame.current);
        }

        // Toolbars, tabs, and side panels can finish resizing after this
        // layout effect. Measure once more on the next frame and use that
        // final stage rectangle as the sole coordinate space for both fit and
        // centering.
        pendingInitialFitFrame.current = requestAnimationFrame(() => {
          pendingInitialFitFrame.current = null;
          const stage = target.current;
          const pixiApp = appRef.current;
          if (!stage || !pixiApp || !container) return;

          const availableWidth = Math.max(1, Math.round(stage.clientWidth));
          const availableHeight = Math.max(1, Math.round(stage.clientHeight));

          pixiApp.renderer.resize(availableWidth, availableHeight);
          pixiApp.canvas.style.width = `${availableWidth}px`;
          pixiApp.canvas.style.height = `${availableHeight}px`;

          const fittedZoom = getOptimalInitialZoom(
            activeDocument.project.settings.canvasSettings.width,
            activeDocument.project.settings.canvasSettings.height,
            Math.max(1, availableWidth - 96),
            Math.max(1, availableHeight - 96),
            0,
          );
          const nextPosition = {
            x: availableWidth / 2,
            y: availableHeight / 2,
          };

          setCurrentZoom(fittedZoom);
          setTargetZoom(fittedZoom);
          targetPosition.current = nextPosition;
          pendingZoomSnap.current = { zoom: fittedZoom, ...nextPosition };
          container.scale.set(fittedZoom);
          container.position.set(nextPosition.x, nextPosition.y);
          if (container.displaySprite) {
            container.displaySprite.scale.set(fittedZoom);
            container.displaySprite.position.set(nextPosition.x, nextPosition.y);
          }
          updateActiveCanvasView({
            currentZoom: fittedZoom,
            targetZoom: fittedZoom,
            position: nextPosition,
            initialized: true,
          });
          suppressViewPersistenceRef.current = false;
        });
        return;
      }

      // Apply the restored transform during the same layout phase as the tab
      // change. Waiting for the animation frame lets the browser paint the new
      // active tab with the previous document's canvas transform for one frame.
      const snap = pendingZoomSnap.current;
      if (snap && container) {
        container.scale.set(snap.zoom);
        container.x = snap.x;
        container.y = snap.y;
        if (container.displaySprite) {
          container.displaySprite.scale.set(snap.zoom);
          container.displaySprite.x = snap.x;
          container.displaySprite.y = snap.y;
        }
      }

      requestAnimationFrame(() => {
        suppressViewPersistenceRef.current = false;
      });
    };

    applyView();
    return () => {
      if (pendingInitialFitFrame.current !== null) {
        cancelAnimationFrame(pendingInitialFitFrame.current);
        pendingInitialFitFrame.current = null;
      }
    };
  }, [
    activeDocumentId,
    container,
    updateActiveCanvasView,
  ]);

  useEffect(() => {
    const handleSaveRequest = () => {
      if (activeDocumentId) void saveDocument(activeDocumentId);
    };
    window.addEventListener(SAVE_ACTIVE_DOCUMENT_EVENT, handleSaveRequest);
    return () => window.removeEventListener(SAVE_ACTIVE_DOCUMENT_EVENT, handleSaveRequest);
  }, [activeDocumentId, saveDocument]);

  useEffect(() => {
    persistCanvasView(activeDocumentId);
  }, [activeDocumentId, currentZoom, targetZoom, persistCanvasView]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingElement =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key === "Tab") {
        event.preventDefault();
        prepareForDocumentChange();
        cycleDocuments(event.shiftKey ? -1 : 1);
        return;
      }

      if (isTypingElement) {
        return;
      }

      if (
        event.key === "Tab" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setEditorChromeVisible((visible) => !visible);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (activeDocumentId) {
          const document = workspace.openDocuments.find(
            (candidate) => candidate.id === activeDocumentId,
          );
          if (!document) return;
          if (getDocumentCloseRequirement(document) === "confirm") {
            setPendingCloseDocumentId(document.id);
          } else {
            prepareForDocumentChange();
            closeDocument(document.id);
          }
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (activeDocumentId) {
          void saveDocument(activeDocumentId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeDocumentId,
    closeDocument,
    cycleDocuments,
    prepareForDocumentChange,
    saveDocument,
    workspace.openDocuments,
  ]);

  UpdateCanvas(updateCanvasProps);

  const requestCloseDocument = (documentId: string) => {
    const document = workspace.openDocuments.find(
      (candidate) => candidate.id === documentId,
    );
    if (!document) return;
    if (getDocumentCloseRequirement(document) === "confirm") {
      if (document.id !== activeDocumentId) {
        prepareForDocumentChange();
        activateDocument(document.id);
      }
      setPendingCloseDocumentId(documentId);
      return;
    }
    if (document.id === activeDocumentId) {
      prepareForDocumentChange();
    }
    closeDocument(documentId);
  };

  const pendingCloseDocument =
    workspace.openDocuments.find(
      (document) => document.id === pendingCloseDocumentId,
    ) ?? null;
  const saveDialogDocument =
    workspace.openDocuments.find(
      (document) => document.id === saveDialogDocumentId,
    ) ?? null;
  const directSaveSupported = supportsFileSystemAccess();

  const finishFirstSave = async (target: DocumentSaveTarget | null) => {
    if (!saveDialogDocument || !target) return;
    setSaveBusy(true);
    const saved = await performSave(saveDialogDocument.id, target);
    setSaveBusy(false);
    if (saved) setSaveDialogDocumentId(null);
  };

  const handleSaveProjectChoice = async () => {
    if (!saveDialogDocument) return;
    const suggestedName = `${getDocumentFileBaseName(saveDialogDocument)}.zyn`;
    try {
      const target = directSaveSupported
        ? await pickProjectSaveTarget(suggestedName)
        : { kind: "download-fallback" as const, format: "zyn" as const, fileName: suggestedName };
      await finishFirstSave(target);
    } catch (error) {
      if (!isFilePickerCancellation(error)) {
        console.error("Failed to choose a project save location", error);
        toast.error("A project save location could not be selected.");
      }
    }
  };

  const handleSaveFlattenedChoice = async () => {
    if (!saveDialogDocument) return;
    const extension = saveDialogFormat === "jpeg" ? "jpg" : saveDialogFormat;
    const suggestedName = `${getDocumentFileBaseName(saveDialogDocument)}.${extension}`;
    try {
      const target = directSaveSupported
        ? await pickFlattenedSaveTarget(suggestedName, saveDialogFormat)
        : {
            kind: "download-fallback" as const,
            format: saveDialogFormat,
            fileName: suggestedName,
          };
      await finishFirstSave(target);
    } catch (error) {
      if (!isFilePickerCancellation(error)) {
        console.error("Failed to choose an image save location", error);
        toast.error("An image save location could not be selected.");
      }
    }
  };

  const handleSaveDirectlyChoice = async () => {
    if (!saveDialogDocument?.sourceFileHandle || !saveDialogDocument.sourceFileName) return;
    await finishFirstSave({
      kind: "source-image",
      handle: saveDialogDocument.sourceFileHandle,
      format: saveDialogDocument.preferredImageType,
      fileName: saveDialogDocument.sourceFileName,
    });
  };

  return (
    <CanvasContext.Provider
      value={{
        app: appRef,
        container,
        setContainer,
        targetMousePos,
        targetWorldMousePos,
        zoomFromUser,
        canvas: canvasRef,
        currentZoom,
        targetZoom,
        setCurrentZoom,
        setTargetZoom,
        targetPosition,
        pendingZoomSnap,
        pixelGridEnabled,
        setPixelGridEnabled,
        pixelViewEnabled,
        setPixelViewEnabled,
      }}
    >
      <CrossProjectDragOverlay />
      <div className="h-full">
        <div className="flex h-full w-full flex-col overflow-hidden">
          <div>
            <TopBar />
          </div>
          <div className="flex min-h-0 flex-1 flex-row justify-between">
            {editorChromeVisible && (
              <ToolBar lassoVariant={lassoVariant} setLassoVariant={setLassoVariant} />
            )}

            <div className="flex min-h-0 min-w-0 flex-grow flex-col">
              {editorChromeVisible && activeDocument &&
                editMode !== "transform" &&
                editMode !== "crop" &&
                editMode !== "lasso" && (
                  <div
                    aria-label="Tool options"
                    className="h-9 w-full shrink-0 border-b-2 border-[#cdcdcd] bg-navbarBackground dark:border-[#252525] dark:bg-navbarBackground"
                  />
                )}
              <MoveTool />
              <PixelGridOverlay />
              <TransformTool showToolOptions={editorChromeVisible} />
              <CropTool showToolOptions={editorChromeVisible} />
              <LassoTool variant={lassoVariant} mode={lassoMode} setMode={setLassoMode} showToolOptions={editorChromeVisible} />
              <DocumentTabs
                documents={workspace.openDocuments}
                activeDocumentId={activeDocumentId}
                onActivate={(documentId) => {
                  if (documentId === activeDocumentId) return;
                  prepareForDocumentChange();
                  activateDocument(documentId);
                }}
                onRequestClose={requestCloseDocument}
                onReorder={reorderDocuments}
              />
              <div
                className="min-h-0 w-full flex-grow"
                style={{
                  background:
                    "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px",
                }}
              >
                {!activeDocument && (
                  <div className="relative w-full h-full flex flex-row justify-center items-center overflow-auto bg-black">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,35,75,0.28),transparent_58%)]" />
                    <div className="relative flex w-full max-w-3xl flex-col items-center justify-center gap-7 px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <img
                          src="/zynalo-studio-logo.png"
                          alt="Zynalo Studio"
                          className="h-auto w-full max-w-[41rem] object-contain"
                        />
                        <p className="mt-5 text-base text-slate-400">
                          Make Ordinary Photos Extraordinary
                        </p>
                      </div>
                      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-black/90 p-4 shadow-2xl backdrop-blur-sm">
                        <ImageSelector />
                        <p className="mt-3 text-xs text-slate-500">
                          PNG, JPG, JPEG, WebP, and .zyn files supported
                        </p>
                      </div>
                      <CreateProject />
                      <p className="text-xs text-slate-600">
                        Your files stay on your device unless you choose to export or save them elsewhere.
                      </p>
                    </div>
                  </div>
                )}

                <MovementHandler target={target} />
                <div className="h-full w-full">
                  <div
                    id="stage-container"
                    ref={target}
                    className="relative h-full w-full"
                  >
                    <canvas
                      id="canvas"
                      ref={canvasRef}
                      className="absolute left-0 top-0 h-full w-full"
                    ></canvas>
                    {activeDocument && (
                      <div
                        aria-label="Project resolution"
                        className="pointer-events-none absolute bottom-2 left-2 z-10 rounded bg-black/60 px-2 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-sm backdrop-blur-sm"
                      >
                        {activeDocument.project.settings.canvasSettings.width} ×{" "}
                        {activeDocument.project.settings.canvasSettings.height} px
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {editorChromeVisible && <ShowMePanel />}
            {editorChromeVisible && <LayerBar />}
          </div>
        </div>
      </div>
      <CloseDocumentDialog
        open={pendingCloseDocument !== null}
        documentTitle={
          pendingCloseDocument
            ? getWorkspaceDocumentTitle(pendingCloseDocument)
            : "Untitled"
        }
        onCancel={() => setPendingCloseDocumentId(null)}
        onDiscard={() => {
          if (!pendingCloseDocument) return;
          if (pendingCloseDocument.id === activeDocumentId) {
            prepareForDocumentChange();
          }
          closeDocument(pendingCloseDocument.id);
          setPendingCloseDocumentId(null);
        }}
        onSave={async () => {
          if (!pendingCloseDocument) return;
          const saved = await saveDocument(pendingCloseDocument.id);
          if (!saved) return;
          prepareForDocumentChange();
          closeDocument(pendingCloseDocument.id);
          setPendingCloseDocumentId(null);
        }}
      />
      <SaveDocumentDialog
        open={saveDialogDocument !== null}
        sourceFileName={saveDialogDocument?.sourceFileName ?? null}
        canOverwriteSource={Boolean(saveDialogDocument?.sourceFileHandle)}
        supportsDirectSave={directSaveSupported}
        format={saveDialogFormat}
        busy={saveBusy}
        onFormatChange={setSaveDialogFormat}
        onSaveDirectly={handleSaveDirectlyChoice}
        onSaveProject={handleSaveProjectChoice}
        onSaveFlattened={handleSaveFlattenedChoice}
        onCancel={() => setSaveDialogDocumentId(null)}
      />
    </CanvasContext.Provider>
  );
};

export default PhotoEditor;
