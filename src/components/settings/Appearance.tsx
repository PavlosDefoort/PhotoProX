import { useState } from "react";
import { Label } from "../ui/label";
import { RadioGroupItem, RadioGroup } from "../ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectGroup,
  SelectValue,
  SelectItem,
} from "../ui/select";
import { Switch } from "../ui/switch";

const Theme: React.FC = () => {
  const [singleTheme, setSingleTheme] = useState(false);
  return (
    <div className="w-full flex-col space-y-5 mb-10">
      <div>
        <div className="border-b-2 pb-2">
          <h1 className="text-2xl ">Theme Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure the theme settings for the editor
          </p>
        </div>

        <div className="flex flex-col space-y-4 mt-4">
          <div className="">
            <h1 className="text-lg font-semibold">Theme mode</h1>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              {" "}
              Choose the theme mode for the application
            </p>
            <Select>
              <SelectTrigger className="w-[180px] mt-2">
                <SelectValue placeholder="Select theme integration" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Theme Integration</SelectLabel>
                  <SelectItem value="apple">Single theme</SelectItem>
                  <SelectItem value="banana">Sync with system</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <div className="border-b-2 pb-2">
          <h1 className="text-2xl ">Font Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Choose from a variety of fonts for the application
          </p>
        </div>
        <div className="flex flex-col space-y-4 mt-4">
          <div className="">
            <h1 className="text-lg font-semibold">Font</h1>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              {" "}
              Enable seizure safe mode for the application
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch id="seizure-safe-mode" />
              <label
                htmlFor="seizure-safe-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                On
              </label>
            </div>
          </div>
          <div className="">
            <h1 className="text-lg font-semibold">Font Style </h1>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              {" "}
              Enable seizure safe mode for the application
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch id="seizure-safe-mode" />
              <label
                htmlFor="seizure-safe-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                On
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Theme;
