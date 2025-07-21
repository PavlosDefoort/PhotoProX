import { useProject } from "@/hooks/useProject";
import { AdjustmentLayerInterface } from "@/interfaces/project/LayerInterfaces";

import { Application } from "pixi.js";
import React from "react";
import AdjustmentPopover from "./AdjustmentPopover";
import { ThickArrowDownIcon } from "@radix-ui/react-icons";

interface AdjustmentLayerBarItemProps {
  layer: AdjustmentLayerInterface;
  appRef?: React.MutableRefObject<Application | null>;
}

const AdjustmentLayerBarItem: React.FC<AdjustmentLayerBarItemProps> = ({
  layer,
}) => {
  const { setProject, trigger, setTrigger } = useProject();

  return (
    <div className="flex flex-row space-x-2 items-center">
      <AdjustmentPopover layer={layer} />
    </div>
  );
};
export default AdjustmentLayerBarItem;
