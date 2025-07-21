// The one and only :D

import { Container } from "pixi.js";
import { ProjectSettings } from "./SettingsInterfaces";

export interface ProjectInterface {
  id: string;
  container: Container | null;
  settings: ProjectSettings;
}
