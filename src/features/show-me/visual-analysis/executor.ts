import { analyzeVisualSnapshot } from "./core";
import { createImageSnapshot } from "./snapshot";
import { LatestVisualAnalysisRunner } from "./runner";
import { AnalyzeVisualSnapshotInput, VisualAnalysis } from "./types";

type WorkerResponse =
  | { id: number; ok: true; analysis: VisualAnalysis }
  | { id: number; ok: false; error: string };

let workerRequestId = 0;

const runAnalysisInWorker = (
  input: AnalyzeVisualSnapshotInput,
  signal?: AbortSignal,
): Promise<VisualAnalysis> =>
  new Promise((resolve, reject) => {
    if (typeof Worker === "undefined") {
      queueMicrotask(() => {
        try {
          resolve(analyzeVisualSnapshot({ ...input, runtime: "main-thread" }));
        } catch (error) {
          reject(error);
        }
      });
      return;
    }

    const worker = new Worker(
      new URL("./visualAnalysis.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRequestId += 1;
    const id = workerRequestId;

    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      worker.terminate();
    };

    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Image analysis was cancelled.", "AbortError"));
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== id) {
        return;
      }
      cleanup();
      if (message.ok) {
        resolve(message.analysis);
      } else {
        reject(new Error(message.error));
      }
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("The local image-analysis worker failed."));
    };

    signal?.addEventListener("abort", handleAbort);
    if (signal?.aborted) {
      handleAbort();
      return;
    }

    worker.postMessage({
      id,
      input: {
        ...input,
        runtime: "worker" as const,
      },
    });
  });

export const createSelectedImageAnalysisRunner = () =>
  new LatestVisualAnalysisRunner({
    loadSnapshot: createImageSnapshot,
    analyzeSnapshot: runAnalysisInWorker,
  });
