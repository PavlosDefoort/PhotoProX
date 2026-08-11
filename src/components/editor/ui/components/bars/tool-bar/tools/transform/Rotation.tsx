import { useImageTransformActions } from "@/hooks/useImageTransformActions";
import { useProject } from "@/hooks/useProject";
import { ImageLayer } from "@/models/project/Layers/Layers";
import { useEffect, useState } from "react";
import NumberInput from "../../../../input/NumberInput";

interface RotationProps {
  target: ImageLayer;
  update: boolean;
}

const Rotation: React.FC<RotationProps> = ({ target, update }) => {
  const { editDocument } = useProject();
  const { dispatchSelectedImageActions } = useImageTransformActions();
  const [angle, setAngle] = useState<number>(target.sprite.angle);
  const documentAngle =
    editDocument.imageLayers[target.id]?.transform.rotationDegrees;

  useEffect(() => {
    setAngle(target.sprite.angle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentAngle, target.sprite.angle, update]);

  const handleSetAngle = (value: number) => {
    const result = dispatchSelectedImageActions(
      [{ type: "image.setRotation", degrees: value }],
      "Set image rotation",
    );
    if (result.ok) {
      setAngle(target.sprite.angle);
    }
  };
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-r border-gray-500/40 pr-3"
      data-show-me-control="transform.rotation"
    >
      <span className="select-none rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
        °
      </span>
      <NumberInput
        value={angle}
        setValue={setAngle}
        min={0}
        max={360}
        step={1}
        onBlur={(e) => handleSetAngle(parseFloat(e.currentTarget.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSetAngle(parseFloat(e.currentTarget.value));
        }}
      />
    </div>
  );
};

export default Rotation;
