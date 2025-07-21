import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getObjectValue, updateNestedState } from "@/utils/InputUtils";

interface SettingsRadioGroupProps {
  options: string[];
  settings: any;
  setSettings: (setting: any) => void;
  title: string;
  description: string;
  setHasChanged: (value: boolean) => void;
  keyToUpdate: string;
}

const SettingsRadioGroup: React.FC<SettingsRadioGroupProps> = ({
  options,
  settings,
  setHasChanged,
  setSettings,
  keyToUpdate,
  title,
  description,
}) => {
  return (
    <div className="">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm dark:text-gray-400 text-gray-500">{description}</p>
      <RadioGroup
        value={getObjectValue(settings, keyToUpdate)}
        className="pt-2"
        onValueChange={(value) => {
          setSettings((prevSettings: any) =>
            updateNestedState(prevSettings, keyToUpdate, value)
          );
          setHasChanged(true);
        }}
      >
        {options.map((option, key) => (
          <div className="flex items-center space-x-2" key={key}>
            <RadioGroupItem
              value={option.toLowerCase().replace(/\s+/g, "-")}
              id={option.toLowerCase()}
            />
            <Label htmlFor={option.toLowerCase()}>{option}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default SettingsRadioGroup;
