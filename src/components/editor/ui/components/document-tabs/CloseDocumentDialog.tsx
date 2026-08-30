import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CloseDocumentDialogProps {
  open: boolean;
  documentTitle: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const CloseDocumentDialog: React.FC<CloseDocumentDialogProps> = ({
  open,
  documentTitle,
  onSave,
  onDiscard,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="text-black dark:text-white">
        <DialogHeader>
          <DialogTitle>Save changes before closing?</DialogTitle>
          <DialogDescription>
            {documentTitle} has unsaved changes. Save before closing this tab?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onDiscard}>
            Discard
          </Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseDocumentDialog;
