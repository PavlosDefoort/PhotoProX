import { useCanvas } from "@/hooks/useCanvas";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { useEffect, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface SkewProps {
  target: ImageLayer;
  update: boolean;
}

const Skew: React.FC<SkewProps> = ({ target, update }) => {
  const { container } = useCanvas();
  const [skewX, setSkewX] = useState<number>(target.sprite.skew.x);
  const [skewY, setSkewY] = useState<number>(target.sprite.skew.y);

  useEffect(() => {
    setSkewX(target.sprite.skew.x);
    setSkewY(target.sprite.skew.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  const updateSkew = (value: number, axis: "x" | "y") => {
    if (axis === "x") {
      target.sprite.skew.x = value;
    } else {
      target.sprite.skew.y = value;
    }
    if (container) {
      container.compositeNeeded = true;
    }
  };

  return (
    <div className="flex shrink-0 flex-row items-center gap-1.5 px-2">
      <div className="flex items-center gap-1">
        <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          ↗
        </span>
        <NumberInput
          min={0}
          max={3}
          numPlaces={2}
          value={skewX}
          setValue={setSkewX}
          onBlur={(e) => updateSkew(parseFloat(e.currentTarget.value), "x")}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateSkew(parseFloat(e.currentTarget.value), "x");
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
          ↘
        </span>
        <NumberInput
          min={0}
          max={3}
          numPlaces={2}
          value={skewY}
          setValue={setSkewY}
          onBlur={(e) => updateSkew(parseFloat(e.currentTarget.value), "y")}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateSkew(parseFloat(e.currentTarget.value), "y");
          }}
        />
      </div>
    </div>
  );
};

export default Skew;
