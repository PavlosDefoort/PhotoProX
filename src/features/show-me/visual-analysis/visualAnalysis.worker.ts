import { analyzeVisualSnapshot } from "./core";
import { AnalyzeVisualSnapshotInput, VisualAnalysis } from "./types";

type WorkerRequest = {
  id: number;
  input: AnalyzeVisualSnapshotInput;
};

type WorkerResponse =
  | { id: number; ok: true; analysis: VisualAnalysis }
  | { id: number; ok: false; error: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input } = event.data;
  try {
    const analysis = analyzeVisualSnapshot(input);
    const response: WorkerResponse = { id, ok: true, analysis };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The local image-analysis worker failed.",
    };
    self.postMessage(response);
  }
};
