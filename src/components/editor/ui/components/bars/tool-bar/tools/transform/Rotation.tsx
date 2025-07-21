import { Label } from "@/components/ui/label";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { useEffect, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface RotationProps {
  target: ImageLayer;
  update: boolean;
}

const Rotation: React.FC<RotationProps> = ({ target, update }) => {
  const [angle, setAngle] = useState<number>(target.sprite.angle);

  useEffect(() => {
    setAngle(target.sprite.angle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  const handleSetAngle = (value: number) => {
    target.sprite.angle = value;
    setAngle(value);
  };
  return (
    <div className="w-40 h-7 flex flex-row items-center justify-center">
      <Label className="text-xs mr-2" htmlFor="rotation">
        Rotation
      </Label>
      <NumberInput
        value={angle}
        setValue={setAngle}
        min={0}
        max={360}
        step={1}
        onBlur={(e) => {
          handleSetAngle(parseFloat(e.currentTarget.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSetAngle(parseFloat(e.currentTarget.value));
          }
        }}
      />
    </div>
  );
};

export default Rotation;
