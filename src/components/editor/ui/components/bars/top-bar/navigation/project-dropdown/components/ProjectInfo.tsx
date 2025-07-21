import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProject } from "@/hooks/useProject";
import { ProjectInfoTabs } from "./ProjectInfoTabs";

interface ProjectInfoProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({ open, setOpen }) => {
  const { project } = useProject();
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white">
            Project Info
          </DialogTitle>
          <DialogDescription>
            View and edit various project information.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full flex justify-center items-center">
          <ProjectInfoTabs />
        </div>
        <DialogFooter>
          <Button
            type="submit"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectInfo;
