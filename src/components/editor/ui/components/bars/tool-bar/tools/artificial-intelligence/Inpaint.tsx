import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/hooks/useProject";
import { useCanvas } from "@/hooks/useCanvas";
import { findLayer } from "@/models/project/LayerManager";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { base64StringToTexture } from "@/utils/ImageUtils";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Graphics, FederatedPointerEvent, Container } from "pixi.js";
import { fitImageToScreen } from "@/utils/CalcUtils";

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
      <SelectTrigger className="w-[180px] bg-input dark:bg-input border-border dark:text-white">
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
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const Inpaint: React.FC = () => {
  const {
    project,
    loading,
    layerManager,
    setLayerManager,
    setLoading,
    trigger,
    setTrigger,
    editMode,
    setEditMode,
    setLoadingTask,
    setLoadingProgress,
    setLoadingProgressText,
  } = useProject();

  const { app, container, canvas, setTargetZoom, targetPosition, currentZoom } =
    useCanvas();

  // Inpainting parameters
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [sampler, setSampler] = useState("Euler a");
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);
  const [seed, setSeed] = useState(-1);

  // Brush settings
  const [brushSize, setBrushSize] = useState(30);
  const isDrawingRef = useRef(false);

  // State management
  const [hasDrawn, setHasDrawn] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Progress polling ref
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // History management - stores all iterations
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1); // -1 means original image

  // Mask graphics reference
  const maskGraphicsRef = useRef<Graphics | null>(null);
  const cursorGraphicsRef = useRef<Graphics | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Store original view state for restoration
  const originalViewRef = useRef<{
    zoom: number;
    position: { x: number; y: number };
    targetId: string; // Track which target the view was fitted for
  } | null>(null);

  // Store original sprite rotation for restoration
  const originalRotationRef = useRef<{
    rotation: number;
    targetId: string;
  } | null>(null);

  // Track last viewport size to detect resize
  const lastViewportRef = useRef<{ width: number; height: number } | null>(
    null,
  );

  const target = findLayer(layerManager.layers, layerManager.target);

  // Function to fit view to the target layer
  const fitViewToTarget = useCallback(() => {
    if (
      editMode !== "inpaint" ||
      !(target instanceof ImageLayer) ||
      !app.current ||
      !container
    ) {
      return;
    }

    const sprite = target.sprite;
    const renderer = app.current.renderer;

    // Calculate zoom to fit the layer's displayed size
    const layerWidth = sprite.width;
    const layerHeight = sprite.height;

    // Get viewport dimensions
    const viewportWidth = renderer.width;
    const viewportHeight = renderer.height;

    // Calculate zoom to fit the layer with some padding
    const padding = 0.9; // 90% of viewport
    const newZoom = fitImageToScreen(
      layerWidth,
      layerHeight,
      viewportWidth * padding,
      viewportHeight * padding,
      0,
    );

    // Center the view on the sprite position
    // Container pivot is at center of original dimensions
    // Sprite anchor is 0.5, so sprite.x/y is the center of the sprite
    const pivotX = container.originalWidth / 2;
    const pivotY = container.originalHeight / 2;

    const newX = viewportWidth / 2 - (sprite.x - pivotX) * newZoom;
    const newY = viewportHeight / 2 - (sprite.y - pivotY) * newZoom;

    targetPosition.current = { x: newX, y: newY };
    setTargetZoom(newZoom);

    // Also directly set container position for immediate effect
    container.x = newX;
    container.y = newY;
    container.scale.set(newZoom);

    // Sync displaySprite for RenderTexture architecture
    if (container.displaySprite) {
      container.displaySprite.x = newX;
      container.displaySprite.y = newY;
      container.displaySprite.scale.set(newZoom);
    }

    // Update last viewport size
    lastViewportRef.current = { width: viewportWidth, height: viewportHeight };
  }, [editMode, target, app, container, setTargetZoom, targetPosition]);

  // Adjust view to fit selected layer when entering inpaint mode
  useEffect(() => {
    if (
      editMode === "inpaint" &&
      target instanceof ImageLayer &&
      app.current &&
      container
    ) {
      // Store original view state only once, or re-fit if target changed
      const needsViewFit =
        !originalViewRef.current ||
        originalViewRef.current.targetId !== target.id;

      if (needsViewFit) {
        // Only save original state the very first time
        if (!originalViewRef.current) {
          originalViewRef.current = {
            zoom: currentZoom,
            position: { ...targetPosition.current },
            targetId: target.id,
          };
        } else {
          // Update target ID but keep original view state
          originalViewRef.current.targetId = target.id;
        }

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          fitViewToTarget();
        });
      }
    } else if (editMode !== "inpaint" && originalViewRef.current) {
      // Restore original view when exiting inpaint mode
      setTargetZoom(originalViewRef.current.zoom);
      targetPosition.current = { ...originalViewRef.current.position };
      originalViewRef.current = null;
      lastViewportRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, target, app, container, fitViewToTarget]);

  // Handle viewport resize while in inpaint mode
  useEffect(() => {
    if (editMode !== "inpaint" || !app.current) return;

    const handleResize = () => {
      if (!app.current) return;
      const renderer = app.current.renderer;
      const currentWidth = renderer.width;
      const currentHeight = renderer.height;

      // Check if viewport actually changed
      if (
        lastViewportRef.current &&
        (lastViewportRef.current.width !== currentWidth ||
          lastViewportRef.current.height !== currentHeight)
      ) {
        fitViewToTarget();
      }
    };

    // Listen for window resize
    window.addEventListener("resize", handleResize);

    // Also check periodically in case renderer resizes without window resize
    const resizeCheckInterval = setInterval(handleResize, 200);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(resizeCheckInterval);
    };
  }, [editMode, app, fitViewToTarget]);

  // Remove rotation when entering inpaint mode, restore when exiting
  useEffect(() => {
    if (editMode === "inpaint" && target instanceof ImageLayer) {
      const sprite = target.sprite;

      // Check if we need to restore a previous target's rotation first
      if (
        originalRotationRef.current &&
        originalRotationRef.current.targetId !== target.id
      ) {
        // Find the old layer and restore its rotation
        const oldLayer = findLayer(
          layerManager.layers,
          originalRotationRef.current.targetId,
        );
        if (oldLayer instanceof ImageLayer) {
          oldLayer.sprite.rotation = originalRotationRef.current.rotation;
        }
        originalRotationRef.current = null;
      }

      // Store and remove rotation for new target
      if (!originalRotationRef.current) {
        originalRotationRef.current = {
          rotation: sprite.rotation,
          targetId: target.id,
        };
        // Remove rotation for inpainting
        sprite.rotation = 0;
      }
    } else if (editMode !== "inpaint" && originalRotationRef.current) {
      // Restore rotation when exiting inpaint mode
      const oldLayer = findLayer(
        layerManager.layers,
        originalRotationRef.current.targetId,
      );
      if (oldLayer instanceof ImageLayer) {
        oldLayer.sprite.rotation = originalRotationRef.current.rotation;
      }
      originalRotationRef.current = null;
    }
  }, [editMode, target, layerManager.layers]);

  // Initialize mask graphics and cursor when entering inpaint mode
  useEffect(() => {
    if (editMode === "inpaint" && container && target instanceof ImageLayer) {
      // Create mask and cursor graphics
      if (!maskGraphicsRef.current) {
        const maskGraphics = new Graphics();
        maskGraphics.alpha = 0.5;
        maskGraphics.zIndex = 999;
        container.addChild(maskGraphics);
        maskGraphicsRef.current = maskGraphics;

        const cursorGraphics = new Graphics();
        cursorGraphics.zIndex = 1000;
        container.addChild(cursorGraphics);
        cursorGraphicsRef.current = cursorGraphics;
      }
    }

    return () => {
      if (maskGraphicsRef.current && container) {
        container.removeChild(maskGraphicsRef.current);
        maskGraphicsRef.current.destroy();
        maskGraphicsRef.current = null;
      }
      if (cursorGraphicsRef.current && container) {
        container.removeChild(cursorGraphicsRef.current);
        cursorGraphicsRef.current.destroy();
        cursorGraphicsRef.current = null;
      }
    };
  }, [editMode, container, target]);

  // Set up drawing events
  useEffect(() => {
    if (editMode !== "inpaint" || !container || !maskGraphicsRef.current)
      return;

    const maskGraphics = maskGraphicsRef.current;

    const drawCircle = (x: number, y: number) => {
      maskGraphics.circle(x, y, brushSize / 2);
      maskGraphics.fill({ color: 0xffffff }); // White color for A1111 mask (alpha makes it visible as gray)
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      // Draw circles along the line for smooth strokes
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const steps = Math.max(1, Math.ceil(dist / (brushSize / 4)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        drawCircle(x, y);
      }
    };

    const onPointerDown = (event: FederatedPointerEvent) => {
      isDrawingRef.current = true;
      const localPos = container.toLocal(event.global);
      drawCircle(localPos.x, localPos.y);
      lastPosRef.current = { x: localPos.x, y: localPos.y };
      setHasDrawn(true);
    };

    const updateCursor = (x: number, y: number) => {
      if (!cursorGraphicsRef.current) return;
      const cursor = cursorGraphicsRef.current;
      cursor.clear();
      cursor.circle(x, y, brushSize / 2);
      cursor.stroke({ color: 0x000000, width: 2 });
      cursor.circle(x, y, brushSize / 2);
      cursor.stroke({ color: 0xffffff, width: 1 });
    };

    const onPointerMove = (event: FederatedPointerEvent) => {
      const localPos = container.toLocal(event.global);

      // Always update cursor position
      updateCursor(localPos.x, localPos.y);

      if (!isDrawingRef.current) return;

      if (lastPosRef.current) {
        drawLine(
          lastPosRef.current.x,
          lastPosRef.current.y,
          localPos.x,
          localPos.y,
        );
      } else {
        drawCircle(localPos.x, localPos.y);
      }

      lastPosRef.current = { x: localPos.x, y: localPos.y };
    };

    const onPointerUp = () => {
      isDrawingRef.current = false;
      lastPosRef.current = null;
    };

    container.eventMode = "static";
    container.cursor = "none"; // Hide default cursor

    // Hide cursor on the target sprite (sprites have cursor: "pointer" by default)
    let originalSpriteCursor: string | undefined;
    if (target instanceof ImageLayer) {
      originalSpriteCursor = target.sprite.cursor;
      target.sprite.cursor = "none";
    }

    // Hide cursor on all children in container
    container.children.forEach((child: any) => {
      if (child.cursor !== undefined) {
        child.cursor = "none";
      }
    });

    // Hide cursor on the app stage (covers entire canvas)
    if (app.current?.stage) {
      app.current.stage.eventMode = "static";
      app.current.stage.cursor = "none";
      app.current.stage.hitArea = app.current.screen;
    }

    // Also hide cursor on the canvas elements
    if (app.current?.canvas) {
      (app.current.canvas as HTMLCanvasElement).style.cursor = "none";
    }
    if (canvas.current) {
      canvas.current.style.cursor = "none";
    }

    // Global pointer move on stage for cursor tracking anywhere on canvas
    const onStagePointerMove = (event: FederatedPointerEvent) => {
      const localPos = container.toLocal(event.global);
      updateCursor(localPos.x, localPos.y);
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.visible = true;
      }
    };

    const onStagePointerLeave = () => {
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.visible = false;
      }
    };

    if (app.current?.stage) {
      app.current.stage.on("pointermove", onStagePointerMove);
      app.current.stage.on("pointerleave", onStagePointerLeave);
    }

    container.on("pointerdown", onPointerDown);
    container.on("pointermove", onPointerMove);
    container.on("pointerup", onPointerUp);
    container.on("pointerupoutside", onPointerUp);

    return () => {
      container.cursor = "default"; // Restore default cursor

      // Restore cursor on the target sprite
      if (target instanceof ImageLayer && originalSpriteCursor !== undefined) {
        target.sprite.cursor = originalSpriteCursor;
      }

      // Restore cursor on all children in container
      container.children.forEach((child: any) => {
        if (child.cursor !== undefined) {
          child.cursor = "pointer";
        }
      });

      // Restore cursor on stage
      if (app.current?.stage) {
        app.current.stage.cursor = "default";
        app.current.stage.off("pointermove", onStagePointerMove);
        app.current.stage.off("pointerleave", onStagePointerLeave);
      }

      // Restore cursor on canvas elements
      if (app.current?.canvas) {
        (app.current.canvas as HTMLCanvasElement).style.cursor = "default";
      }
      if (canvas.current) {
        canvas.current.style.cursor = "default";
      }

      container.off("pointerdown", onPointerDown);
      container.off("pointermove", onPointerMove);
      container.off("pointerup", onPointerUp);
      container.off("pointerupoutside", onPointerUp);
      if (cursorGraphicsRef.current) {
        cursorGraphicsRef.current.clear();
      }
    };
  }, [editMode, container, brushSize, app, canvas, target]);

  // Get current image source based on history index
  const getCurrentImageSrc = useCallback(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      return history[historyIndex];
    }
    // Return original image
    if (target instanceof ImageLayer) {
      return target.imageData.src;
    }
    return null;
  }, [historyIndex, history, target]);

  // Reset state when exiting inpaint mode
  useEffect(() => {
    if (editMode !== "inpaint") {
      setPrompt("");
      setNegativePrompt("");
      setHasDrawn(false);
      setHasGenerated(false);
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [editMode]);

  const clearMask = useCallback(() => {
    if (maskGraphicsRef.current) {
      maskGraphicsRef.current.clear();
      setHasDrawn(false);
    }
  }, []);

  const getMaskAsBase64 = useCallback(async (): Promise<string | null> => {
    if (!app.current || !maskGraphicsRef.current || !target) return null;
    if (!(target instanceof ImageLayer)) return null;

    const renderer = app.current.renderer;
    const maskGraphics = maskGraphicsRef.current;

    // Get the layer's position and scale in container coordinates
    const sprite = target.sprite;
    const layerX = sprite.x;
    const layerY = sprite.y;
    const layerScaleX = sprite.scale.x;
    const layerScaleY = sprite.scale.y;

    // Original image dimensions (what we're sending to A1111)
    const imgWidth = target.imageData.imageWidth;
    const imgHeight = target.imageData.imageHeight;

    try {
      // Create container for mask extraction at original image size
      const maskOnlyContainer = new Container();

      // Black background (areas NOT to inpaint)
      const bg = new Graphics();
      bg.rect(0, 0, imgWidth, imgHeight);
      bg.fill({ color: 0x000000 });
      maskOnlyContainer.addChild(bg);

      // Clone the mask and transform it to match the original image coordinates
      // The mask was drawn in container space, we need to transform it to image space
      maskGraphics.alpha = 1;

      // Remove mask from container temporarily
      if (container) {
        container.removeChild(maskGraphics);
      }

      // Transform mask from container coords to image coords
      // Sprite anchor is 0.5, so sprite.x/y is the CENTER of the image
      // After scaling by 1/scale, we need to offset so the sprite center maps to image center
      // imageCoord = (containerCoord / scale) + offset
      // where offset = imgSize/2 - spritePos/scale
      maskGraphics.x = imgWidth / 2 - layerX / layerScaleX;
      maskGraphics.y = imgHeight / 2 - layerY / layerScaleY;
      maskGraphics.scale.set(1 / layerScaleX, 1 / layerScaleY);

      maskOnlyContainer.addChild(maskGraphics);

      const base64 = await renderer.extract.base64({
        target: maskOnlyContainer,
        format: "png",
        resolution: 1,
      });

      // Restore mask position/scale and alpha
      maskGraphics.x = 0;
      maskGraphics.y = 0;
      maskGraphics.scale.set(1, 1);
      maskGraphics.alpha = 0.5;

      // Re-add mask to main container
      maskOnlyContainer.removeChild(maskGraphics);
      if (container) {
        container.addChild(maskGraphics);
      }

      bg.destroy();
      maskOnlyContainer.destroy();

      return base64;
    } catch (error) {
      console.error("Error extracting mask:", error);
      // Restore mask state in case of error
      maskGraphics.x = 0;
      maskGraphics.y = 0;
      maskGraphics.scale.set(1, 1);
      maskGraphics.alpha = 0.5;
      if (container && maskGraphics.parent !== container) {
        container.addChild(maskGraphics);
      }
      return null;
    }
  }, [app, container, target]);

  const saveResult = async () => {
    setEditMode("view");
    const currentSrc = getCurrentImageSrc();
    if (currentSrc && target instanceof ImageLayer && historyIndex >= 0) {
      setLayerManager((draft) => {
        draft.layers = draft.layers.map((layer) => {
          if (layer.id === target.id) {
            (layer as ImageLayer).imageData.src = currentSrc;
          }
          return layer;
        });
      });
    }
  };

  const goToHistoryIndex = async (index: number) => {
    if (!target || !(target instanceof ImageLayer)) return;

    setHistoryIndex(index);

    let newSrc: string;
    if (index >= 0 && index < history.length) {
      newSrc = history[index];
    } else {
      // Go back to original
      newSrc = target.imageData.src;
    }

    const texture = await base64StringToTexture(newSrc);
    target.sprite.texture = texture;
    setTrigger(!trigger);
  };

  const goToPrevious = async () => {
    const newIndex = historyIndex - 1;
    if (newIndex >= -1) {
      await goToHistoryIndex(newIndex);
    }
  };

  const goToNext = async () => {
    const newIndex = historyIndex + 1;
    if (newIndex < history.length) {
      await goToHistoryIndex(newIndex);
    }
  };

  const revertToOriginal = async () => {
    await goToHistoryIndex(-1);
    setHasGenerated(false);
    clearMask();
  };

  const startProgressPolling = useCallback(() => {
    setLoadingProgress(0);
    setLoadingProgressText("Starting...");

    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("/api/inpaint-progress");
        if (response.ok) {
          const data = await response.json();
          const progressPercent = Math.round((data.progress || 0) * 100);
          setLoadingProgress(progressPercent);
          if (data.textinfo) {
            setLoadingProgressText(data.textinfo);
          } else if (data.progress > 0) {
            const eta = data.eta ? `~${Math.round(data.eta)}s remaining` : "";
            setLoadingProgressText(`${progressPercent}% ${eta}`);
          }
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 500);
  }, [setLoadingProgress, setLoadingProgressText]);

  const stopProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setLoadingProgress(0);
    setLoadingProgressText("");
  }, [setLoadingProgress, setLoadingProgressText]);

  const callInpaint = async () => {
    if (!target || !(target instanceof ImageLayer)) return;
    if (!hasDrawn) {
      alert("Please draw a mask first");
      return;
    }

    setLoading(true);
    setLoadingTask("inpainting");
    startProgressPolling();

    try {
      const maskBase64 = await getMaskAsBase64();
      if (!maskBase64) {
        throw new Error("Failed to generate mask");
      }

      const response = await fetch("/api/inpaint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          // Use current history position (could be previous generation or original)
          init_images: [getCurrentImageSrc() || target.imageData.src],
          mask: maskBase64,
          width: target.imageData.imageWidth,
          height: target.imageData.imageHeight,
          steps,
          cfg_scale: cfgScale,
          denoising_strength: denoisingStrength,
          sampler_name: sampler,
          seed,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to inpaint");
      }

      const data = await response.json();
      console.log("Inpaint response received:", {
        hasImages: !!data.images,
        imageCount: data.images?.length,
        firstImageLength: data.images?.[0]?.length,
        info: data.info,
      });

      if (data.images && data.images.length > 0) {
        console.log("Applying new texture to sprite...");
        const newTexture = await base64StringToTexture(data.images[0]);
        console.log(
          "Texture created:",
          newTexture.width,
          "x",
          newTexture.height,
        );

        // Update the layer sprite texture
        target.sprite.texture = newTexture;

        // Add to history - truncate any "future" history if we're not at the end
        const newHistory = [
          ...history.slice(0, historyIndex + 1),
          data.images[0],
        ];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        setHasGenerated(true);
        clearMask();
        console.log("Inpaint complete! History length:", newHistory.length);
      } else {
        console.warn("No images in response");
      }
    } catch (error) {
      console.error("Inpainting error:", error);
      alert("Failed to inpaint: " + (error as Error).message);
    } finally {
      stopProgressPolling();
      setLoadingTask("regular");
      setLoading(false);
      setTrigger(!trigger);
    }
  };

  return (
    <Sheet modal={false} open={editMode === "inpaint"}>
      <SheetContent
        side={"left"}
        className="h-full top-10 w-80 border-r-2 border-[#cdcdcd] dark:border-[#252525] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Inpaint</SheetTitle>
          <SheetDescription>
            Draw a mask over the area you want to modify, then describe what you
            want.
          </SheetDescription>
        </SheetHeader>
        <SelectSeparator className="m-3" />

        <div className="flex flex-col space-y-5 mt-5 items-start">
          {/* Brush Settings */}
          <div className="flex flex-col space-y-2 w-full">
            <Label>Brush Size: {brushSize}px</Label>
            <Slider
              value={[brushSize]}
              onValueChange={(v) => setBrushSize(v[0])}
              min={5}
              max={100}
              step={1}
              className="w-full"
            />
            <Button
              variant="outline"
              onClick={clearMask}
              disabled={!hasDrawn}
              className="w-full"
            >
              Clear Mask
            </Button>
          </div>

          <SelectSeparator className="w-full" />

          {/* Prompt Settings */}
          <div className="flex flex-col space-y-2 w-full">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="Describe what to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-input dark:bg-input border-border"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label htmlFor="negative-prompt">Negative Prompt</Label>
            <Input
              id="negative-prompt"
              placeholder="What to avoid..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="bg-input dark:bg-input border-border"
            />
          </div>

          <SelectSeparator className="w-full" />

          {/* Generation Settings */}
          <div className="flex flex-col space-y-2 w-full">
            <div className="flex flex-row space-x-2 items-center">
              <Label>Sampler</Label>
              <div className="flex flex-row items-center space-x-1">
                <InfoCircledIcon className="text-xs cursor-pointer text-muted-foreground" />
                <Link
                  href="https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#sampling-method-selection"
                  target="_blank"
                >
                  <p className="text-muted-foreground text-xs">Learn more</p>
                </Link>
              </div>
            </div>
            <SelectSampler sampler={sampler} setSampler={setSampler} />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label>Steps: {steps}</Label>
            <Slider
              value={[steps]}
              onValueChange={(v) => setSteps(v[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label>CFG Scale: {cfgScale}</Label>
            <Slider
              value={[cfgScale]}
              onValueChange={(v) => setCfgScale(v[0])}
              min={1}
              max={20}
              step={0.5}
              className="w-full"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label>Denoising Strength: {denoisingStrength.toFixed(2)}</Label>
            <Slider
              value={[denoisingStrength]}
              onValueChange={(v) => setDenoisingStrength(v[0])}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>

          <div className="flex flex-col space-y-2 w-full">
            <Label htmlFor="seed">Seed (-1 for random)</Label>
            <Input
              id="seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
              className="bg-input dark:bg-input border-border"
            />
          </div>

          <SelectSeparator className="w-full" />

          {/* History Navigation */}
          {history.length > 0 && (
            <div className="flex flex-col space-y-2 w-full">
              <Label>
                History:{" "}
                {historyIndex === -1
                  ? "Original"
                  : `${historyIndex + 1} of ${history.length}`}
              </Label>
              <div className="flex flex-row space-x-2 w-full">
                <Button
                  onClick={goToPrevious}
                  disabled={historyIndex === -1}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  ← Prev
                </Button>
                <Button
                  onClick={goToNext}
                  disabled={historyIndex >= history.length - 1}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Next →
                </Button>
              </div>
              <Button
                onClick={revertToOriginal}
                disabled={historyIndex === -1}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Revert to Original
              </Button>
            </div>
          )}

          <SelectSeparator className="w-full" />

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 w-full">
            <Button
              onClick={callInpaint}
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 w-full"
              disabled={!hasDrawn || loading}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>

          <SheetFooter className="w-full">
            <SheetClose asChild>
              <Button
                variant="ghost"
                type="submit"
                onClick={saveResult}
                className="w-full text-muted-foreground bg-black text-white"
              >
                Save Current & Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Inpaint;
