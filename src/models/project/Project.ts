import { ProjectInterface } from "@/interfaces/project/ProjectInterface";
import { ProjectSettings } from "@/interfaces/project/SettingsInterfaces";
import { immerable } from "immer";
import { Container } from "pixi.js";
import { v4 as uuidv4 } from "uuid";
import { LayerX } from "./Layers/Layers";

const INITIAL_SETTINGS: ProjectSettings = {
  name: "New Project",
  dateCreated: Date.now(),
  dateModified: Date.now(),
  size: 0,
  canvasSettings: {
    width: 1,
    height: 1,
    antialias: false,
  },
};

export class Project implements ProjectInterface {
  settings: ProjectSettings = INITIAL_SETTINGS;
  id: string = uuidv4();
  container: Container | null = null;

  static [immerable] = true;
}
