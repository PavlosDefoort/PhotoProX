import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BoxIcon,
  CardStackPlusIcon,
  ComponentBooleanIcon,
  ImageIcon,
  TextIcon,
} from "@radix-ui/react-icons";
import { Folder } from "@mui/icons-material";
import { HexagonIcon } from "lucide-react";
import ImageInput from "../../../input/ImageInput";
import { useRef } from "react";

const NewLayerButton: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      {" "}
      <ImageInput inputRef={inputRef} />
      <TooltipProvider>
        <Tooltip>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <CardStackPlusIcon className="w-6 h-6 cursor-pointer" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Create new layer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  inputRef.current?.click();
                }}
              >
                {" "}
                <ImageIcon className="w-5 h-5 mr-2" />
                Image Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => alert("Groups are currently in development!")}
              >
                {" "}
                <Folder className="w-5 h-5 mr-2" />
                Group Layer
              </DropdownMenuItem>
              <DropdownMenuItem>
                {" "}
                <ComponentBooleanIcon
                  className="w-5 h-5 mr-2"
                  onClick={() => {
                    alert(
                      "This button is currently in development! To add a new adjustment layer, you can also go to Layers -> Adjustment Layer -> [Select Adjustment Layer]"
                    );
                  }}
                />
                Adjustment Layer
              </DropdownMenuItem>
              <DropdownMenuItem>
                {" "}
                <BoxIcon className="w-5 h-5 mr-2" />
                Background Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  alert("Text Layers are currently in development!")
                }
              >
                {" "}
                <TextIcon className="w-5 h-5 mr-2" />
                Text Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  alert("Shape Layers are currently in development!")
                }
              >
                {" "}
                <HexagonIcon className="w-5 h-5 mr-2" />
                Shape Layer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipContent className="text-xs" side="bottom">
            <p>Create new layer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default NewLayerButton;
