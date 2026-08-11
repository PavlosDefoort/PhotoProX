import { DeterministicEditPlanProvider } from "./DeterministicEditPlanProvider";
import { OllamaEditPlanProvider } from "./OllamaEditPlanProvider";
import type {
  EditPlanProvider,
  EditPlanProviderId,
  EditPlanToolManifest,
} from "./types";
import type { PhotoProxToolManifest } from "../tools/types";

const deterministicProvider = new DeterministicEditPlanProvider();
const ollamaProvider = new OllamaEditPlanProvider();

const EDIT_PLAN_PROVIDERS: Record<EditPlanProviderId, EditPlanProvider> = {
  deterministic: deterministicProvider,
  "ollama-local": ollamaProvider,
};

export const getEditPlanProvider = (
  providerId: EditPlanProviderId,
): EditPlanProvider => EDIT_PLAN_PROVIDERS[providerId];

export const toEditPlanToolManifest = (
  registryManifest: PhotoProxToolManifest,
): EditPlanToolManifest => ({
  version: registryManifest.version,
  tools: registryManifest.tools.map((tool) => ({
    id: tool.id,
    displayName: tool.displayName,
    description: tool.description,
    parameters: tool.parameters,
  })),
});
