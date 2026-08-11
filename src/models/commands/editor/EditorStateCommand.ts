import { Command } from "@/interfaces/UndoRedoInterfaces";

export class EditorStateCommand<T> implements Command {
  constructor(
    public title: string,
    private before: T,
    private after: T,
    private applyState: (state: T) => void,
  ) {}

  execute() {
    this.applyState(this.after);
  }

  undo() {
    this.applyState(this.before);
  }

  redo() {
    this.execute();
  }
}
