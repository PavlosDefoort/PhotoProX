import { ImageTransformState } from "@/interfaces/editor/EditDocument";
import { Command } from "@/interfaces/UndoRedoInterfaces";

type ApplyTransform = (state: ImageTransformState) => void;

export class ImageTransformCommand implements Command {
  constructor(
    public title: string,
    private before: ImageTransformState,
    private after: ImageTransformState,
    private applyTransform: ApplyTransform,
  ) {}

  execute() {
    this.applyTransform(this.after);
  }

  undo() {
    this.applyTransform(this.before);
  }

  redo() {
    this.execute();
  }
}
