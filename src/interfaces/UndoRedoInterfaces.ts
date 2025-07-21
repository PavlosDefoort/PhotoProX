export interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
  title: string;
}
