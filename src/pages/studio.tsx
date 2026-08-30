import Loading from "@/components/editor/ui/modals/Loading";
import { ProjectContext } from "@/context/ProjectContext";
import { EditMode } from "@/interfaces/types/ProjectRelatedTypes";
import { DraftFunction } from "use-immer";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useImmer } from "use-immer";
import "../styles/animations.css";
import { EditDocument } from "@/interfaces/editor/EditDocument";
import {
  DocumentImageType,
  DocumentSaveTarget,
  ZynaloFileHandle,
} from "@/interfaces/editor/EditorWorkspace";
import { createEditDocument } from "@/models/editor/EditDocument";
import {
  createEditorWorkspace,
  createWorkspaceDocument,
  getActiveWorkspaceDocument,
  getWorkspaceDocumentById,
  markDocumentSaved as markWorkspaceDocumentSaved,
  reorderWorkspaceDocument,
  syncDocumentDirtyState,
  closeWorkspaceDocument,
  cycleWorkspaceDocument,
} from "@/models/editor/EditorWorkspace";
import { UndoRedoManager } from "@/models/data-structures/UndoRedoManager";
import { LayerManager, addLayer } from "@/models/project/LayerManager";
import { Project } from "@/models/project/Project";
import { deserializeWorkspaceDocument } from "@/models/editor/WorkspaceDeserialization";
import { toast } from "sonner";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { createOpenedProjectSaveTarget, isFilePickerCancellation, openDocumentWithPicker } from "@/utils/DocumentSave";
import { readRecentProject, RecentProjectRecord, rememberRecentProject } from "@/models/editor/RecentProjectStore";
import { detectSupportedImageType, ImportValidationError } from "@/utils/FileValidation";
import {
  createRecoverySnapshot,
  discardAllRecoverySnapshots,
  readRecoverySnapshots,
  removeRecoverySnapshot,
  writeRecoverySnapshot,
} from "@/models/editor/RecoveryStore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PhotoEditor = dynamic(() => import("@/components/editor/PhotoEditor"), {
  ssr: false,
});

const defaultProject = new Project();
const defaultLayerManager = new LayerManager();
const defaultEditDocument = createEditDocument();
const defaultUndoRedoManager = new UndoRedoManager();

const stripExtension = (name: string) => {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(0, index) : name;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("The selected image could not be read."));
    };
    reader.onerror = () => {
      reject(new Error("The selected image could not be read."));
    };
    reader.readAsDataURL(file);
  });

const readImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      reject(new Error("The selected image could not be loaded."));
    };
    image.src = src;
  });

const RecoveryProjectPreview = ({ project }: { project?: string }) => {
  const src = useMemo(() => {
    if (!project) return null;
    try {
      const parsed = JSON.parse(project) as { layers?: Array<Record<string, any>> };
      const layer = (parsed.layers ?? [])
        .filter((item) => item.kind === "image" && item.visible !== false)
        .sort((a, b) => Number(b.zIndex ?? 0) - Number(a.zIndex ?? 0))[0];
      return layer?.imageData?.workingSource?.src ?? layer?.imageData?.src ?? null;
    } catch {
      return null;
    }
  }, [project]);

  return src ? (
    <img src={src} alt="Recovered project preview" className="h-full w-full object-contain" />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Rendering preview…</div>
  );
};

