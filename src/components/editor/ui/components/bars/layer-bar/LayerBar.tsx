import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/hooks/useProject";
import { moveLayer } from "@/models/project/LayerManager";
import { LayersIcon } from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import React from "react";
import {
  DragDropContext,
  DropResult,
  DroppableProvided,
} from "react-beautiful-dnd";
import ClipLayerButton from "./components/ClipLayerButton";
import DeleteLayerButton from "./components/DeleteLayerButton";
import LayerStackButton from "./components/LayerStackButton";
import NewAdjustmentLayerButton from "./components/NewAdjustmentLayerButton";
import NewLayerButton from "./components/NewLayerButton";
import { StrictModeDroppable as Droppable } from "./components/StrictModeDroppable";
import LayerBarItem from "./components/items/LayerBarItem";

const LayerBar: React.FC = () => {
  const {
    project,
    layerManager,
    setLayerManager,
    landing,
    setProject,
    setTrigger,
    trigger,
  } = useProject();
  const [showLayers, setShowLayers] = React.useState(true);

  const LayerEffectButton = dynamic(
    () => import("./components/LayerEffectButton"),
    {
      ssr: false,
    }
  );

  const handleLayerDropSwap = (result: DropResult) => {
    if (!result.destination) return; // dropped outside the list

    const newIndex = layerManager.layers.length - 1 - result.destination.index;

    setLayerManager((draft) => {
      draft.layers = moveLayer(draft.layers, result.draggableId, newIndex);
    });
  };

  return (
    <div className="flex h-full z-10 select-none">
      {showLayers && landing && (
        <aside
          id="logo-sidebar"
          className="resize-x overflow-hidden  max-w-[30rem] min-w-[25rem] h-full border-l-2 border-[#cdcdcd] dark:border-[#252525]  py-6  bg-navbarBackground dark:bg-navbarBackground "
          aria-label="Sidebar"
        >
          <div className=" flex flex-col max-h-full">
            <div className="h-16 ml-4 flex flex-col dark:text-white mb-4">
              <div className="mb-4 font-semibold ">Layers</div>
              <div className="flex flex-row space-x-2 items-center">
                <NewLayerButton />

                <NewAdjustmentLayerButton />

                <ClipLayerButton />

                {/* <LayerEffectButton /> */}

                <DeleteLayerButton />

                <LayerStackButton />
              </div>
            </div>
            <div className="border-t-2 mt-2 mb-2 border-[#cdcdcd] dark:border-[#252525]"></div>

            {layerManager.layers.length > 0 && (
              <div
                className="flex flex-grow flex-col items-center justify-start overflow-y-auto"
                style={{
                  scrollbarWidth: "thin",
                }}
              >
                <DragDropContext
                  onDragEnd={(result: DropResult) => {
                    handleLayerDropSwap(result);
                  }}
                >
                  <Droppable droppableId="layers">
                    {(provided: DroppableProvided) => (
                      <ul
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="list-none pl-0  space-y-2 font-medium text-black dark:text-white h-full mb-2 w-11/12"
                      >
                        {layerManager.layers
                          .slice()
                          .reverse()
                          .map((layer, key) => (
                            <LayerBarItem layer={layer} daKey={key} key={key} />
                          ))}

                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}
          </div>
        </aside>
      )}

      <aside
        id="logo-sidebar-selected"
        className="flex flex-col justify-start items-center  animate-fade animate-once animate-ease-out w-10 h-full border-l-2 border-[#cdcdcd] dark:border-[#252525] bg-navbarBackground dark:bg-navbarBackground"
        aria-label="SidebarSelector"
      >
        <ul className="pt-4 space-y-3 dark:text-white">
          <li onClick={() => setShowLayers(!showLayers)}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <LayersIcon className="w-6 h-6 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="text-xs" side="bottom">
                  {<p>{showLayers ? "Hide Layers" : "Show Layers"}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </li>
        </ul>
      </aside>
    </div>
  );
};
export default LayerBar;
