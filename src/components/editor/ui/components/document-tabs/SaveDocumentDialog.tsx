import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentImageType } from "@/interfaces/editor/EditorWorkspace";
import React from "react";

interface SaveDocumentDialogProps {
  open: boolean;
  sourceFileName: string | null;
  canOverwriteSource: boolean;
  supportsDirectSave: boolean;
  format: DocumentImageType;
  busy: boolean;
  onFormatChange: (format: DocumentImageType) => void;
  onSaveDirectly: () => void;
  onSaveProject: () => void;
  onSaveFlattened: () => void;
  onCancel: () => void;
}

const SaveDocumentDialog: React.FC<SaveDocumentDialogProps> = ({
  open,
  sourceFileName,
  canOverwriteSource,
  supportsDirectSave,
  format,
  busy,
  onFormatChange,
  onSaveDirectly,
  onSaveProject,
  onSaveFlattened,
  onCancel,
}) => {
  const openedFlatImage = sourceFileName !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
      <DialogContent className="sm:max-w-[560px] dark:text-white">
        <DialogHeader>
          <DialogTitle>Save document</DialogTitle>
          <DialogDescription>Choose how you want to save your work.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {openedFlatImage && canOverwriteSource ? (
            <div>
              <p className="font-medium">
                Save directly to <code>{sourceFileName}</code>
              </p>
              <p className="text-muted-foreground">
                Replaces the original image with the current flattened result. Layers and edit
                history will remain available only while this Zynalo document is open.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium">Save flattened image</p>
              <p className="text-muted-foreground">
                {supportsDirectSave
                  ? "Creates a flattened image at a location you choose."
                  : "Downloads a new flattened image. The original file will not be overwritten in this browser."}
              </p>
              <label className="mt-2 flex items-center gap-2">
                Format
                <select
                  className="rounded border bg-background px-2 py-1"
                  value={format}
                  disabled={busy}
                  onChange={(event) => onFormatChange(event.target.value as DocumentImageType)}
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
            </div>
          )}

          <div>
            <p className="font-medium">Save as Zynalo project</p>
            <p className="text-muted-foreground">
              {supportsDirectSave
                ? "Creates an editable .zyn project that preserves layers, selections, document structure, and supported edit state."
                : "Downloads an editable .zyn project that preserves your document structure."}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button variant="outline" disabled={busy} onClick={onSaveProject}>
            {supportsDirectSave ? "Save as Zynalo Project" : "Download Zynalo Project"}
          </Button>
          {openedFlatImage && canOverwriteSource ? (
            <Button disabled={busy} onClick={onSaveDirectly}>Save Directly</Button>
          ) : (
            <Button disabled={busy} onClick={onSaveFlattened}>
              {supportsDirectSave ? "Save Flattened Image" : "Download Flattened Image"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveDocumentDialog;
