import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/hooks/useProject";
import { useCanvas } from "@/hooks/useCanvas";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { addLayer } from "@/models/project/LayerManager";
import { base64StringToTexture } from "@/utils/ImageUtils";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Globe } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SpriteX } from "@/models/pixi-extends/SpriteX";

interface SelectSamplerProps {
  sampler: string;
  setSampler: (sampler: string) => void;
}

const SelectSampler: React.FC<SelectSamplerProps> = ({
  sampler,
  setSampler,
}) => {
  return (
    <Select value={sampler} onValueChange={(value) => setSampler(value)}>
      <SelectTrigger className="w-full border-border bg-input text-foreground">
        <SelectValue placeholder="Sampler" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Samplers</SelectLabel>
          <SelectSeparator />
          <SelectItem value="Euler">Euler</SelectItem>
          <SelectItem value="Euler a">Euler a</SelectItem>
          <SelectItem value="DPM++ 2M">DPM++ 2M</SelectItem>
          <SelectItem value="DPM++ 2M Karras">DPM++ 2M Karras</SelectItem>
          <SelectItem value="DPM++ SDE">DPM++ SDE</SelectItem>
          <SelectItem value="DPM++ SDE Karras">DPM++ SDE Karras</SelectItem>
          <SelectItem value="DDIM">DDIM</SelectItem>
          <SelectItem value="UniPC">UniPC</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

interface SelectUpscalerProps {
  upscaler: string;
  setUpscaler: (upscaler: string) => void;
}

const SelectUpscaler: React.FC<SelectUpscalerProps> = ({
  upscaler,
  setUpscaler,
}) => {
  return (
    <Select value={upscaler} onValueChange={(value) => setUpscaler(value)}>
      <SelectTrigger className="w-full border-border bg-input text-foreground">
        <SelectValue placeholder="Upscaler" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Upscalers</SelectLabel>
          <SelectSeparator />
          <SelectItem value="Latent">Latent</SelectItem>
          <SelectItem value="Latent (antialiased)">
            Latent (antialiased)
          </SelectItem>
          <SelectItem value="Latent (nearest-exact)">
            Latent (nearest-exact)
          </SelectItem>
          <SelectItem value="None">None</SelectItem>
          <SelectItem value="Lanczos">Lanczos</SelectItem>
          <SelectItem value="Nearest">Nearest</SelectItem>
          <SelectItem value="ESRGAN_4x">ESRGAN_4x</SelectItem>
          <SelectItem value="R-ESRGAN 4x+">R-ESRGAN 4x+</SelectItem>
          <SelectItem value="R-ESRGAN 4x+ Anime6B">
            R-ESRGAN 4x+ Anime6B
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

interface GenerateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LoraItem {
  trainedWords?: string[];
  previewImg?: string;
  previewImgPromptPos?: string;
  previewImgPromptNeg?: string;
  civitaiUrl?: string;
  name?: string;
}

interface LoraResponse {
  loras?: LoraItem[];
}

const Generate: React.FC<GenerateProps> = ({ open, onOpenChange }) => {
  const { project, layerManager, setLayerManager, trigger, setTrigger } =
    useProject();

  const { container } = useCanvas();

  // Generation parameters
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [sampler, setSampler] = useState("Euler a");
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [seed, setSeed] = useState(-1);

  // High-res fix parameters
  const [enableHr, setEnableHr] = useState(false);
  const [hrScale, setHrScale] = useState(2);
  const [hrUpscaler, setHrUpscaler] = useState("Latent");
  const [hrSteps, setHrSteps] = useState(0);
  const [hrDenoising, setHrDenoising] = useState(0.7);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // LoRA gallery state
  const [loras, setLoras] = useState<LoraItem[]>([]);
  const [isLoadingLoras, setIsLoadingLoras] = useState(false);
  const [lorasError, setLorasError] = useState<string | null>(null);

  // Progress polling ref
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadLoras = useCallback(async () => {
    setIsLoadingLoras(true);
    setLorasError(null);

    try {
      const response = await fetch("/api/lorasc");
      if (!response.ok) {
        throw new Error("Failed to load LoRAs");
      }

      const data = (await response.json()) as LoraResponse;
      setLoras(Array.isArray(data.loras) ? data.loras : []);
    } catch (error) {
      console.error("LoRA load error:", error);
      setLoras([]);
      setLorasError((error as Error).message || "Failed to load LoRAs");
    } finally {
      setIsLoadingLoras(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadLoras();
  }, [open, loadLoras]);

  const handleApplyPreviewPrompt = useCallback((lora: LoraItem) => {
    setPrompt(lora.previewImgPromptPos || "");
    setNegativePrompt(lora.previewImgPromptNeg || "");
  }, []);

  const handleAppendTriggerWords = useCallback((lora: LoraItem) => {
    const triggerWords = (lora.trainedWords || [])
      .map((word) => word.trim())
      .filter((word) => word.length > 0)
      .join(", ");

    if (!triggerWords) {
      return;
    }

    setPrompt((currentPrompt) => {
      const trimmedPrompt = currentPrompt.trim();
      return trimmedPrompt ? `${trimmedPrompt}, ${triggerWords}` : triggerWords;
    });
  }, []);

  const getLoraPreviewSrc = useCallback((previewImg?: string) => {
    if (!previewImg) {
      return null;
    }

    if (
      previewImg.startsWith("data:") ||
      previewImg.startsWith("http://") ||
      previewImg.startsWith("https://") ||
      previewImg.startsWith("/")
    ) {
      return previewImg;
    }

    return `data:image/png;base64,${previewImg}`;
  }, []);

  const startProgressPolling = useCallback(() => {
    setProgress(0);
    setProgressText("Starting...");

    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("/api/inpaint-progress");
        if (response.ok) {
          const data = await response.json();
          const progressPercent = Math.round((data.progress || 0) * 100);
          setProgress(progressPercent);
          if (data.textinfo) {
            setProgressText(data.textinfo);
          } else if (data.progress > 0) {
            const eta = data.eta ? `~${Math.round(data.eta)}s remaining` : "";
            setProgressText(`${progressPercent}% ${eta}`);
          }
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 500);
  }, []);

  const stopProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(0);
    setProgressText("");
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    startProgressPolling();

    try {
      const response = await fetch("/api/txt2img", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          sampler_name: sampler,
          steps,
          cfg_scale: cfgScale,
          width,
          height,
          seed,
          enable_hr: enableHr,
          hr_scale: hrScale,
          hr_upscaler: hrUpscaler,
          hr_second_pass_steps: hrSteps,
          denoising_strength: hrDenoising,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        // Store the base64 image with data URI prefix for preview and texture creation
        const imageWithPrefix = data.images[0].startsWith("data:")
          ? data.images[0]
          : `data:image/png;base64,${data.images[0]}`;
        setGeneratedImage(imageWithPrefix);
      } else {
        throw new Error("No images in response");
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate: " + (error as Error).message);
    } finally {
      stopProgressPolling();
      setIsGenerating(false);
    }
  };

  const handleAddToProject = async () => {
    if (!generatedImage || !container) return;

    try {
      // Create texture from base64
      const texture = await base64StringToTexture(generatedImage);

      // Create sprite
      const sprite = SpriteX.from(texture);
      sprite.anchor.set(0.5);
      sprite.cursor = "pointer";
      sprite.eventMode = "static";

      // Get project dimensions from settings
      const projectWidth = project.settings.canvasSettings.width;
      const projectHeight = project.settings.canvasSettings.height;

      // Center in the project
      sprite.position.set(projectWidth / 2, projectHeight / 2);

      // Create imageData object
      const imageData = {
        src: generatedImage,
        imageWidth: texture.width,
        imageHeight: texture.height,
        name: `Generated ${layerManager.layers.length + 1}`,
      };

      // Create new ImageLayer with correct constructor parameters
      // ImageLayer(zIndex, name, imageData, sprite)
      const newLayer: ImageLayer = new ImageLayer(
        layerManager.layers.length + 1,
        imageData.name,
        imageData,
        sprite,
      );

      // Add to layer manager using addLayer which handles z-index
      setLayerManager((draft) => {
        draft.layers = addLayer(draft.layers, newLayer);
        draft.target = newLayer.id;
      });

      // Trigger canvas update to render the new layer
      setTrigger(!trigger);

      // Close the modal
      onOpenChange(false);

      // Reset generated image
      setGeneratedImage(null);
    } catch (error) {
      console.error("Error adding image to project:", error);
      alert("Failed to add image to project");
    }
  };

  // Common dimension presets
  const dimensionPresets = [
    { label: "512x512", width: 512, height: 512 },
    { label: "512x768", width: 512, height: 768 },
    { label: "768x512", width: 768, height: 512 },
    { label: "768x768", width: 768, height: 768 },
    { label: "1024x1024", width: 1024, height: 1024 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1500px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Image</DialogTitle>
          <DialogDescription>
            Generate an image using Stable Diffusion. Enter your prompt and
            adjust settings as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Prompt row */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex flex-col gap-4 lg:w-4/5">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <textarea
                  id="prompt"
                  placeholder="Describe what you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-20 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="negative-prompt">Negative Prompt</Label>
                <textarea
                  id="negative-prompt"
                  placeholder="What to avoid..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="h-20 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex lg:w-1/5 lg:items-center">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="h-10 w-full"
              >
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="generation" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generation">Generation</TabsTrigger>
              <TabsTrigger value="loras">Loras</TabsTrigger>
            </TabsList>

            <TabsContent value="generation" className="mt-4">
              <div className="flex flex-col gap-6 xl:flex-row">
                {/* Generation parameters */}
                <div className="space-y-4 xl:w-1/2">
                  <div className="space-y-2">
                    {/* <Label>Dimensions</Label>
                    <div className="flex flex-wrap gap-2">
                      {dimensionPresets.map((preset) => (
                        <Button
                          key={preset.label}
                          variant={
                            width === preset.width && height === preset.height
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setWidth(preset.width);
                            setHeight(preset.height);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div> */}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          value={width}
                          onChange={(e) =>
                            setWidth(parseInt(e.target.value) || 512)
                          }
                          min={64}
                          max={2048}
                          step={64}
                          className="bg-input"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          value={height}
                          onChange={(e) =>
                            setHeight(parseInt(e.target.value) || 512)
                          }
                          min={64}
                          max={2048}
                          step={64}
                          className="bg-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Sampler</Label>
                      <Link
                        href="https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#sampling-method-selection"
                        target="_blank"
                      >
                        <InfoCircledIcon className="h-4 w-4 cursor-pointer text-muted-foreground" />
                      </Link>
                    </div>
                    <SelectSampler sampler={sampler} setSampler={setSampler} />
                  </div>

                  <div className="space-y-2">
                    <Label>Steps: {steps}</Label>
                    <Slider
                      value={[steps]}
                      onValueChange={(v) => setSteps(v[0])}
                      min={1}
                      max={100}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CFG Scale: {cfgScale}</Label>
                    <Slider
                      value={[cfgScale]}
                      onValueChange={(v) => setCfgScale(v[0])}
                      min={1}
                      max={30}
                      step={0.5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed (-1 for random)</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                      className="bg-input"
                    />
                  </div>

                  <div className="space-y-4 rounded-md border border-border p-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enable-hr"
                        checked={enableHr}
                        onCheckedChange={(checked) =>
                          setEnableHr(checked as boolean)
                        }
                      />
                      <Label htmlFor="enable-hr" className="cursor-pointer">
                        Enable High-Res Fix
                      </Label>
                    </div>

                    {enableHr && (
                      <>
                        <div className="space-y-2">
                          <Label>Upscaler</Label>
                          <SelectUpscaler
                            upscaler={hrUpscaler}
                            setUpscaler={setHrUpscaler}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Upscale by: {hrScale}x</Label>
                          <Slider
                            value={[hrScale]}
                            onValueChange={(v) => setHrScale(v[0])}
                            min={1}
                            max={4}
                            step={0.05}
                          />
                          <p className="text-xs text-muted-foreground">
                            Final size: {Math.round(width * hrScale)} x{" "}
                            {Math.round(height * hrScale)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Hires Steps:{" "}
                            {hrSteps === 0 ? "Same as base" : hrSteps}
                          </Label>
                          <Slider
                            value={[hrSteps]}
                            onValueChange={(v) => setHrSteps(v[0])}
                            min={0}
                            max={100}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Denoising Strength: {hrDenoising.toFixed(2)}
                          </Label>
                          <Slider
                            value={[hrDenoising]}
                            onValueChange={(v) => setHrDenoising(v[0])}
                            min={0}
                            max={1}
                            step={0.05}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Generated image preview */}
                <div className="space-y-4 xl:w-1/2">
                  <Label>Generated Image</Label>
                  <div className="aspect-video overflow-hidden rounded-lg border border-border bg-muted/30">
                    <div className="flex h-full w-full items-center justify-center">
                      {isGenerating ? (
                        <div className="flex w-full flex-col items-center gap-4 p-4">
                          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                          <p className="text-sm text-muted-foreground">
                            Generating...
                          </p>
                          {progress > 0 && (
                            <div className="w-full space-y-2">
                              <Progress value={progress} className="w-full" />
                              <p className="text-center text-xs text-muted-foreground">
                                {progressText}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : generatedImage ? (
                        <img
                          src={generatedImage}
                          alt="Generated"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Generated image will appear here
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="loras" className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label>LoRA Gallery</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadLoras()}
                  disabled={isLoadingLoras}
                  className="h-7 px-2 text-xs"
                >
                  {isLoadingLoras ? "Loading..." : "Refresh"}
                </Button>
              </div>

              {isLoadingLoras ? (
                <p className="text-xs text-muted-foreground">
                  Loading LoRAs...
                </p>
              ) : lorasError ? (
                <p className="text-xs text-destructive">{lorasError}</p>
              ) : loras.length === 0 ? (
                <p className="text-xs text-muted-foreground">No LoRAs found.</p>
              ) : (
                <div className="max-h-[58vh] overflow-y-auto rounded-md border border-border p-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {loras.map((lora, index) => {
                      const previewSrc = getLoraPreviewSrc(lora.previewImg);
                      return (
                        <div
                          key={`${lora.name || "lora"}-${index}`}
                          className="group relative w-full overflow-hidden rounded-md border border-border bg-muted/20"
                        >
                          {previewSrc ? (
                            <img
                              src={previewSrc}
                              alt={lora.name || `LoRA ${index + 1}`}
                              className="h-96 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-96 w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                              No preview available
                            </div>
                          )}

                          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2 bg-black/65 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                            <p className="truncate text-xs font-medium text-white">
                              {lora.name || "Unnamed LoRA"}
                            </p>
                            <div className="pointer-events-auto grid grid-cols-[1fr_1fr_auto] gap-1">
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handleApplyPreviewPrompt(lora)}
                              >
                                Add Preview Prompt
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handleAppendTriggerWords(lora)}
                                disabled={
                                  !lora.trainedWords ||
                                  lora.trainedWords.length === 0
                                }
                              >
                                Add Trigger Words
                              </Button>

                              {lora.civitaiUrl ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  asChild
                                  className="h-7 w-7 bg-background/90 p-0 hover:bg-background"
                                >
                                  <Link
                                    href={lora.civitaiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open ${
                                      lora.name || "LoRA"
                                    } on Civitai`}
                                  >
                                    <Globe className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  disabled
                                  aria-label="No Civitai page available"
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Exit
          </Button>
          <Button
            onClick={handleAddToProject}
            disabled={isGenerating || !generatedImage}
            className="bg-green-500 hover:bg-green-600"
          >
            Save to Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Generate;
