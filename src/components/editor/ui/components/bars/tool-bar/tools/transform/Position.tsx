import { Label } from "@/components/ui/label";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { ContainerX } from "@/models/pixi-extends/SpriteX";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import {
  FederatedPointerEvent,
  Graphics,
  Point,
  PointData,
  Sprite,
} from "pixi.js";
import { useEffect, useRef, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface PositionProps {
  target: ImageLayer;
  update: boolean;
}

const Position: React.FC<PositionProps> = ({ target, update }) => {
  const { setLayerManager, project } = useProject();
  const { app, container } = useCanvas();
  const lineRef = useRef<Graphics | null>(null);
  const dragging = useRef(false);
  const [positionX, setPositionX] = useState<number>(
    roundToDecimalPlaces(target.sprite.position.x, 0)
  );
  const [positionY, setPositionY] = useState<number>(
    roundToDecimalPlaces(target.sprite.position.y, 0)
  );

  useEffect(() => {
    setPositionX(roundToDecimalPlaces(target.sprite.position.x, 0));
    setPositionY(roundToDecimalPlaces(target.sprite.position.y, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  useEffect(() => {
    let dragOffset: PointData = { x: 0, y: 0 };
    if (container) {
      // Initialize the graphics object if it doesn't exist
      if (!lineRef.current) {
        lineRef.current = new Graphics();
        container.addChild(lineRef.current);
        lineRef.current.zIndex = 1000; // Ensure the line is in front of other objects
      }

      const snapCenterToCenterWidth = (
        sprite: Sprite,
        container: ContainerX
      ) => {
        if (!sprite || !container) return;

        // Calculate the center position of the container
        const containerCenterX = container.originalWidth / 2;

        // Snap the sprite to the center of the container
        sprite.x = containerCenterX;
      };

      const snapCenterToCenterHeight = (
        sprite: Sprite,
        container: ContainerX
      ) => {
        if (!sprite || !container) return;

        // Calculate the center position of the container
        const containerCenterY = container.originalHeight / 2;

        // Snap the sprite to the center of the container
        sprite.y = containerCenterY;
      };

      const snapCenterToLeftEdge = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Snap the sprite to the left edge of the container
        sprite.x = 0;
      };

      const snapCenterToRightEdge = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Snap the sprite to the right edge of the container
        sprite.x = container.originalWidth;
      };

      const snapCenterToTopEdge = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Snap the sprite to the top edge of the container
        sprite.y = 0;
      };

      const snapCenterToBottomEdge = (
        sprite: Sprite,
        container: ContainerX
      ) => {
        if (!sprite || !container) return;

        // Snap the sprite to the bottom edge of the container
        sprite.y = container.originalHeight;
      };

      const snapLeftToCenter = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Calculate the center position of the container
        const containerCenterX = container.originalWidth / 2;

        // Snap the sprite to the center of the container
        sprite.x = containerCenterX + sprite.width / 2;
      };

      const snapRightToCenter = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Calculate the center position of the container
        const containerCenterX = container.originalWidth / 2;

        // Snap the sprite to the center of the container
        sprite.x = containerCenterX - sprite.width / 2;
      };

      const snapLeftToLeftEdge = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Snap the sprite to the left edge of the container
        sprite.x = sprite.width / 2;
      };

      const snapRightToRightEdge = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Snap the sprite to the right edge of the container
        sprite.x = container.originalWidth - sprite.width / 2;
      };

      const snapTopToTopEdge = (sprite: Sprite, container: ContainerX) => {
        if (!sprite || !container) return;

        // Snap the sprite to the top edge of the container
        sprite.y = sprite.height / 2;
      };

      const snapBottomToBottomEdge = (
        sprite: Sprite,
        container: ContainerX
      ) => {
        if (!sprite || !container) return;

        // Snap the sprite to the bottom edge of the container
        sprite.y = container.originalHeight - sprite.height / 2;
      };

      const drawLeftEdgeLine = (
        line: Graphics,
        width: number,
        height: number
      ) => {
        // Draw a vertical line at the left edge of the canvas
        line.stroke({
          width: 5,
          color: 0xfc0fc0,
        });
        line.moveTo(5, 0);
        line.lineTo(0, height);
      };

      const drawRightEdgeLine = (
        line: Graphics,
        width: number,
        height: number
      ) => {
        // Draw a vertical line at the right edge of the canvas
        line.stroke({
          width: 5,
          color: 0xfc0fc0,
        });
        line.moveTo(width - 1, 0);
        line.lineTo(width, height);
      };

      const drawBottomEdgeLine = (
        line: Graphics,
        width: number,
        height: number
      ) => {
        // Draw a horizontal line at the bottom edge of the canvas
        line.stroke({
          width: 5,
          color: 0xfc0fc0,
        });
        line.moveTo(0, height - 1);
        line.lineTo(width, height);
      };

      const drawTopEdgeLine = (
        line: Graphics,
        width: number,
        height: number
      ) => {
        // Draw a horizontal line at the top edge of the canvas
        line.stroke({
          width: 5,
          color: 0xfc0fc0,
        });
        line.moveTo(0, 1);
        line.lineTo(width, 0);
      };

      const drawCenterVerticalLine = (
        line: Graphics,
        width: number,
        height: number
      ) => {
        // Draw a vertical line at the center of the canvas
        line.stroke({
          width: 5,
          color: 0xfc0fc0,
        });
        line.moveTo(width / 2, 0);
        line.lineTo(width / 2, height);
      };

      const drawCenterHorizontalLine = (
        line: Graphics,
        width: number,
        height: number
      ) => {
        // Draw a horizontal line at the center of the canvas
        line.stroke({
          width: 5,
          color: 0xfc0fc0,
        });
        line.moveTo(0, height / 2);
        line.lineTo(width, height / 2);
      };

      // Function to handle pointer move
      const onPointerMove = (event: FederatedPointerEvent) => {
        if (target.sprite) {
          const newPosition = event.getLocalPosition(container);
          // OffsetX = k * x
          const offsetX = dragOffset.x * target.sprite.scale.x;
          const offsetY = dragOffset.y * target.sprite.scale.y;
          // Dx = x2 - x1
          const x = newPosition.x - offsetX;
          // Dy = y2 - y1
          const y = newPosition.y - offsetY;

          const width = container.originalWidth;
          const height = container.originalHeight;

          // Calculate the distance from the center of the container
          const diffWidth = Math.abs(x - width / 2);
          const diffHeight = Math.abs(y - height / 2);

          // Calculate the distance from the left edge of the container
          const diffEdgeLeft = Math.abs(x);
          // Calculate the distance from the right edge of the container
          const diffEdgeRight = Math.abs(width - x);
          // Calculate the distance from the top edge of the container
          const diffEdgeTop = Math.abs(y);
          // Calculate the distance from the bottom edge of the container
          const diffEdgeBottom = Math.abs(height - y);

          // Calculate the distance from the left edge of the container
          const leftEdgeDistance = Math.abs(x - target.sprite.width / 2);
          // Calculate the distance of the left edge from the center
          const diffWidthLeftEdge = Math.abs(leftEdgeDistance - width / 2);

          // Calculate the distance of the left edge from the left edge
          const leftEdgeFromLeft = Math.abs(leftEdgeDistance - 0);

          // Calculate the distance from the right edge of the container
          const rightEdgeDistance = Math.abs(x + target.sprite.width / 2);

          // Calculate the distance of the right edge from the right edge
          const rightEdgeFromRight = Math.abs(rightEdgeDistance - width);

          // Calculate the distance of the right edge from the center
          const diffWidthRightEdge = Math.abs(rightEdgeDistance - width / 2);

          // Calculate the distance from the top edge of the container
          const topEdgeDistance = Math.abs(y - target.sprite.height / 2);

          // Calculate the distance of the top edge from the top edge
          const topEdgeFromTop = Math.abs(topEdgeDistance - 0);

          // Calculate the distance from the bottom edge of the container
          const bottomEdgeDistance = Math.abs(y + target.sprite.height / 2);

          // Calculate the distance of the bottom edge from the bottom edge
          const bottomEdgeFromBottom = Math.abs(bottomEdgeDistance - height);

          // Threshold is 3% of the container width and height
          const thresholdWidth = width * 0.005;
          const thresholdHeight = height * 0.005;

          // Check if the position meets a snap condition
          target.sprite.position.set(x, y);
          lineRef.current!.clear();

          if (diffWidth < thresholdWidth) {
            drawCenterVerticalLine(lineRef.current!, width, height);
            snapCenterToCenterWidth(target.sprite, container);
          }
          if (diffHeight < thresholdHeight) {
            drawCenterHorizontalLine(lineRef.current!, width, height);
            snapCenterToCenterHeight(target.sprite, container);
          }
          if (diffEdgeLeft < thresholdWidth) {
            drawLeftEdgeLine(lineRef.current!, width, height);
            snapCenterToLeftEdge(target.sprite, container);
          }
          if (diffEdgeRight < thresholdWidth) {
            drawRightEdgeLine(lineRef.current!, width, height);
            snapCenterToRightEdge(target.sprite, container);
          }
          if (diffEdgeTop < thresholdHeight) {
            drawTopEdgeLine(lineRef.current!, width, height);
            snapCenterToTopEdge(target.sprite, container);
          }
          if (diffEdgeBottom < thresholdHeight) {
            drawBottomEdgeLine(lineRef.current!, width, height);
            snapCenterToBottomEdge(target.sprite, container);
          }
          if (diffWidthLeftEdge < thresholdWidth) {
            drawCenterVerticalLine(lineRef.current!, width, height);
            snapLeftToCenter(target.sprite, container);
          }
          if (diffWidthRightEdge < thresholdWidth) {
            drawCenterVerticalLine(lineRef.current!, width, height);
            snapRightToCenter(target.sprite, container);
          }
          if (leftEdgeFromLeft < thresholdWidth) {
            // drawLeftEdgeLine(lineRef.current!, width, height);
            // snapCenterToLeftEdge(target.sprite, container);
            drawLeftEdgeLine(lineRef.current!, width, height);
            snapLeftToLeftEdge(target.sprite, container);
          }

          if (rightEdgeFromRight < thresholdWidth) {
            drawRightEdgeLine(lineRef.current!, width, height);
            snapRightToRightEdge(target.sprite, container);
          }

          if (topEdgeFromTop < thresholdHeight) {
            drawTopEdgeLine(lineRef.current!, width, height);
            snapTopToTopEdge(target.sprite, container);
          }

          if (bottomEdgeFromBottom < thresholdHeight) {
            drawBottomEdgeLine(lineRef.current!, width, height);
            snapBottomToBottomEdge(target.sprite, container);
          }

          // Update the position state
          setPositionX(Math.round(target.sprite.position.x));
          setPositionY(Math.round(target.sprite.position.y));
        }
      };

      const onPointerDown = (event: FederatedPointerEvent) => {
        target.sprite.alpha = 0.75;
        target.sprite.cursor = "grabbing";
        dragOffset = event.getLocalPosition(target.sprite);
        target.sprite.on("pointermove", onPointerMove);
      };

      const onPointerUp = (event: FederatedPointerEvent) => {
        lineRef.current?.clear();
        target.sprite.off("pointermove", onPointerMove);

        target.sprite.alpha = 1;
        target.sprite.cursor = "grab";
      };

      // Add event listener for pointer move

      target.sprite.on("pointerdown", onPointerDown);
      target.sprite.on("pointerup", onPointerUp);
      target.sprite.on("pointerupoutside", onPointerUp);

      // Cleanup function to remove event listener
      return () => {
        if (target.sprite) {
          target.sprite.off("pointerdown", onPointerDown);
          target.sprite.off("pointerup", onPointerUp);
          target.sprite.off("pointerupoutside", onPointerUp);
          target.sprite.off("pointermove", onPointerMove);
        }
        lineRef.current?.clear(); // Clear the line when component unmounts
      };
    }
  }, [container, target]);

  const updatePosition = (value: number, axis: "x" | "y") => {
    if (axis === "x") {
      target.sprite.position.x = value;
    } else {
      target.sprite.position.y = value;
    }
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
    <div className="flex flex-row ">
      <div className="w-40 h-7 flex flex-row items-center justify-center">
        <Label className="text-xs mr-2" htmlFor="translatex">
          X
        </Label>
        <NumberInput
          value={positionX}
          setValue={setPositionX}
          numPlaces={0}
          step={1}
          onBlur={(e) => {
            handleBlurX(e);
          }}
          onKeyDown={(e) => {
            handleKeyDownX(e);
          }}
        />
      </div>
      <div className="w-40 h-7 flex flex-row items-center justify-center">
        <Label className="text-xs mr-2" htmlFor="translateY">
          Y
        </Label>
        <NumberInput
          value={positionY}
          setValue={setPositionY}
          numPlaces={0}
          step={1}
          onBlur={(e) => {
            handleBlurY(e);
          }}
          onKeyDown={(e) => {
            handleKeyDownY(e);
          }}
        />
      </div>
    </div>
  );
};

export default Position;
