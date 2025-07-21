import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { updateNestedState } from "@/utils/InputUtils";
import { clamp } from "lodash";

interface SettingsSliderProps {
  title: string;
  description: string;
  settings: any;
  setSettings: (setting: any) => void;
  keyToUpdate: string;
  setHasChanged: (value: boolean) => void;
  max: number;
  min: number;
  step: number;
  value: number;
  decimalPlaces: number;
}

const SettingsSlider: React.FC<SettingsSliderProps> = ({
  title,
  description,
  settings,
  min,
  max,
  step,
  keyToUpdate,
  setHasChanged,
  setSettings,
  value,
  decimalPlaces,
}) => {
  return (
    <div className="">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm dark:text-gray-400 text-gray-500">{description}</p>
      <div className="flex flex-col space-y-4 mt-2">
        <div className="flex space-x-2">
          <Slider
            className="w-32 mt-2"
            min={min}
            max={max}
            step={step}
            value={[value]}
            onValueChange={(e) => {
              setSettings((prevSettings: any) =>
                updateNestedState(prevSettings, keyToUpdate, e[0])
              );
            }}
            onValueCommit={(e) => {
              setHasChanged(true);
            }}
          />
          <Input
            value={value}
            className="w-16 border-gray-200 mt-2"
            type="number"
            step={step}
            min={min}
            max={max}
            onChange={(e) => {
              const value = clamp(
                roundToDecimalPlaces(parseFloat(e.target.value), decimalPlaces),
                min,
                max
              );

              if (isNaN(value)) {
                return;
              }

              // Round to 1 decimal place
              setSettings((prevSettings: any) =>
                updateNestedState(prevSettings, keyToUpdate, value)
              );
              setHasChanged(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};
export default SettingsSlider;
