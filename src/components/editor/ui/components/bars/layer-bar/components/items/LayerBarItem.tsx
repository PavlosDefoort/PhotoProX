import { useProject } from "@/hooks/useProject";
import { LayerXInterface } from "@/interfaces/project/LayerInterfaces";
import { Draggable } from "react-beautiful-dnd";
import VisibilityButton from "./VisibilityButton";
import OpacityPopover from "./OpacityPopover";
import {
  AdjustmentLayer,
  BackgroundLayer,
  ImageLayer,
} from "@/models/project/Layers/Layers";
import ImageLayerBarItem from "./ImageItem";
import AdjustmentLayerBarItem from "./adjustment-item/AdjustmentItem";
import BackgroundLayerBarItem from "./BackgroundItem";
import NameInput from "./NameInput";
import {
  addLayer,
  findLayer,
  removeLayer,
} from "@/models/project/LayerManager";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash } from "lucide-react";
import { CopyIcon, TrashIcon } from "@radix-ui/react-icons";
import { set } from "lodash";
import { ContentPaste } from "@mui/icons-material";
import { useEffect } from "react";
import { handleDeleteLayer, handleDuplication } from "@/utils/LayerUtils";

interface LayerBarItemProps {
  layer: LayerXInterface;
  daKey: number;
}

const LayerBarItem: React.FC<LayerBarItemProps> = ({ layer, daKey }) => {
  const {
    project,
    layerManager,
    setProject,
    setLayerManager,
    trigger,
    setTrigger,
    setUndoRedoManager,
  } = useProject();
  const target = findLayer(layerManager.layers, layerManager.target);

  // Listen for various inputs
  // Listen for duplication: CTRL + J
  // Listen for deletion: DEL

  useEffect(() => {
    // Put these in a seperate file since they are referenced in multiple places

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "j") {
        e.preventDefault();
        handleDuplication(layer, layerManager, setLayerManager);
      }
      if (e.key === "Delete" && target) {
        handleDeleteLayer(
          target,
          project.settings.canvasSettings.width,
          project.settings.canvasSettings.height,
          setLayerManager,
          setUndoRedoManager
        );
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [layer, layerManager, setLayerManager]);

  return (
    <Draggable key={layer.id} draggableId={layer.id} index={daKey}>
      {(provided) => (
        <ContextMenu
          onOpenChange={(e) => {
            if (e.valueOf()) {
              setLayerManager((draft) => {
                draft.target = layer.id;
              });
            }
          }}
        >
          <ContextMenuTrigger>
            <li
              onClick={() => {
                // Set the target layer
                setLayerManager((draft) => {
                  draft.target = layer.id;
                });
              }}
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={`flex flex-row items-center  w-full h-44 rounded-lg shadow-md dark:shadow-lg p-2 space-x-2 transition duration-300 ease-in-out hover:shadow-xl dark:hover:shadow-xl  ${
                layer.visible ? "opacity-100" : "opacity-50"
              } ${
                target?.id === layer.id
                  ? "dark:bg-gray-800 bg-[#e4e9f5]"
                  : "bg-[#fafafa] dark:bg-[#141414] hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex flex-row">
                <VisibilityButton layer={layer} />
                <OpacityPopover layer={layer} />
              </div>

              {layer instanceof ImageLayer && (
                <ImageLayerBarItem layer={layer} />
              )}

              {layer instanceof AdjustmentLayer && (
                <AdjustmentLayerBarItem layer={layer} />
              )}

              {layer instanceof BackgroundLayer && (
                <BackgroundLayerBarItem layer={layer} />
              )}

              <NameInput layer={layer} />

              {/* <span className="text-xs">{layer.name}</span> */}
            </li>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuLabel>Layer Options</ContextMenuLabel>
            <ContextMenuItem inset>
              <div className="flex flex-row space-x-2">
                <TrashIcon className="w-5 h-5" />
                <p>Delete Layer</p>
              </div>
              <ContextMenuShortcut>DEL</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              inset
              onClick={() => {
                handleDuplication(layer, layerManager, setLayerManager);
              }}
            >
              <div className="flex flex-row space-x-2">
                <svg
                  className="w-5 h-5 text-black dark:text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 3H4C3.44772 3 3 3.44772 3 4V18C3 18.5523 2.55228 19 2 19C1.44772 19 1 18.5523 1 18V4C1 2.34315 2.34315 1 4 1H18C18.5523 1 19 1.44772 19 2C19 2.55228 18.5523 3 18 3Z"
                    fill="currentColor"
                  />
                  <path
                    d="M13 11C13 10.4477 13.4477 10 14 10C14.5523 10 15 10.4477 15 11V13H17C17.5523 13 18 13.4477 18 14C18 14.5523 17.5523 15 17 15H15V17C15 17.5523 14.5523 18 14 18C13.4477 18 13 17.5523 13 17V15H11C10.4477 15 10 14.5523 10 14C10 13.4477 10.4477 13 11 13H13V11Z"
                    fill="currentColor"
                  />
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M20 5C21.6569 5 23 6.34315 23 8V20C23 21.6569 21.6569 23 20 23H8C6.34315 23 5 21.6569 5 20V8C5 6.34315 6.34315 5 8 5H20ZM20 7C20.5523 7 21 7.44772 21 8V20C21 20.5523 20.5523 21 20 21H8C7.44772 21 7 20.5523 7 20V8C7 7.44772 7.44772 7 8 7H20Z"
                    fill="currentColor"
                  />
                </svg>
                <p>Duplicate Layer</p>
              </div>
              <ContextMenuShortcut>CTRL + J</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem inset>
              <div className="flex flex-row space-x-2">
                <CopyIcon className="w-5 h-5" />
                <p>Copy Layer</p>
              </div>
              <ContextMenuShortcut>CTRL + C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem inset>
              <div className="flex flex-row space-x-2">
                <ContentPaste className="w-5 h-5" />
                <p>Paste Layer</p>
              </div>
              <ContextMenuShortcut>CTRL + V</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
    </Draggable>
  );
};

export default LayerBarItem;
