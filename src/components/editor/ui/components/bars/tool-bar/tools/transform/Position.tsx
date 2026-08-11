import { useCanvas } from "@/hooks/useCanvas";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { FederatedPointerEvent, Graphics, PointData } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface PositionProps {
  target: ImageLayer;
  update: boolean;
}

const Position: React.FC<PositionProps> = ({ target, update }) => {
  const { app, container } = useCanvas();
  const lineRef = useRef<Graphics | null>(null);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef<PointData>({ x: 0, y: 0 });
  const [positionX, setPositionX] = useState<number>(
    roundToDecimalPlaces(target.sprite.position.x, 0),
  );
  const [positionY, setPositionY] = useState<number>(
    roundToDecimalPlaces(target.sprite.position.y, 0),
  );

  useEffect(() => {
    setPositionX(roundToDecimalPlaces(target.sprite.position.x, 0));
    setPositionY(roundToDecimalPlaces(target.sprite.position.y, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  useEffect(() => {
    if (!container) return;

    if (!lineRef.current) {
      lineRef.current = new Graphics();
      container.addChild(lineRef.current);
      lineRef.current.zIndex = 1000;
    }

    const requestPreviewComposite = () => {
      container.compositeNeeded = true;
    };

    const previousContainerEventMode = container.eventMode;
    const previousInteractiveChildren = container.interactiveChildren;
    const previousSpriteEventMode = target.sprite.eventMode;

    container.eventMode = "static";
    container.interactiveChildren = true;
    target.sprite.eventMode = "static";
    target.sprite.cursor = "grab";

    const drawVerticalGuide = (x: number, height: number) => {
      lineRef.current?.moveTo(x, 0);
      lineRef.current?.lineTo(x, height);
    };

    const drawHorizontalGuide = (y: number, width: number) => {
      lineRef.current?.moveTo(0, y);
      lineRef.current?.lineTo(width, y);
    };

    const onPointerMove = (event: FederatedPointerEvent) => {
      if (!draggingRef.current) return;

      const localPosition = event.getLocalPosition(container);
      const scaleX = Math.abs(target.sprite.scale.x) || 1;
      const scaleY = Math.abs(target.sprite.scale.y) || 1;

      const rawX = localPosition.x - dragOffsetRef.current.x * scaleX;
      const rawY = localPosition.y - dragOffsetRef.current.y * scaleY;

      const width = container.originalWidth;
      const height = container.originalHeight;
      const halfW = target.sprite.width / 2;
      const halfH = target.sprite.height / 2;

      const thresholdX = Math.min(20, Math.max(6, width * 0.008));
      const thresholdY = Math.min(20, Math.max(6, height * 0.008));

      const xCandidates = [
        {
          value: width / 2,
          guide: "v-center",
          distance: Math.abs(rawX - width / 2),
        },
        { value: 0, guide: "v-left", distance: Math.abs(rawX) },
        { value: width, guide: "v-right", distance: Math.abs(rawX - width) },
        { value: halfW, guide: "v-left", distance: Math.abs(rawX - halfW) },
        {
          value: width - halfW,
          guide: "v-right",
          distance: Math.abs(rawX - (width - halfW)),
        },
        {
          value: width / 2 + halfW,
          guide: "v-center",
          distance: Math.abs(rawX - (width / 2 + halfW)),
        },
        {
          value: width / 2 - halfW,
          guide: "v-center",
          distance: Math.abs(rawX - (width / 2 - halfW)),
        },
      ];

      const yCandidates = [
        {
          value: height / 2,
          guide: "h-center",
          distance: Math.abs(rawY - height / 2),
        },
        { value: 0, guide: "h-top", distance: Math.abs(rawY) },
        { value: height, guide: "h-bottom", distance: Math.abs(rawY - height) },
        { value: halfH, guide: "h-top", distance: Math.abs(rawY - halfH) },
        {
          value: height - halfH,
          guide: "h-bottom",
          distance: Math.abs(rawY - (height - halfH)),
        },
      ];

      const xSnap = xCandidates
        .filter((candidate) => candidate.distance <= thresholdX)
        .sort((a, b) => a.distance - b.distance)[0];

      const ySnap = yCandidates
        .filter((candidate) => candidate.distance <= thresholdY)
        .sort((a, b) => a.distance - b.distance)[0];

      const finalX = xSnap ? xSnap.value : rawX;
      const finalY = ySnap ? ySnap.value : rawY;

      target.sprite.position.set(finalX, finalY);

      if (lineRef.current) {
        lineRef.current.clear();
        lineRef.current.stroke({ width: 3, color: 0xfc0fc0 });

        if (xSnap) {
          if (xSnap.guide === "v-left") drawVerticalGuide(0, height);
          if (xSnap.guide === "v-right") drawVerticalGuide(width, height);
          if (xSnap.guide === "v-center") drawVerticalGuide(width / 2, height);
        }

        if (ySnap) {
          if (ySnap.guide === "h-top") drawHorizontalGuide(0, width);
          if (ySnap.guide === "h-bottom") drawHorizontalGuide(height, width);
          if (ySnap.guide === "h-center")
            drawHorizontalGuide(height / 2, width);
        }
      }

      setPositionX(Math.round(finalX));
      setPositionY(Math.round(finalY));
      requestPreviewComposite();
    };

    const onPointerDown = (event: FederatedPointerEvent) => {
      event.stopPropagation();
      draggingRef.current = true;
      target.sprite.alpha = 0.75;
      target.sprite.cursor = "grabbing";
      dragOffsetRef.current = event.getLocalPosition(target.sprite);
      target.sprite.on("pointermove", onPointerMove);

      if (app.current?.stage) {
        app.current.stage.on("pointermove", onPointerMove);
        app.current.stage.on("pointerup", onPointerUp);
        app.current.stage.on("pointerupoutside", onPointerUp);
      }
    };

    const onPointerUp = () => {
      if (!draggingRef.current) return;

      draggingRef.current = false;
      lineRef.current?.clear();
      target.sprite.off("pointermove", onPointerMove);
      if (app.current?.stage) {
        app.current.stage.off("pointermove", onPointerMove);
        app.current.stage.off("pointerup", onPointerUp);
        app.current.stage.off("pointerupoutside", onPointerUp);
      }
      target.sprite.alpha = 1;
      target.sprite.cursor = "grab";
      requestPreviewComposite();
    };

    target.sprite.on("pointerdown", onPointerDown);
    target.sprite.on("pointerup", onPointerUp);
    target.sprite.on("pointerupoutside", onPointerUp);

    return () => {
      target.sprite.off("pointerdown", onPointerDown);
      target.sprite.off("pointerup", onPointerUp);
      target.sprite.off("pointerupoutside", onPointerUp);
      target.sprite.off("pointermove", onPointerMove);
      if (app.current?.stage) {
        app.current.stage.off("pointermove", onPointerMove);
        app.current.stage.off("pointerup", onPointerUp);
        app.current.stage.off("pointerupoutside", onPointerUp);
      }
      target.sprite.alpha = 1;
      target.sprite.cursor = "grab";
      draggingRef.current = false;

      container.eventMode = previousContainerEventMode;
      container.interactiveChildren = previousInteractiveChildren;
      target.sprite.eventMode = previousSpriteEventMode;

      lineRef.current?.clear();
      requestPreviewComposite();
    };
  }, [app, container, target]);

  const updatePosition = (value: number, axis: "x" | "y") => {
    if (!container) return;

    if (axis === "x") {
      target.sprite.position.x = value;
    } else {
      target.sprite.position.y = value;
    }
    container.compositeNeeded = true;
  };

  const updatePositionX = (value: number) => {
    setPositionX(value);
    updatePosition(value, "x");
  };

  const updatePositionY = (value: number) => {
    setPositionY(value);
    updatePosition(value, "y");
  };

  const handleKeyDownX = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updatePositionX(parseFloat(e.currentTarget.value));
    }
  };

  const handleBlurX = (e: React.FocusEvent<HTMLInputElement>) => {
    updatePositionX(parseFloat(e.currentTarget.value));
  };

  const handleKeyDownY = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      updatePositionY(parseFloat(e.currentTarget.value));
    }
  };

  const handleBlurY = (e: React.FocusEvent<HTMLInputElement>) => {
    updatePositionY(parseFloat(e.currentTarget.value));
  };

  return (
    <div className="flex shrink-0 flex-row items-center gap-1.5 border-r border-gray-500/40 pr-3">
      <div className="flex items-center gap-1">
        <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          X
        </span>
        <NumberInput
          value={positionX}
          setValue={setPositionX}
          numPlaces={0}
          step={1}
          onBlur={(e) => handleBlurX(e)}
          onKeyDown={(e) => handleKeyDownX(e)}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          Y
        </span>
        <NumberInput
          value={positionY}
          setValue={setPositionY}
          numPlaces={0}
          step={1}
          onBlur={(e) => handleBlurY(e)}
          onKeyDown={(e) => handleKeyDownY(e)}
        />
      </div>
    </div>
  );
};

export default Position;
