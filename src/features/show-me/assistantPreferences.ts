export type AssistantProviderMode = "auto" | "deterministic" | "ollama-local";

const STORAGE_KEY = "zynalo.show-me.assistant-provider-mode";

export const readAssistantProviderMode = (): AssistantProviderMode => {
  if (typeof window === "undefined") {
    return "auto";
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === "deterministic" || value === "ollama-local" || value === "auto") {
    return value;
  }
  return "auto";
};

export const writeAssistantProviderMode = (mode: AssistantProviderMode) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, mode);
};
