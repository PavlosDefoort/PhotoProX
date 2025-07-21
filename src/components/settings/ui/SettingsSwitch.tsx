import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getObjectValue, updateNestedState } from "@/utils/InputUtils";

interface SwitchProps {
  value: boolean;
  title: string;
  description: string;
  setSettings: (setting: any) => void;
  keyToUpdate: string;
  setHasChanged: (value: boolean) => void;
}

const SettingsSwitch: React.FC<SwitchProps> = ({
  setSettings,
  value,
  title,
  description,
  keyToUpdate,
  setHasChanged,
}) => {
  return (
    <div className="">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm dark:text-gray-400 text-gray-500">{description}</p>
      <div className="flex items-center space-x-2 mt-2">
        <Switch
          id={title.toLowerCase()}
          checked={value}
          onCheckedChange={(checked) => {
            setSettings((prevSettings: any) =>
              updateNestedState(prevSettings, keyToUpdate, checked)
            );
            setHasChanged(true);
          }}
        />
        <Label
          htmlFor={title.toLowerCase()}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {value ? "Enabled" : "Disabled"}
        </Label>
      </div>
    </div>
  );
};

export default SettingsSwitch;
