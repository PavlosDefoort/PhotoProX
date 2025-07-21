import { Input } from "@/components/ui/input";
import { useProject } from "@/hooks/useProject";
import { LayerX } from "@/models/project/Layers/Layers";
import { useRef, useState } from "react";

interface NameInputProps {
  layer: LayerX;
}

const NameInput: React.FC<NameInputProps> = ({ layer }) => {
  const { setLayerManager } = useProject();
  const [name, setName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Input
      className="w-4/12"
      autoCorrect="off"
      ref={inputRef}
      value={name}
      onChange={(e) => {
        setName(e.target.value);
      }}
      onClick={() => {
        inputRef.current?.select();
      }}
      onBlur={(e) => {
        setLayerManager((draft) => {
          draft.layers = draft.layers.map((l) => {
            if (l.id === layer.id) {
              l.name = name;
            }
            return l;
          });
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setLayerManager((draft) => {
            draft.layers = draft.layers.map((l) => {
              if (l.id === layer.id) {
                l.name = name;
              }
              return l;
            });
          });
        }
      }}
    />
  );
};
export default NameInput;
