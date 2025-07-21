import { BloomAdjustmentLayer } from "@/models/project/Layers/AdjustmentLayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectSeparator } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/hooks/useProject";
import { FilterVintage } from "@mui/icons-material";
interface BloomAdjustmentLayerItemProps {
  layer: BloomAdjustmentLayer;
}

const BloomAdjustmentLayerPopover: React.FC<BloomAdjustmentLayerItemProps> = ({
  layer,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="w-40 h-40 aspect-square relative bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover  border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black">
          <FilterVintage className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div>Damn</div>
      </PopoverContent>
    </Popover>
  );
};

export default BloomAdjustmentLayerPopover;
