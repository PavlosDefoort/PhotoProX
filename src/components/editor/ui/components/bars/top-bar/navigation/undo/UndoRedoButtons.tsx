import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { Redo2Icon, Undo2Icon } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";

const UndoRedoButtons: React.FC = () => {
  const { undoRedoManager, setUndoRedoManager } = useProject();

  // Create a listener for the undo and redo buttons
  // Undo: Ctrl + Z
  // Redo: Ctrl + Y
  useEffect(() => {}, [undoRedoManager]);

  useEffect(() => {
    const handleUndo = () => {
      setUndoRedoManager((draft) => {
        const command = draft.undoStack.pop();
        if (command) {
          command.undo();
          draft.redoStack.push(command);
          toast("Undoing " + command.title, {
            duration: 3000,
            icon: UndoIcon,

            cancel: {
              label: "Clear",
              onClick: () => {},
            },
            description: "Click on Redo or Ctrl + Y to redo this action!",
            action: {
              label: "Redo",
              onClick: () => {
                handleRedo();
              },
            },
          });
        }
      });
    };

    const RedoIcon: ReactNode = <Redo2Icon className="w-5 h-5" />;

    const UndoIcon: ReactNode = <Undo2Icon className="w-5 h-5" />;

    const handleRedo = () => {
      setUndoRedoManager((draft) => {
        const command = draft.redoStack.pop();
        if (command) {
          command.execute();
          draft.undoStack.push(command);
          toast("Redoing " + command.title, {
            duration: 3000,
            icon: RedoIcon,
            cancel: {
              label: "Clear",
              onClick: () => {},
            },

            description: "Click on Undo to undo this action!",
            action: {
              label: "Undo",
              onClick: () => {
                handleUndo();
              },
            },
          });
        }
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        handleUndo();
      } else if (e.ctrlKey && e.key === "y") {
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setUndoRedoManager]);

  const RedoIcon: ReactNode = <Redo2Icon className="w-5 h-5" />;

  const UndoIcon: ReactNode = <Undo2Icon className="w-5 h-5" />;

  const handleRedoButton = () => {
    setUndoRedoManager((draft) => {
      const command = draft.redoStack.pop();
      if (command) {
        command.execute();
        draft.undoStack.push(command);
        toast("Redoing " + command.title, {
          duration: 3000,
          icon: RedoIcon,
          cancel: {
            label: "Clear",
            onClick: () => {},
          },

          description: "Click on Undo to undo this action!",
          action: {
            label: "Undo",
            onClick: () => {
              handleUndoButton();
            },
          },
        });
      }
    });
  };

  const handleUndoButton = () => {
    setUndoRedoManager((draft) => {
      const command = draft.undoStack.pop();
      if (command) {
        command.undo();
        draft.redoStack.push(command);
        toast("Undoing " + command.title, {
          duration: 3000,
          icon: UndoIcon,

          cancel: {
            label: "Clear",
            onClick: () => {},
          },
          description: "Click on Redo or Ctrl + Y to redo this action!",
          action: {
            label: "Redo",
            onClick: () => {
              handleRedoButton();
            },
          },
        });
      }
    });
  };

  return (
    <div className="flex flex-row space-x-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {undoRedoManager.undoStack.length > 0 ? (
              <Undo2Icon
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  // Pop the last command from the undo stack
                  handleUndoButton();
                }}
              />
            ) : (
              <Undo2Icon className="w-5 h-5 cursor-not-allowed opacity-50" />
            )}
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <p>
              {undoRedoManager.undoStack.length > 0
                ? "Undo " +
                  undoRedoManager.undoStack[
                    undoRedoManager.undoStack.length - 1
                  ].title
                : "Undo unavailable"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {undoRedoManager.redoStack.length > 0 ? (
              <Redo2Icon
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  // Pop the last command from the redo stack
                  handleRedoButton();
                }}
              />
            ) : (
              <Redo2Icon className="w-5 h-5 cursor-not-allowed opacity-50" />
            )}
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <p>
              {undoRedoManager.redoStack.length > 0
                ? "Redo " +
                  undoRedoManager.redoStack[
                    undoRedoManager.redoStack.length - 1
                  ].title
                : "Redo unavailable"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default UndoRedoButtons;
