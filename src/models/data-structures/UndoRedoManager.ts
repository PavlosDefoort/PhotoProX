import { Command } from "@/interfaces/UndoRedoInterfaces";
import { Draft, immerable } from "immer";

export function undo(manager: Draft<UndoRedoManager>) {
  const command = manager.undoStack.pop();
  if (command) {
    command.undo();
    manager.redoStack.push(command);
  }
}

export function redo(manager: Draft<UndoRedoManager>) {
  const command = manager.redoStack.pop();
  if (command) {
    command.execute();
    manager.undoStack.push(command);
  }
}

export class UndoRedoManager {
  public undoStack: Command[] = [];
  public redoStack: Command[] = [];

  static [immerable] = true; // Enable Immer support
}
