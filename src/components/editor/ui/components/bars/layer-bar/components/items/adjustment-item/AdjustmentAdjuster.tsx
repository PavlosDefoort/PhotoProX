import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCanvas } from "@/hooks/useCanvas";
import { useProject } from "@/hooks/useProject";
import { AdjustmentLayer } from "@/models/project/Layers/Layers";
import { roundToDecimalPlaces } from "@/utils/CalcUtils";
import { clamp } from "lodash";
import { useEffect, useRef, useState } from "react";
import {
  AdjustmentEditState,
  ImageAdjustmentAction,
} from "@/interfaces/editor/EditDocument";
import { useImageTransformActions } from "@/hooks/useImageTransformActions";
import { readAdjustmentEditState } from "@/models/editor/AdjustmentDocument";

interface AdjustmentAdjusterProps {
  max: number;
  min: number;
  step: number;
  title: string;
  setMatrix?: (...props: any[]) => void;
  description: string;
  matrix: any;
  keyToAdjust: string;
  numDecimals: number;
  initialValue: number;
  layer: AdjustmentLayer;
}

const AdjustmentAdjuster: React.FC<AdjustmentAdjusterProps> = ({
  min,
  max,
  step,
  title,
  setMatrix,
  description,
  matrix,
  keyToAdjust,
  numDecimals,
  initialValue,
  layer,
}) => {
  const [value, setValue] = useState(initialValue);

  const { editDocument, setLayerManager } = useProject();
  const { container } = useCanvas();
  const {
    dispatchSelectedImageActions,
    previewSelectedAdjustmentAction,
  } = useImageTransformActions();
  const transactionStart = useRef<AdjustmentEditState | null>(null);
  const documentState = editDocument.adjustmentLayers[layer.id];

  const createAction = (nextValue: number): ImageAdjustmentAction | null => {
    switch (keyToAdjust) {
      case "brightness":
        return { type: "adjustment.setBrightness", value: nextValue };
      case "contrast":
        return { type: "adjustment.setContrast", value: nextValue };
      case "saturation":
        return { type: "adjustment.setSaturation", value: nextValue };
      default:
        return null;
    }
  };

  useEffect(() => {
    const documentValue = documentState?.values[
      keyToAdjust as keyof typeof documentState.values
    ];
    if (typeof documentValue === "number") {
      setValue(documentValue);
    }
  }, [documentState, keyToAdjust]);

  const requestPreviewComposite = () => {
    if (container) {
      container.compositeNeeded = true;
    }
  };

  const handleMatrixChange = (value: number, matrix: any) => {
    if (setMatrix) {
      setMatrix(value, matrix);
    } else {
      matrix[keyToAdjust] = value;
    }
  };

  const handleCommit = (nextValue = value) => {
    const action = createAction(nextValue);
    if (action) {
      const before =
        transactionStart.current ??
        documentState ??
        readAdjustmentEditState(layer);
      const result = dispatchSelectedImageActions(
        [action],
        `Set ${title.toLowerCase()}`,
        {
          adjustmentBefore: before ? { [layer.id]: before } : undefined,
          adjustmentLayerId: layer.id,
        },
      );
      if (result.ok) {
        setValue(nextValue);
      }
      transactionStart.current = null;
      return;
    }
    // Set the layer manager with the new filter value
    handleMatrixChange(nextValue, matrix);
    requestPreviewComposite();
    setLayerManager((draft) => {
      draft.layers = draft.layers.map((l) => {
        if (l.id === layer.id) {
          (l as any)[keyToAdjust] = nextValue;
        }
        return l;
      });
    });
  };

  return (
    <div
      data-show-me-control={
        createAction(value) ? `adjustment.${keyToAdjust}` : undefined
      }
    >
      <Label className="font-semibold">{title}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex flex-row space-x-2">
        <Slider
          className="w-9/12"
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(value) => {
            const action = createAction(value[0]);
            if (action) {
              transactionStart.current ??=
                documentState ?? readAdjustmentEditState(layer);
              previewSelectedAdjustmentAction(action, layer.id);
            } else {
              handleMatrixChange(value[0], matrix);
              requestPreviewComposite();
            }
            setValue(value[0]);
          }}
          onValueCommit={(value) => {
            handleCommit(value[0]);
          }}
        />
        <Input
          min={min}
          max={max}
          id={keyToAdjust}
          type="number"
          step={step}
          className="w-3/12"
          value={value}
          onChange={(e) => {
            const parsedValue = parseFloat(e.target.value);

            if (!isNaN(parsedValue)) {
              const roundedValue = roundToDecimalPlaces(
                clamp(parsedValue, min, max),
                numDecimals,
              );
              setValue(roundedValue);
            }
          }}
          onBlur={() => {
            handleCommit();
          }}
          onKeyDown={(e) => {
            // On enter
            if (e.key === "Enter") {
              handleCommit();
            }
          }}
        />
      </div>
    </div>
  );
};

export default AdjustmentAdjuster;
