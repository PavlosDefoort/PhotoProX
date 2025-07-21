import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { clamp, roundToDecimalPlaces } from "@/utils/CalcUtils";
import { Switch } from "../ui/switch";

const Accessibility: React.FC = () => {
  const [slideValue, setSlideValue] = useState([0.5]);
  return (
    <div className="w-full flex-col space-y-5 mb-10">
      <div>
        <div className="border-b-2 pb-2">
          <h1 className="text-2xl ">Color Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure the color settings for the application
          </p>
        </div>

        <div className="flex flex-col space-y-4 mt-4">
          <div className="">
            <h1 className="text-lg font-semibold">Color Blindness</h1>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              {" "}
              Choose the color blindness mode for the application
            </p>
            <RadioGroup defaultValue="option-one" className="pt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-two" id="option-two" />
                <Label htmlFor="option-two">
                  Red-green (green weak, Deuteranopia)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-one" id="option-one" />
                <Label htmlFor="option-one">
                  Red-green (red weak, Protanopia)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-three" id="option-three" />
                <Label htmlFor="option-three">Blue-yellow (Tritanopia)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-four" id="option-four" />
                <Label htmlFor="option-four">Monochromacy</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="">
            <h1 className="text-lg font-semibold">Area of Application</h1>
            <p className="text-sm dark:text-gray-400 text-gray-500 ">
              {" "}
              Choose the area of application for the color blindness mode
            </p>
            <RadioGroup defaultValue="option-one" className="pt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-one" id="option-one" />
                <Label htmlFor="option-one">Entire Application</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-two" id="option-two" />
                <Label htmlFor="option-two">
                  Editor UI (modals, bars, popovers)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option-three" id="option-three" />
                <Label htmlFor="option-three">Canvas</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="">
            <h1 className="text-lg font-semibold">Export</h1>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              {" "}
              If a color blind filter is on the canvas, choose whether to export
              the canvas with the filter applied
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch id="export-color-filter" />
              <label
                htmlFor="export-color-filter"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                On
              </label>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-2xl border-b-2 pb-2">Seizure Safe Settings</h1>
        <div className="flex flex-col space-y-4 mt-4">
          <div className="">
            <h1 className="text-lg font-semibold">Seizure Safe Mode</h1>
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

export default Accessibility;
