import { readAssistantProviderMode, type AssistantProviderMode, writeAssistantProviderMode } from "@/features/show-me/assistantPreferences";
import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const Developer: React.FC = () => {
  const [providerMode, setProviderMode] = useState<AssistantProviderMode>("auto");

  useEffect(() => {
    setProviderMode(readAssistantProviderMode());
  }, []);

  return (
    <div className="w-full flex-col space-y-5 mb-10">
      <div className="border-b-2 pb-2">
        <h1 className="text-2xl">Assistant Routing (Advanced)</h1>
        <p className="text-sm text-muted-foreground">
          Runs locally on this device. Use this only for testing provider behavior.
        </p>
      </div>

      <div className="flex flex-col space-y-3">
        <h2 className="text-lg font-semibold">Provider mode</h2>
        <p className="text-sm text-muted-foreground">
          Auto keeps explicit commands, analysis, and learning on the built-in path. Subjective requests can use local AI when available.
        </p>
        <RadioGroup
          className="pt-2"
          value={providerMode}
          onValueChange={(value) => {
            const nextMode = value as AssistantProviderMode;
            setProviderMode(nextMode);
            writeAssistantProviderMode(nextMode);
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="auto" id="assistant-mode-auto" />
            <Label htmlFor="assistant-mode-auto">Auto (recommended)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="deterministic" id="assistant-mode-deterministic" />
            <Label htmlFor="assistant-mode-deterministic">Built-in only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ollama-local" id="assistant-mode-ollama" />
            <Label htmlFor="assistant-mode-ollama">Local AI for subjective requests</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default Developer;
