import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface AdjustmentCheckBoxProps {
  title: string;
  description: string;
  keyToAdjust: string;
  matrix: any;
  initialValue: boolean;
}

const AdjustmentCheckBox: React.FC<AdjustmentCheckBoxProps> = ({
  title,
  description,
  keyToAdjust,
  matrix,
  initialValue,
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <Label className="font-semibold">{title}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-row items-center space-x-2">
        <Checkbox
          checked={value}
          onCheckedChange={(newValue) => {
            matrix[keyToAdjust] = newValue;
            setValue(newValue as boolean);
          }}
        />
        <p className="text-xs text-muted-foreground">
          {value ? "Enabled" : "Disabled"}
        </p>
      </div>
    </div>
  );
};

export default AdjustmentCheckBox;
