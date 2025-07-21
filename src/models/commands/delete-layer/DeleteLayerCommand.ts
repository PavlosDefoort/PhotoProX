import { Command } from "@/interfaces/UndoRedoInterfaces";
import { LayerManager } from "@/models/project/LayerManager";
import { DraftFunction } from "use-immer";

export interface DeleteLayerCommand extends Command {
  zIndex: number;
  layerId: string;
  name: string;
  setLayerManager: (draft: DraftFunction<LayerManager>) => void;
}
