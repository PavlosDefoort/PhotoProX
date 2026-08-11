import { AnalyzeSelectedImageSourceInput, ImageSnapshot, VisualAnalysis } from "./types";

export type VisualAnalysisRunResult =
  | { ok: true; analysis: VisualAnalysis }
  | { ok: false; reason: "cancelled" | "stale" | "failed"; error: string };

interface LatestVisualAnalysisRunnerDeps {
  loadSnapshot: (
    imageSource: string,
    maxSnapshotEdge: number | undefined,
    signal?: AbortSignal,
  ) => Promise<ImageSnapshot>;
  analyzeSnapshot: (
    input: {
      selectedLayerId: string;
      imageLayerIds: string[];
      adjustmentLayerIds: string[];
      editorRevision: string;
      originalWidth: number;
      originalHeight: number;
      sampleWidth: number;
      sampleHeight: number;
      imageData: Uint8ClampedArray;
    },
    signal?: AbortSignal,
  ) => Promise<VisualAnalysis>;
}

export class LatestVisualAnalysisRunner {
  private requestId = 0;
  private activeController: AbortController | null = null;

  constructor(private readonly deps: LatestVisualAnalysisRunnerDeps) {}

  cancel() {
    this.requestId += 1;
    this.activeController?.abort();
    this.activeController = null;
  }

  async run(
    input: AnalyzeSelectedImageSourceInput,
  ): Promise<VisualAnalysisRunResult> {
    this.requestId += 1;
    const currentRequestId = this.requestId;
    this.activeController?.abort();
    const controller = new AbortController();
    this.activeController = controller;

    try {
      const snapshot = await this.deps.loadSnapshot(
        input.imageSource,
        input.maxSnapshotEdge,
        controller.signal,
      );
      if (currentRequestId !== this.requestId) {
        return { ok: false, reason: "stale", error: "Image analysis result is stale." };
      }

      const analysis = await this.deps.analyzeSnapshot(
        {
          selectedLayerId: input.selectedLayerId,
          imageLayerIds: [input.imageLayerId],
          adjustmentLayerIds: input.adjustmentLayerIds,
          editorRevision: input.editorRevision,
          originalWidth: snapshot.originalWidth,
          originalHeight: snapshot.originalHeight,
          sampleWidth: snapshot.sampleWidth,
          sampleHeight: snapshot.sampleHeight,
          imageData: snapshot.imageData,
        },
        controller.signal,
      );

      if (currentRequestId !== this.requestId) {
        return { ok: false, reason: "stale", error: "Image analysis result is stale." };
      }

      return { ok: true, analysis };
    } catch (error) {
      const aborted =
        controller.signal.aborted ||
        (typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError");
      if (aborted) {
        return {
          ok: false,
          reason: currentRequestId === this.requestId ? "cancelled" : "stale",
          error:
            currentRequestId === this.requestId
              ? "Image analysis was cancelled."
              : "Image analysis result is stale.",
        };
      }
      return {
        ok: false,
        reason: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Image analysis failed unexpectedly.",
      };
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }
}
