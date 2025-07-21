import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/hooks/useProject";
import { AdjustmentLayer } from "@/models/project/Layers/Layers";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { clamp } from "lodash";
import { useState } from "react";

interface AdjustmentAdjusterProps {
  max: number;
  min: number;
  step: number;
  title: string;
  setMatrix?: (...props: any[]) => void;
  description: string;
  matrix: any;
  keyToAdjust: string;
  numDecimals: number;
  initialValue: number;
  layer: AdjustmentLayer;
}

const AdjustmentAdjuster: React.FC<AdjustmentAdjusterProps> = ({
  min,
  max,
  step,
  title,
  setMatrix,
  description,
  matrix,
  keyToAdjust,
  numDecimals,
  initialValue,
  layer,
}) => {
  const [value, setValue] = useState(initialValue);

  const { setLayerManager } = useProject();

  const handleMatrixChange = (value: number, matrix: any) => {
    if (setMatrix) {
      setMatrix(value, matrix);
    } else {
      matrix[keyToAdjust] = value;
    }
  };

  const handleCommit = () => {
    // Set the layer manager with the new filter value
    handleMatrixChange(value, matrix);
    setLayerManager((draft) => {
      draft.layers = draft.layers.map((l) => {
        if (l.id === layer.id) {
          (l as any)[keyToAdjust] = value;
        }
        return l;
      });
    });
  };

  return (
    <div>
      <Label className="font-semibold">{title}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex flex-row space-x-2">
        <Slider
          className="w-9/12"
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(value) => {
            handleMatrixChange(value[0], matrix);
            setValue(value[0]);
          }}
          onValueCommit={() => {
            handleCommit();
          }}
        />
        <Input
          min={min}
          max={max}
          id={keyToAdjust}
          type="number"
          step={step}
          className="w-3/12"
          value={value}
          onChange={(e) => {
            const parsedValue = parseFloat(e.target.value);

            if (!isNaN(parsedValue)) {
              const roundedValue = roundToDecimalPlaces(
                clamp(parsedValue, min, max),
                numDecimals
              );
              setValue(roundedValue);
            }
          }}
          onBlur={() => {
            handleCommit();
          }}
          onKeyDown={(e) => {
            // On enter
            if (e.key === "Enter") {
              handleCommit();
            }
          }}
        />
      </div>
    </div>
  );
};

export default AdjustmentAdjuster;
