import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PERFORMANCE_COMPRESSION_SETTINGS,
  DEFAULT_POTATO_COMPRESSION_SETTINGS,
  DEFAULT_QUALITY_COMPRESSION_SETTINGS,
} from "@/interfaces/FirebaseInterfaces";
import { getObjectValue, updateNestedState } from "@/utils/InputUtils";

interface SettingsSelectProps {
  title: string;
  description: string;
  settings: any;
  setSettings: (setting: any) => void;
  keyToUpdate: string;
  options: string[];
  setHasChanged: (value: boolean) => void;
}

const SettingsSelect: React.FC<SettingsSelectProps> = ({
  title,
  description,
  settings,
  setHasChanged,
  setSettings,
  keyToUpdate,
  options,
}) => {
  return (
    <div className="">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm dark:text-gray-400 text-gray-500">{description}</p>
      <Select
        value={getObjectValue(settings, keyToUpdate)}
        onValueChange={(value) => {
          switch (value) {
            case "quality":
              setSettings((prevSettings: any) => ({
                ...prevSettings,
                compression: DEFAULT_QUALITY_COMPRESSION_SETTINGS,
              }));
              break;
            case "performance":
              setSettings((prevSettings: any) => ({
                ...prevSettings,
                compression: DEFAULT_PERFORMANCE_COMPRESSION_SETTINGS,
              }));
              break;
            case "potato":
              setSettings((prevSettings: any) => ({
                ...prevSettings,
                compression: DEFAULT_POTATO_COMPRESSION_SETTINGS,
              }));
              break;

            default:
              setSettings((prevSettings: any) =>
                updateNestedState(prevSettings, keyToUpdate, value)
              );
              break;
          }

          setHasChanged(true);
        }}
      >
        <SelectTrigger className="w-[180px] mt-2">
          <SelectValue placeholder={title} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{title}</SelectLabel>
            {options.map((option, key) => (
              <SelectItem
                key={key}
                value={option.toLowerCase().replace(/\s+/g, "-")}
              >
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
export default SettingsSelect;
