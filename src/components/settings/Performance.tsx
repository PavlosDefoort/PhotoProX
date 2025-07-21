import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PERFORMANCE_SETTINGS,
  PerformanceSettings,
  UserSettings,
} from "@/interfaces/FirebaseInterfaces";
import { handleUpdateSettings } from "@/services/FireBase";
import { debounce } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import SettingsRadioGroup from "./ui/SettingsRadioGroup";
import SettingsSelect from "./ui/SettingsSelect";
import SettingsSlider from "./ui/SettingsSlider";
import SettingsSwitch from "./ui/SettingsSwitch";

const Performance: React.FC = () => {
  const [hasChanged, setHasChanged] = useState(false);
  const { user, loading, photoProXUser, setPhotoProXUser } = useAuth();
  const [performanceSettings, setPerformanceSettings] =
    useState<PerformanceSettings>(DEFAULT_PERFORMANCE_SETTINGS);

  useEffect(() => {
    if (!photoProXUser) return;
    // Set the performance settings to the user's current settings
    setPerformanceSettings(photoProXUser.settings.performance);
  }, [photoProXUser, setPhotoProXUser]);

  const debouncedUpdateSettings = useMemo(
    () =>
      debounce((uid: string, performanceSettings: PerformanceSettings) => {
        const handleReadyToSave = (): UserSettings => {
          // Create a new UserSettings object with the updated performance settings
          const newSettings: UserSettings = {
            performance: performanceSettings,
          };
          return newSettings;
        };

        const newSettings = handleReadyToSave();
        handleUpdateSettings(uid, newSettings);
        setHasChanged(false);
      }, 1000),
    []
  );

  useEffect(() => {
    if (photoProXUser && hasChanged) {
      // Set the performance settings to the user's current settings
      debouncedUpdateSettings(photoProXUser.uid, performanceSettings);
    }
  }, [debouncedUpdateSettings, performanceSettings, photoProXUser, hasChanged]);

  return (
    <div>
      {user && !loading && photoProXUser && (
        <div className="w-full flex-col space-y-5 mb-10">
          <div>
            <div className="border-b-2 pb-2">
              <h1 className="text-2xl ">App Renderer</h1>
              <p className="text-sm text-muted-foreground">
                Configure the rendering engine for the application
              </p>
            </div>

            <div className="flex flex-col space-y-4 mt-4">
              <SettingsRadioGroup
                description="Choose the graphics API to use for rendering. WebGPU is a newer and faster API."
                keyToUpdate="graphicsAPI"
                options={["WebGL", "WebGPU"]}
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                settings={performanceSettings}
                title="Graphics API"
              />

              <SettingsRadioGroup
                description="Choose the scaling mode for the graphics renderer."
                keyToUpdate="scalingMode"
                options={["Linear", "Nearest"]}
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                settings={performanceSettings}
                title="Scaling Mode"
              />

              <SettingsRadioGroup
                description="Choose the power preference for the graphics renderer."
                keyToUpdate="powerPreference"
                options={["High Performance", "Low Power"]}
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                settings={performanceSettings}
                title="Power Preference"
              />

              <SettingsSlider
                description="Adjusts the pixel density for graphics rendering."
                keyToUpdate="resolution"
                max={2}
                min={0.1}
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                step={0.1}
                title="Resolution"
                value={performanceSettings.resolution}
                settings={performanceSettings}
                decimalPlaces={1}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={performanceSettings.usePixelRatio}
                  onCheckedChange={(checked) => {
                    setPerformanceSettings(
                      (prevSettings: PerformanceSettings) => ({
                        ...prevSettings,
                        usePixelRatio: checked as boolean,
                      })
                    );
                    setHasChanged(true);
                  }}
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Set as{" "}
                  <a
                    target="_blank"
                    href="https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio"
                    className="text-blue-500"
                  >
                    window.DevicePixelRatio
                  </a>{" "}
                  (recommended)
                </label>
              </div>

              <SettingsSwitch
                description="Antialiasing smooths out the edges of objects in the canvas."
                keyToUpdate="antialias"
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                title="Antialias"
                value={performanceSettings.antialias}
              />

              <SettingsSwitch
                description="Clear the canvas before rendering the next frame."
                keyToUpdate="clearBeforeRender"
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                title="Clear Before Render"
                value={performanceSettings.clearBeforeRender}
              />

              <SettingsSwitch
                description="Round pixel values to whole numbers for sharper images."
                keyToUpdate="roundPixels"
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                title="Round Pixels"
                value={performanceSettings.roundPixels}
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl border-b-2 pb-2">
              Image Compression Settings
            </h1>
            <div className="flex flex-col space-y-4 mt-4">
              <SettingsSwitch
                description="Use image compression for faster loading times. This will not affect the quality of the exported image."
                keyToUpdate="useCompression"
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                title="Compression"
                value={performanceSettings.useCompression}
              />

              <SettingsSelect
                description="Presets for convienient image compression settings. Set to
                  custom to configure your own settings."
                keyToUpdate="compression.mode"
                options={["Quality", "Performance", "Potato", "Custom"]}
                setHasChanged={setHasChanged}
                setSettings={setPerformanceSettings}
                settings={performanceSettings}
                title="Presets"
              />

              <div
                className={`${
                  performanceSettings.compression.mode === "custom"
                    ? ""
                    : "cursor-not-allowed"
                }`}
              >
                <div
                  className={`${
                    performanceSettings.compression.mode === "custom"
                      ? "opacity-100 flex flex-col space-y-5"
                      : "flex flex-col space-y-5 opacity-50 pointer-events-none cursor-not-allowed"
                  }`}
                >
                  <SettingsSelect
                    description="Choose the image format to use for compression."
                    keyToUpdate="compression.fileFormat"
                    options={["JPEG", "WebP", "PNG"]}
                    setHasChanged={setHasChanged}
                    setSettings={setPerformanceSettings}
                    settings={performanceSettings}
                    title="Format"
                  />
                  <SettingsSlider
                    title="Max Size"
                    description="Set the maximum file size for the compressed image in megabytes."
                    keyToUpdate="compression.maxSizeMB"
                    min={0.1}
                    max={10}
                    step={0.1}
                    setHasChanged={setHasChanged}
                    setSettings={setPerformanceSettings}
                    value={performanceSettings.compression.maxSizeMB}
                    settings={performanceSettings}
                    decimalPlaces={1}
                  />
                  <SettingsSlider
                    title="Max Iterations"
                    description="Set the maximum number of iterations for the compression algorithm. Note that more iterations will result in a smaller file size, but you'll have to wait longer"
                    keyToUpdate="compression.maxIterations"
                    min={1}
                    max={75}
                    step={1}
                    setHasChanged={setHasChanged}
                    setSettings={setPerformanceSettings}
                    value={performanceSettings.compression.maxIterations}
                    settings={performanceSettings}
                    decimalPlaces={0}
                  />
                  <SettingsSlider
                    title="Max Dimensions"
                    description="Set the maximum width or height for the compressed image. The image's ratio will be maintained.
                    If keep resolution is enabled, this setting will be ignored."
                    keyToUpdate="compression.maxDimension"
                    min={10}
                    max={8000}
                    step={1}
                    setHasChanged={setHasChanged}
                    setSettings={setPerformanceSettings}
                    value={performanceSettings.compression.maxDimension}
                    settings={performanceSettings}
                    decimalPlaces={0}
                  />
                  <SettingsSwitch
                    title="Keep Resolution"
                    description="Preserve the resolution of the image during compression. If disabled, the image's ratio will be maintained but the resolution will be reduced."
                    keyToUpdate="compression.alwaysKeepResolution"
                    setHasChanged={setHasChanged}
                    setSettings={setPerformanceSettings}
                    value={performanceSettings.compression.alwaysKeepResolution}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* <div>
            <h1 className="text-2xl border-b-2 pb-2">Memory Settings</h1>
            <div className="flex flex-col space-y-4 mt-4">
              <div className="">
                <h1 className="text-lg font-semibold">Undo Stack Size</h1>
                <p className="text-sm dark:text-gray-400 text-gray-500">
                  {" "}
                  Set the number of undos that can be performed. A higher number
                  of undos will consume more memory
                </p>
                <Input
                  type="number"
                  className="w-20 mt-2  border-gray-200"
                  defaultValue={100}
                />
              </div>
              <div className="">
                <h1 className="text-lg font-semibold">Redo Stack Size</h1>
                <p className="text-sm dark:text-gray-400 text-gray-500">
                  {" "}
                  Set the number of redos that can be performed. A higher number
                  of redos will consume more memory
                </p>
                <Input
                  type="number"
                  className="w-20 mt-2  border-gray-200"
                  defaultValue={100}
                />
              </div>
            </div>
          </div> */}
          <div className="flex flex-row space-x-3"></div>
          <Button
            onClick={() => {
              alert("Settings reset to default");
            }}
          >
            Reset to Default
          </Button>
        </div>
      )}
    </div>
  );
};

export default Performance;
