import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { crossProjectDragSession } from "@/models/editor/CrossProjectDragSession";
import { WorkspaceDocumentState } from "@/interfaces/editor/EditorWorkspace";
import { getWorkspaceDocumentTitle } from "@/models/editor/EditorWorkspace";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  DragDropContext,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import { StrictModeDroppable as Droppable } from "../bars/layer-bar/components/StrictModeDroppable";

interface DocumentTabsProps {
  documents: WorkspaceDocumentState[];
  activeDocumentId: string | null;
  onActivate: (documentId: string) => void;
  onRequestClose: (documentId: string) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
}

const DocumentTabs: React.FC<DocumentTabsProps> = ({
  documents,
  activeDocumentId,
  onActivate,
  onRequestClose,
  onReorder,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="min-w-0 border-b-2 border-[#cdcdcd] bg-navbarBackground dark:border-[#252525] dark:bg-navbarBackground">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="document-tabs" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex min-h-10 min-w-0 items-stretch overflow-x-auto px-2"
            >
              {documents.map((document, index) => {
                const active = document.id === activeDocumentId;
                const title = getWorkspaceDocumentTitle(document);
                return (
                  <Draggable
                    draggableId={document.id}
                    index={index}
                    key={document.id}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        onPointerEnter={() => crossProjectDragSession.hoverTab(document.id, () => onActivate(document.id))}
                        onPointerLeave={() => crossProjectDragSession.leaveTab(document.id)}
                        className={`mr-1 flex min-w-[10rem] max-w-[16rem] shrink-0 items-center border-x border-t px-3 text-sm ${
                          active
                            ? "border-[#cdcdcd] bg-[#f4f4f4] text-black dark:border-[#252525] dark:bg-[#2f2f2f] dark:text-white"
                            : "border-transparent bg-transparent text-muted-foreground hover:bg-[#efefef] dark:hover:bg-[#2a2a2a]"
                        }`}
                      >
                        <button
                          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
                          onClick={() => onActivate(document.id)}
                          type="button"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              document.isDirty
                                ? "bg-blue-500"
                                : "bg-transparent"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{title}</span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 p-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRequestClose(document.id);
                          }}
                          aria-label={`Close ${title}`}
                          title={`Close ${title}`}
                        >
                          <Cross2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default DocumentTabs;
