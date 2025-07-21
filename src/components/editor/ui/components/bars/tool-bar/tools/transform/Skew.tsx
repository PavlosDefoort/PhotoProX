import { Label } from "@/components/ui/label";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { useEffect, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface SkewProps {
  target: ImageLayer;
  update: boolean;
}

const Skew: React.FC<SkewProps> = ({ target, update }) => {
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
  };

  return (
    <div className="flex flex-row">
      <div className="w-40 h-7 flex flex-row items-center justify-center">
        <Label className="text-xs mr-2" htmlFor="skewX">
          Skew X
        </Label>
        <NumberInput
          min={0}
          max={3}
          numPlaces={2}
          value={skewX}
          setValue={setSkewX}
          onBlur={(e) => {
            updateSkew(parseFloat(e.currentTarget.value), "x");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateSkew(parseFloat(e.currentTarget.value), "x");
            }
          }}
        />
      </div>
      <div className="w-40 h-7 flex flex-row items-center justify-center">
        <Label className="text-xs mr-2" htmlFor="skewY">
          Skew Y
        </Label>
        <NumberInput
          min={0}
          max={3}
          numPlaces={2}
          value={skewY}
          setValue={setSkewY}
          onBlur={(e) => {
            updateSkew(parseFloat(e.currentTarget.value), "y");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateSkew(parseFloat(e.currentTarget.value), "y");
            }
          }}
        />
      </div>
    </div>
  );
};

export default Skew;