export default function Editor() {
  const [workspace, setWorkspace] = useImmer(createEditorWorkspace());
  const [trigger, setTrigger] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("move");
  const [loading, setLoading] = useState(false);
  const [isLoadingBar, setIsLoadingBar] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTask, setLoadingTask] = useState<
    "compressing" | "regular" | "inpainting"
  >("regular");
  const [loadingProgressText, setLoadingProgressText] = useState("");
  const projectLoadToken = useRef(0);
  const recoveryChecked = useRef(false);
  const recoveryWarningShown = useRef(false);
  const [recoverySnapshots, setRecoverySnapshots] = useState<ReturnType<typeof readRecoverySnapshots>>([]);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recentProject, setRecentProject] = useState<RecentProjectRecord | null>(null);
  const [recentProjectSource, setRecentProjectSource] = useState<string | null>(null);

  const activeDocument = useMemo(
    () => getActiveWorkspaceDocument(workspace),
    [workspace],
  );

  const applyProjectUpdater = useCallback(
    (arg: Project | DraftFunction<Project>) => {
      setWorkspace((draft) => {
        const document = getWorkspaceDocumentById(draft, draft.activeDocumentId);
        if (!document) return;
        if (typeof arg === "function") {
          (arg as DraftFunction<Project>)(document.project);
        } else {
          document.project = arg as typeof document.project;
        }
        syncDocumentDirtyState(document);
      });
    },
    [setWorkspace],
  );

  const applyLayerManagerUpdater = useCallback(
    (arg: LayerManager | DraftFunction<LayerManager>) => {
      setWorkspace((draft) => {
        const document = getWorkspaceDocumentById(draft, draft.activeDocumentId);
        if (!document) return;
        if (typeof arg === "function") {
          (arg as DraftFunction<LayerManager>)(document.layerManager);
        } else {
          document.layerManager = arg as typeof document.layerManager;
        }
        syncDocumentDirtyState(document);
      });
    },
    [setWorkspace],
  );

  const applyEditDocumentUpdater = useCallback(
    (arg: EditDocument | DraftFunction<EditDocument>) => {
      setWorkspace((draft) => {
        const document = getWorkspaceDocumentById(draft, draft.activeDocumentId);
        if (!document) return;
        if (typeof arg === "function") {
          (arg as DraftFunction<EditDocument>)(document.editDocument);
        } else {
          document.editDocument = arg as typeof document.editDocument;
        }
        syncDocumentDirtyState(document);
      });
    },
    [setWorkspace],
  );

  const applyUndoRedoUpdater = useCallback(
    (arg: UndoRedoManager | DraftFunction<UndoRedoManager>) => {
      setWorkspace((draft) => {
        const document = getWorkspaceDocumentById(draft, draft.activeDocumentId);
        if (!document) return;
        if (typeof arg === "function") {
          (arg as DraftFunction<UndoRedoManager>)(document.undoRedoManager);
        } else {
          document.undoRedoManager = arg as typeof document.undoRedoManager;
        }
        syncDocumentDirtyState(document);
      });
    },
    [setWorkspace],
  );

  const createBlankDocument = useCallback(
    (options?: {
      width?: number;
      height?: number;
      name?: string;
      colorHex?: string;
      opacity?: number;
    }) => {
      const width = Math.max(1, Math.round(options?.width ?? 1920));
      const height = Math.max(1, Math.round(options?.height ?? 1080));
      const name = options?.name?.trim() || "Untitled";
      const colorHex = options?.colorHex ?? "#ffffff";
      const opacity = options?.opacity ?? 1;

      const project = new Project();
      project.settings.canvasSettings.width = width;
      project.settings.canvasSettings.height = height;
      project.settings.name = name;

      const layerManager = new LayerManager();
      const backgroundLayer = layerManager.createBackgroundLayer(
        false,
        colorHex,
        width,
        height,
        opacity,
      );
      layerManager.layers = addLayer(layerManager.layers, backgroundLayer);
      layerManager.target = backgroundLayer.id;

      const document = createWorkspaceDocument({
        project,
        layerManager,
        editDocument: createEditDocument(),
        undoRedoManager: new UndoRedoManager(),
        fileName: null,
        sourceFileName: null,
        sourceFingerprint: null,
        preferredImageType: "png",
      });

      setWorkspace((draft) => {
        draft.untitledCount += 1;
        draft.openDocuments.push(document as any);
        draft.activeDocumentId = document.id;
      });

      return document.id;
    },
    [setWorkspace],
  );

  const openImageFile = useCallback(
    async (file: File, handle?: ZynaloFileHandle | null) => {
      let imageType: DocumentImageType;
      try {
        imageType = await detectSupportedImageType(file);
      } catch (error) {
        const message = error instanceof ImportValidationError
          ? error.message
          : "The image could not be validated. Choose another file.";
        toast.error(message);
        return null;
      }
      const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
      const existing = workspace.openDocuments.find(
        (document) => document.sourceFingerprint === fingerprint,
      );
      if (existing) {
        setWorkspace((draft) => {
          draft.activeDocumentId = existing.id;
          if (handle) {
            const existingDraft = getWorkspaceDocumentById(draft, existing.id);
            if (existingDraft) existingDraft.sourceFileHandle = handle;
          }
        });
        return existing.id;
      }

      let src: string;
      let size: { width: number; height: number };
      try {
        src = await readFileAsDataUrl(file);
        size = await readImageSize(src);
      } catch {
        toast.error("The image is malformed or cannot be decoded by this browser.");
        return null;
      }
      const project = new Project();
      project.settings.canvasSettings.width = size.width;
      project.settings.canvasSettings.height = size.height;
      project.settings.name = stripExtension(file.name);

      const layerManager = new LayerManager();
      const imageLayer = await layerManager.createImageLayer(size.width, size.height, {
        name: file.name,
        src,
        imageHeight: size.height,
        imageWidth: size.width,
        originalBlob: file,
        originalMimeType: file.type,
        originalWidth: size.width,
        originalHeight: size.height,
        originalSourceSrc: src,
        workingMimeType: file.type,
        fullResolutionSrc: src,
        fullResolutionWidth: size.width,
        fullResolutionHeight: size.height,
      });
      layerManager.layers = addLayer(layerManager.layers, imageLayer);
      layerManager.target = imageLayer.id;

      const editDocument = createEditDocument();
      editDocument.imageLayers[imageLayer.id] = {
        id: imageLayer.id,
        type: "image",
        transform: {
          rotationDegrees: imageLayer.sprite.angle,
          width: imageLayer.sprite.width,
          height: imageLayer.sprite.height,
        },
        adjustmentLayerIds: [],
      };

      const document = createWorkspaceDocument({
        project,
        layerManager,
        editDocument,
        undoRedoManager: new UndoRedoManager(),
        fileName: file.name,
        sourceFileName: file.name,
        sourceFingerprint: fingerprint,
        sourceFileHandle: handle ?? null,
        preferredImageType: imageType,
      });

      setWorkspace((draft) => {
        draft.openDocuments.push(document as any);
        draft.activeDocumentId = document.id;
      });

      return document.id;
    },
    [setWorkspace, workspace.openDocuments],
  );

  const openProjectFile = useCallback(async (file: File, handle?: ZynaloFileHandle | null) => {
    if (!file.name.toLowerCase().endsWith(".json") && !file.name.toLowerCase().endsWith(".zyn")) {
      toast.error("Choose a Zynalo project file (.json or .zyn).");
      return false;
    }
    if (workspace.openDocuments.some((document) => document.isDirty) &&
        !window.confirm("The current project has unsaved changes. Open another project?")) {
      return false;
    }
    const token = ++projectLoadToken.current;
    setLoading(true);
    try {
      const json = await file.text();
      const document = await deserializeWorkspaceDocument(json);
      document.fileName = file.name;
      document.sourceFileName = file.name;
      document.sourceFingerprint = `${file.name}:${file.size}:${file.lastModified}`;
      document.sourceFileHandle = handle ?? null;
      document.saveTarget = createOpenedProjectSaveTarget(file.name, handle);
      markWorkspaceDocumentSaved(document);
      if (token !== projectLoadToken.current) return false;
      const previousDocuments = workspace.openDocuments;
      setWorkspace((draft) => {
        draft.openDocuments = [document as any];
        draft.activeDocumentId = document.id;
      });
      for (const previous of previousDocuments) {
        removeRecoverySnapshot(window.localStorage, previous.id);
      }
      setEditMode("move");
      window.setTimeout(() => {
        const destroyed = new Set<unknown>();
        for (const previous of previousDocuments) {
          for (const layer of previous.layerManager.layers) {
            if (layer instanceof ImageLayer && !destroyed.has(layer.sprite.texture)) {
              destroyed.add(layer.sprite.texture);
              layer.sprite.texture.destroy(true);
            }
          }
        }
      }, 0);
      toast.success(`Opened ${file.name}`);
      void rememberRecentProject(file.name, handle ?? null).catch(() => {});
      return true;
    } catch (error) {
      console.error("Failed to open Zynalo project", error);
      const message = error instanceof Error ? error.message : "The project could not be opened.";
      toast.error(message.replace(/^Invalid Zynalo project:\s*/i, ""));
      return false;
    } finally {
      if (token === projectLoadToken.current) setLoading(false);
    }
  }, [setWorkspace, setEditMode, workspace.openDocuments]);

  const activateDocument = useCallback(
    (documentId: string) => {
      setWorkspace((draft) => {
        if (draft.openDocuments.some((document) => document.id === documentId)) {
          draft.activeDocumentId = documentId;
        }
      });
    },
    [setWorkspace],
  );

  const reorderDocuments = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      setWorkspace((draft) => {
        reorderWorkspaceDocument(draft, sourceIndex, destinationIndex);
      });
    },
    [setWorkspace],
  );

  const closeDocument = useCallback(
    (documentId: string) => {
      removeRecoverySnapshot(window.localStorage, documentId);
      setWorkspace((draft) => {
        closeWorkspaceDocument(draft, documentId);
      });
    },
    [setWorkspace],
  );

  const cycleDocuments = useCallback(
    (direction: 1 | -1) => {
      setWorkspace((draft) => {
        cycleWorkspaceDocument(draft, direction);
      });
    },
    [setWorkspace],
  );

  const markDocumentSaved = useCallback(
    (
      documentId: string,
      options?: {
        fileName?: string | null;
        preferredImageType?: DocumentImageType;
        saveTarget?: DocumentSaveTarget | null;
      },
    ) => {
      setWorkspace((draft) => {
        const document = getWorkspaceDocumentById(draft, documentId);
        if (!document) return;
        if (options?.fileName !== undefined) {
          document.fileName = options.fileName;
        }
        if (options?.preferredImageType) {
          document.preferredImageType = options.preferredImageType;
        }
        if (options?.saveTarget !== undefined) {
          document.saveTarget = options.saveTarget;
        }
        markWorkspaceDocumentSaved(document);
      });
      removeRecoverySnapshot(window.localStorage, documentId);
      const target = options?.saveTarget;
      if (target?.kind === "zyn-project") {
        void rememberRecentProject(target.fileName, target.handle).catch(() => {});
      } else if (target?.kind === "download-fallback" && target.format === "zyn") {
        void rememberRecentProject(target.fileName, null).catch(() => {});
      }
    },
    [setWorkspace],
  );

  const updateActiveCanvasView = useCallback(
    (view: {
      currentZoom: number;
      targetZoom: number;
      position: { x: number; y: number };
      initialized?: boolean;
    }) => {
      setWorkspace((draft) => {
        const document = getWorkspaceDocumentById(draft, draft.activeDocumentId);
        if (!document) return;
        document.canvasView.currentZoom = view.currentZoom;
        document.canvasView.targetZoom = view.targetZoom;
        document.canvasView.position = {
          x: view.position.x,
          y: view.position.y,
        };
        if (view.initialized !== undefined) {
          document.canvasView.initialized = view.initialized;
        }
      });
    },
    [setWorkspace],
  );

  useEffect(() => {
    if (recoveryChecked.current) return;
    recoveryChecked.current = true;
    const snapshots = readRecoverySnapshots(window.localStorage);
    if (snapshots.length === 0) return;
    setRecoverySnapshots(snapshots);
    setRecoveryOpen(true);
  }, [setWorkspace]);

  useEffect(() => {
    let cancelled = false;
    void readRecentProject().then(async (recent) => {
      if (cancelled || !recent) return;
      setRecentProject(recent);
      setRecoveryOpen(true);
      if (recent.handle) {
        const permission = await recent.handle.queryPermission?.({ mode: "read" });
        if (permission === "granted" || !recent.handle.queryPermission) {
          const file = await recent.handle.getFile();
          const source = await file.text();
          if (!cancelled) setRecentProjectSource(source);
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const continueRecentProject = useCallback(async () => {
    try {
      if (recentProject?.handle) {
        const permission = await recentProject.handle.queryPermission?.({ mode: "read" });
        const allowed = permission === "granted" ||
          !recentProject.handle.requestPermission ||
          await recentProject.handle.requestPermission({ mode: "read" }) === "granted";
        if (allowed) {
          const file = await recentProject.handle.getFile();
          if (await openProjectFile(file, recentProject.handle)) {
            setRecoveryOpen(false);
            return;
          }
        }
      }
      const selected = await openDocumentWithPicker();
      if (selected && await openProjectFile(selected.file, selected.handle)) setRecoveryOpen(false);
    } catch (error) {
      if (!isFilePickerCancellation(error)) toast.error("The recent project could not be reopened.");
    }
  }, [openProjectFile, recentProject]);

  const restoreRecoverySnapshots = useCallback(() => {
    const snapshots = recoverySnapshots;
    setRecoveryOpen(false);
    void Promise.allSettled(snapshots.map(async (snapshot) => {
      const document = await deserializeWorkspaceDocument(snapshot.project);
      document.id = snapshot.documentId;
      document.fileName = snapshot.name;
      document.sourceFileName = snapshot.sourceFileName;
      document.sourceFingerprint = snapshot.sourceFingerprint;
      document.savedSnapshot = snapshot.savedSnapshot;
      syncDocumentDirtyState(document);
      return document;
    })).then((results) => {
      const restored = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      results.forEach((result, index) => {
        if (result.status === "rejected") removeRecoverySnapshot(window.localStorage, snapshots[index].documentId);
      });
      const failed = results.length - restored.length;
      if (restored.length > 0) {
        setWorkspace((draft) => {
          const existingIds = new Set(draft.openDocuments.map((document) => document.id));
          draft.openDocuments.push(...(restored.filter((document) => !existingIds.has(document.id)) as any));
          draft.activeDocumentId = restored[0].id;
        });
        toast.success(`Restored ${restored.length} unsaved ${restored.length === 1 ? "document" : "documents"}.`);
      }
      if (failed > 0) toast.error(`${failed} recovery ${failed === 1 ? "snapshot was" : "snapshots were"} invalid and could not be restored.`);
    });
  }, [recoverySnapshots, setWorkspace]);

  const discardRecoverySnapshots = useCallback(() => {
    discardAllRecoverySnapshots(window.localStorage);
    setRecoverySnapshots([]);
    setRecoveryOpen(false);
    toast.info("Recovery data was discarded.");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const document of workspace.openDocuments) {
        if (!document.isDirty) {
          removeRecoverySnapshot(window.localStorage, document.id);
          continue;
        }
        const snapshot = createRecoverySnapshot(document);
        let result = writeRecoverySnapshot(window.localStorage, snapshot);
        if (result.status === "quota-exceeded") {
          // Keep the newest recovery data useful when several large projects
          // have accumulated in localStorage. Evict older documents and retry.
          const olderSnapshots = readRecoverySnapshots(window.localStorage)
            .filter((item) => item.documentId !== document.id)
            .sort((a, b) => a.timestamp - b.timestamp);
          removeRecoverySnapshot(window.localStorage, document.id);
          result = writeRecoverySnapshot(window.localStorage, snapshot);
          for (const olderSnapshot of olderSnapshots) {
            if (result.status !== "quota-exceeded") break;
            removeRecoverySnapshot(window.localStorage, olderSnapshot.documentId);
            result = writeRecoverySnapshot(window.localStorage, snapshot);
          }
        }
        if (result.status === "quota-exceeded") {
          // A serialized project containing large embedded images may never
          // fit in localStorage. Do not interrupt editing with a repeated
          // warning; manual project saving remains available.
          removeRecoverySnapshot(window.localStorage, document.id);
          continue;
        }
        if (result.status !== "saved" && !recoveryWarningShown.current) {
          recoveryWarningShown.current = true;
          const warningKey = "zynalo:recovery-warning-shown";
          let alreadyShown = false;
          try { alreadyShown = window.sessionStorage.getItem(warningKey) === "1"; } catch { /* best effort */ }
          if (!alreadyShown) {
            try { window.sessionStorage.setItem(warningKey, "1"); } catch { /* best effort */ }
            toast.error("Local recovery is unavailable. Save the project manually; editing can continue.");
          }
        }
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [workspace.openDocuments]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!workspace.openDocuments.some((document) => document.isDirty)) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [workspace.openDocuments]);

  return (
    <main className="h-screen max-h-screen select-none">
      <div
        className={`bg-[#cdcdcd] dark:bg-[#252525] h-full w-full ${
          loading ? "tint-in" : "tint-out"
        }`}
      >
        <ProjectContext.Provider
          value={{
            workspace,
            setWorkspace,
            project: activeDocument?.project ?? defaultProject,
            setProject: applyProjectUpdater,
            undoRedoManager:
              activeDocument?.undoRedoManager ?? defaultUndoRedoManager,
            setUndoRedoManager: applyUndoRedoUpdater,
            layerManager: activeDocument?.layerManager ?? defaultLayerManager,
            setLayerManager: applyLayerManagerUpdater,
            editDocument: activeDocument?.editDocument ?? defaultEditDocument,
            setEditDocument: applyEditDocumentUpdater,
            trigger,
            setTrigger,
            landing: activeDocument !== null,
            setLanding: () => {},
            loading,
            setLoading,
            editMode,
            setEditMode,
            loadingProgress,
            setLoadingProgress,
            isLoadingBar,
            setIsLoadingBar,
            loadingTask,
            setLoadingTask,
            loadingProgressText,
            setLoadingProgressText,
            activeDocumentId: activeDocument?.id ?? null,
            activeDocument,
            createBlankDocument,
            openImageFile,
            openProjectFile,
            activateDocument,
            reorderDocuments,
            closeDocument,
            cycleDocuments,
            markDocumentSaved,
            updateActiveCanvasView,
          }}
        >
          <PhotoEditor />
          <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{recoverySnapshots.length > 0 ? "Recover your work" : "Continue your project"}</DialogTitle>
                <DialogDescription>
                  {recoverySnapshots.length > 0
                    ? `Zynalo found ${recoverySnapshots.length} unsaved ${recoverySnapshots.length === 1 ? "project" : "projects"}.`
                    : recentProject
                      ? `Continue working on ${recentProject.fileName}.`
                      : "Choose how you want to continue."}
                </DialogDescription>
              </DialogHeader>
              {recoverySnapshots.length > 0 && (
                <>
                  <div className="h-56 w-full overflow-hidden rounded border">
                    <RecoveryProjectPreview project={recoverySnapshots[0]?.project} />
                  </div>
                  <div className="max-h-24 overflow-auto text-sm text-muted-foreground">
                    {recoverySnapshots.map((snapshot) => <div key={snapshot.documentId}>{snapshot.name}</div>)}
                  </div>
                </>
              )}
              {recoverySnapshots.length === 0 && recentProject && (
                <div className="h-56 w-full overflow-hidden rounded border">
                  {recentProjectSource ? (
                    <RecoveryProjectPreview project={recentProjectSource} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                      <span>Preview requires file access</span>
                      <span className="text-xs">{recentProject.fileName}</span>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                {recoverySnapshots.length > 0 && <Button variant="outline" onClick={discardRecoverySnapshots}>Discard</Button>}
                {recentProject && <Button variant="outline" onClick={continueRecentProject}>Continue with {recentProject.fileName}</Button>}
                {recoverySnapshots.length > 0 && <Button onClick={restoreRecoverySnapshots}>Restore</Button>}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ProjectContext.Provider>
      </div>
      {loading && (
        <Loading
          isLoadingBar={isLoadingBar}
          progressValue={loadingProgress}
          loading={loading}
          task={loadingTask}
          progressText={loadingProgressText}
        />
      )}
    </main>
  );
}
