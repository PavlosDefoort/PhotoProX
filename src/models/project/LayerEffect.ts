import { LayerEffectInterface } from "@/interfaces/project/LayerInterfaces";
import { OutlineFilter } from "pixi-filters";
import { Filter } from "pixi.js";

export class LayerEffect<T extends Filter> implements LayerEffectInterface {
  filter: T;
  name: string;
  description: string;

  constructor(filter: T, name: string, description: string) {
    this.filter = filter;
    this.name = name;
    this.description = description;
  }
}

export class StrokeEffect extends LayerEffect<OutlineFilter> {
  constructor() {
    super(new OutlineFilter(), "Stroke", "Add a stroke to the layer");
  }
}
