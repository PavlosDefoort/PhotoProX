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
import { HISTORY_REDO_EVENT, HISTORY_UNDO_EVENT } from "@/components/editor/editorEvents";

const UndoRedoButtons: React.FC = () => {
  const { undoRedoManager, setUndoRedoManager } = useProject();

  // Create a listener for the undo and redo buttons
  // Undo: Ctrl + Z
  // Redo: Ctrl + Y
  useEffect(() => {}, [undoRedoManager]);

  useEffect(() => {
    const handleUndo = () => {
      const command =
        undoRedoManager.undoStack[undoRedoManager.undoStack.length - 1];
      if (!command) return;
      command.undo();
      setUndoRedoManager((draft) => {
        const movedCommand = draft.undoStack.pop();
        if (movedCommand) {
          draft.redoStack.push(movedCommand);
          toast("Undoing " + movedCommand.title, {
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
      const command =
        undoRedoManager.redoStack[undoRedoManager.redoStack.length - 1];
      if (!command) return;
      command.execute();
      setUndoRedoManager((draft) => {
        const movedCommand = draft.redoStack.pop();
        if (movedCommand) {
          draft.undoStack.push(movedCommand);
          toast("Redoing " + movedCommand.title, {
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
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches("input, textarea, select")) return;
      const modifier = e.ctrlKey || e.metaKey;
      if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (modifier && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };

    const undoFromCommand = () => handleUndo();
    const redoFromCommand = () => handleRedo();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(HISTORY_UNDO_EVENT, undoFromCommand);
    window.addEventListener(HISTORY_REDO_EVENT, redoFromCommand);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(HISTORY_UNDO_EVENT, undoFromCommand);
      window.removeEventListener(HISTORY_REDO_EVENT, redoFromCommand);
    };
  }, [setUndoRedoManager, undoRedoManager]);

  const RedoIcon: ReactNode = <Redo2Icon className="w-5 h-5" />;

  const UndoIcon: ReactNode = <Undo2Icon className="w-5 h-5" />;

  const handleRedoButton = () => {
    const command =
      undoRedoManager.redoStack[undoRedoManager.redoStack.length - 1];
    if (!command) return;
    command.execute();
    setUndoRedoManager((draft) => {
      const movedCommand = draft.redoStack.pop();
      if (movedCommand) {
        draft.undoStack.push(movedCommand);
        toast("Redoing " + movedCommand.title, {
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
    const command =
      undoRedoManager.undoStack[undoRedoManager.undoStack.length - 1];
    if (!command) return;
    command.undo();
    setUndoRedoManager((draft) => {
      const movedCommand = draft.undoStack.pop();
      if (movedCommand) {
        draft.redoStack.push(movedCommand);
        toast("Undoing " + movedCommand.title, {
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
