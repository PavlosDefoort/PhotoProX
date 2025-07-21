import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/useProject";
import { useEffect, useState } from "react";
import RenameProjectInput from "./RenameProjectInput";

interface RenameProjectProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const RenameProject: React.FC<RenameProjectProps> = ({ open, setOpen }) => {
  const { project, setProject } = useProject();
  const [name, setName] = useState(project.settings.name);

  useEffect(() => {
    setName(project.settings.name);
  }, [project.settings.name, open]);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white">
            Rename Project
          </DialogTitle>
          <DialogDescription>
            Change the name of your project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <RenameProjectInput name={name} setName={setName} />
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="default"
            onClick={() => {
              setProject((draft) => {
                draft.settings.name = name;
              });
              setOpen(false);
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default RenameProject;
