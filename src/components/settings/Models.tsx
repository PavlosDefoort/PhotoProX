import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  ModelCatalogEntry,
  ModelDownloadProgress,
} from "@/types/desktop";
import { Download, HardDrive, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

const Models: React.FC = () => {
  const desktop = typeof window === "undefined" ? undefined : window.zynaloDesktop;
  const [models, setModels] = useState<ModelCatalogEntry[]>([]);
  const [progress, setProgress] = useState<Record<string, ModelDownloadProgress>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!desktop) return;
    setModels(await desktop.listModels());
  }, [desktop]);

  useEffect(() => {
    void refresh().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Could not load models.");
    });
    if (!desktop) return;
    return desktop.onModelDownloadProgress((nextProgress) => {
      setProgress((current) => ({
        ...current,
        [nextProgress.modelId]: nextProgress,
      }));
    });
  }, [desktop, refresh]);

  const download = async (modelId: string) => {
    if (!desktop) return;
    setError("");
    setBusy((current) => ({ ...current, [modelId]: true }));
    setModels((current) =>
      current.map((model) =>
        model.id === modelId ? { ...model, status: "downloading" } : model,
      ),
    );
    try {
      const updated = await desktop.downloadModel(modelId);
      setModels((current) =>
        current.map((model) => (model.id === modelId ? updated : model)),
      );
      setProgress((current) => {
        const next = { ...current };
        delete next[modelId];
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Model download failed.");
      await refresh();
    } finally {
      setBusy((current) => ({ ...current, [modelId]: false }));
    }
  };

  const remove = async (modelId: string) => {
    if (!desktop) return;
    setError("");
    setBusy((current) => ({ ...current, [modelId]: true }));
    try {
      const updated = await desktop.deleteModel(modelId);
      setModels((current) =>
        current.map((model) => (model.id === modelId ? updated : model)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove model.");
    } finally {
      setBusy((current) => ({ ...current, [modelId]: false }));
    }
  };

  return (
    <div className="mb-10 flex w-full flex-col space-y-5">
      <div className="border-b-2 pb-2">
        <h1 className="text-2xl">Local AI Models</h1>
        <p className="text-sm text-muted-foreground">
          Download optional models to this computer. Model files stay outside the application install so upgrades do not remove them.
        </p>
      </div>

      {!desktop ? (
        <div className="rounded-lg border p-5 text-sm text-muted-foreground">
          Local model management is available in Zynalo Studio for desktop.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {models.map((model) => {
        const modelProgress = progress[model.id];
        const percent = modelProgress
          ? Math.min(100, (modelProgress.receivedBytes / modelProgress.totalBytes) * 100)
          : 0;
        return (
          <section key={model.id} className="space-y-4 rounded-xl border bg-background/70 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">{model.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{model.description}</p>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs">
                {model.status === "installed" ? "Installed" : model.status === "downloading" ? "Downloading" : model.status === "invalid" ? "Repair needed" : formatBytes(model.sizeBytes)}
              </span>
            </div>

            {model.status === "downloading" && modelProgress ? (
              <div className="space-y-2">
                <Progress value={percent} />
                <p className="text-xs text-muted-foreground">
                  {formatBytes(modelProgress.receivedBytes)} of {formatBytes(modelProgress.totalBytes)} ({percent.toFixed(0)}%)
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{model.version}</span>
              <a className="underline hover:text-foreground" href={model.sourceUrl} target="_blank" rel="noreferrer">Model source</a>
              <a className="underline hover:text-foreground" href={model.licenseUrl} target="_blank" rel="noreferrer">{model.licenseName}</a>
            </div>

            <div className="flex gap-2">
              {model.status !== "installed" ? (
                <Button disabled={Boolean(busy[model.id])} onClick={() => void download(model.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  {model.status === "invalid" ? "Repair download" : "Download"}
                </Button>
              ) : (
                <Button variant="outline" disabled={Boolean(busy[model.id])} onClick={() => void remove(model.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Models;
