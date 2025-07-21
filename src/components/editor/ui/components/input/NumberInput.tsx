import { Input } from "@/components/ui/input";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { clamp } from "lodash";

interface NumberInputProps {
  max?: number;
  min?: number;
  step?: number;
  value: number;
  setValue: (value: number) => void;
  numPlaces?: number;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disable?: boolean;
}
const NumberInput: React.FC<NumberInputProps> = ({
  max,
  min,
  step,
  value,
  setValue,
  numPlaces,
  onBlur,
  onKeyDown,
  disable,
}) => {
  return (
    <Input
      onKeyDown={(e) => {
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      onBlur={(e) => {
        if (onBlur) {
          onBlur(e);
        }
      }}
      disabled={disable}
      onFocus={(e) => e.target.select()}
      className="w-20 h-8 text-center "
      type="text"
      onChange={(e) => {
        let value = parseFloat(e.target.value);
        if (e.target.value === "-") {
          value = -1;
        }

        if (!isNaN(value)) {
          const roundedValue = roundToDecimalPlaces(
            clamp(value, min ?? 0, max ?? 10000),
            numPlaces ?? 0
          );
          setValue(roundedValue);
        }
      }}
      value={value}
    />
  );
};
export default NumberInput;
