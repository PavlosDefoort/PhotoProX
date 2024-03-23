import Image from "next/image";
import Link from "next/link";
import React, { use, useEffect } from "react";
import {
  DragDropContext,
  Draggable,
  DraggableStateSnapshot,
  DropResult,
} from "react-beautiful-dnd";
import { StrictModeDroppable as Droppable } from "./strictmodedroppable";

import {
  CropIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  LayersIcon,
  CardStackPlusIcon,
  TrashIcon,
  OpacityIcon,
  StackIcon,
  DividerHorizontalIcon,
  ComponentBooleanIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoveIcon } from "@radix-ui/react-icons";
import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu";
import * as Tooltipper from "@radix-ui/react-tooltip";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DownloadIcon from "@mui/icons-material/Download";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { TransformIcon } from "@radix-ui/react-icons";
import SettingsIcon from "@mui/icons-material/Settings";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useProjectContext } from "@/pages/editor";
import {
  AdjustmentLayer,
  EditorProject,
  ImageLayer,
  LayerX,
  Project,
  removeAdjustmentLayerKeepChildren,
  removeSpriteFromContainer,
} from "@/utils/editorInterfaces";
import { db } from "../../../../../app/firebase";
import { Application, Container } from "pixi.js";
import { set } from "lodash";
import { Draft } from "immer";
import { clamp } from "@/utils/calcUtils";
import ImageLayerBarItem from "./imageLayerBarItem";
import AdjustmentLayerBarItem from "./adjustmentLayerBarItem";
import { ColorLens, FilterVintage, Waves } from "@mui/icons-material";
import LuminanceHistogram from "./histogram";

interface LayerBarProps {
  imgSrc: string;
  downloadImage: () => void;
  toggleThirds: () => void;
  containerRef: React.MutableRefObject<Container | null>;
  trigger: boolean;
  setTrigger: (value: boolean) => void;
  appRef: React.MutableRefObject<Application | null>;
}

const LayerBar: React.FC<LayerBarProps> = ({
  imgSrc,
  downloadImage,
  toggleThirds,
  containerRef,
  trigger,
  setTrigger,
  appRef,
}) => {
  const [open, setOpen] = React.useState(false);
  const { project, setProject } = useProjectContext();
  const [showLayers, setShowLayers] = React.useState(true);
  const [draggingLayers, setDraggingLayers] = React.useState<ImageLayer[]>([]);

  const toggleLayerVisibility = (layerId: string) => {};

  // useEffect(() => {
  //   // Output all layer.visible values
  //   if (project.layers.length > 0) {
  //     setDraggingLayers(project.layers);
  //   }
  // }, [project.layers.length]);

  useEffect(() => {}, [project.layerManager.layers]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return; // dropped outside the list
    // The destination is reversed because the layers are displayed in reverse order
    const newIndex =
      project.layerManager.layers.length - 1 - result.destination.index;
    setProject((draft) => {
      draft.layerManager.moveLayer(result.draggableId, newIndex);
      draft.layerManager.checkZIndex();
      if (draft.target) {
        draft.target = draft.layerManager.findLayer(
          draft.target.id
        ) as Draft<ImageLayer>;
      }
    });
    setTrigger(!trigger);
  };

  const initialItems = ["Item 1", "Item 2", "Item 3", "Item 4"];
  const [items, setItems] = React.useState(initialItems);
  const handleDragEndTwo = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  return (
    <div className="flex h-full z-10 select-none">
      {showLayers && (
        <aside
          id="logo-sidebar"
          className="resize-x overflow-auto animate-fade animate-once animate-ease-out max-w-[30rem] min-w-[25rem] h-full border-l-2 border-[#cdcdcd] dark:border-[#252525]  py-6  bg-navbarBackground dark:bg-navbarBackground "
          aria-label="Sidebar"
        >
          {imgSrc && (
            <div className="animate-fade animate-once animate-ease-linear flex flex-col max-h-full">
              <div className="h-16 ml-4 flex flex-col dark:text-white mb-4">
                <div className="mb-4 ">Layers</div>
                <div className="flex flex-row space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CardStackPlusIcon className="w-6 h-6 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs" side="bottom">
                        <p>Create new layer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <TooltipTrigger asChild>
                            <ComponentBooleanIcon className="w-6 h-6 cursor-pointer" />
                          </TooltipTrigger>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>
                            Adjustment layer
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setProject((draft) => {
                                const newLayer =
                                  draft.layerManager.createAdjustmentLayer(
                                    "brightness",
                                    false
                                  );
                                draft.layerManager.addLayer(newLayer);
                                // Set the target to the new layer
                                draft.target = newLayer as Draft<LayerX>;
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            <SunIcon className="w-5 h-5 mr-2" />
                            Brightness/Contrast
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              setProject((draft) => {
                                const newLayer =
                                  draft.layerManager.createAdjustmentLayer(
                                    "hue",
                                    false
                                  );
                                draft.layerManager.addLayer(newLayer);
                                // Set the target to the new layer
                                draft.target = newLayer as Draft<LayerX>;
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            <ColorLens className="w-5 h-5 mr-2" />
                            Hue/Saturation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProject((draft) => {
                                const newLayer =
                                  draft.layerManager.createAdjustmentLayer(
                                    "bloom",
                                    false
                                  );
                                draft.layerManager.addLayer(newLayer);
                                // Set the target to the new layer
                                draft.target = newLayer as Draft<LayerX>;
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            <FilterVintage className="w-5 h-5 mr-2" />
                            Bloom
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProject((draft) => {
                                const newLayer =
                                  draft.layerManager.createAdjustmentLayer(
                                    "waves",
                                    false
                                  );
                                draft.layerManager.addLayer(newLayer);
                                // Set the target to the new layer
                                draft.target = newLayer as Draft<LayerX>;
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              xmlns="http://www.w3.org/2000/svg"
                              width="14.080px"
                              height="12.360px"
                              viewBox="0 -683 778 683"
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                              aria-hidden="true"
                            >
                              <defs>
                                <path
                                  id="MJX-23-TEX-N-3A8"
                                  d="M340 622Q338 623 335 625T331 629T325 631T314 634T298 635T274 636T239 637H212V683H224Q248 680 389 680T554 683H566V637H539Q479 637 464 635T439 622L438 407Q438 192 439 192Q443 193 449 195T474 207T507 232T536 276T557 344Q560 365 562 417T573 493Q587 536 620 544Q627 546 671 546H715L722 540V515Q714 509 708 509Q680 505 671 476T658 392T644 307Q599 177 451 153L438 151V106L439 61Q446 54 451 52T476 48T539 46H566V0H554Q530 3 389 3T224 0H212V46H239Q259 46 273 46T298 47T314 48T325 51T331 54T335 57T340 61V151Q126 178 117 406Q115 503 69 509Q55 509 55 526Q55 541 59 543T86 546H107H120Q150 546 161 543T184 528Q198 514 204 493Q212 472 213 420T226 316T272 230Q287 216 303 207T330 194L339 192Q340 192 340 407V622Z"
                                ></path>
                              </defs>
                              <g
                                stroke="currentColor"
                                fill="currentColor"
                                strokeWidth="0"
                                transform="scale(1,-1)"
                              >
                                <g data-mml-node="math">
                                  <g data-mml-node="mi">
                                    <use
                                      data-c="3A8"
                                      xlinkHref="#MJX-23-TEX-N-3A8"
                                    ></use>
                                  </g>
                                </g>
                              </g>
                            </svg>
                            Waves
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProject((draft) => {
                                const newLayer =
                                  draft.layerManager.createAdjustmentLayer(
                                    "levels",
                                    false
                                  );
                                draft.layerManager.addLayer(newLayer);
                                // Set the target to the new layer
                                draft.target = newLayer as Draft<LayerX>;
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            <svg
                              className="w-5 h-5 mr-2"
                              xmlns="http://www.w3.org/2000/svg"
                              width="10.552px"
                              height="12.776px"
                              viewBox="0 -694 583 706"
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                              aria-hidden="true"
                            >
                              <defs>
                                <path
                                  id="MJX-33-TEX-I-1D706"
                                  d="M166 673Q166 685 183 694H202Q292 691 316 644Q322 629 373 486T474 207T524 67Q531 47 537 34T546 15T551 6T555 2T556 -2T550 -11H482Q457 3 450 18T399 152L354 277L340 262Q327 246 293 207T236 141Q211 112 174 69Q123 9 111 -1T83 -12Q47 -12 47 20Q47 37 61 52T199 187Q229 216 266 252T321 306L338 322Q338 323 288 462T234 612Q214 657 183 657Q166 657 166 673Z"
                                ></path>
                              </defs>
                              <g
                                stroke="currentColor"
                                fill="currentColor"
                                strokeWidth="0"
                                transform="scale(1,-1)"
                              >
                                <g data-mml-node="math">
                                  <g data-mml-node="mi">
                                    <use
                                      data-c="1D706"
                                      xlinkHref="#MJX-33-TEX-I-1D706"
                                    ></use>
                                  </g>
                                </g>
                              </g>
                            </svg>
                            Levels
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProject((draft) => {
                                const newLayer =
                                  draft.layerManager.createAdjustmentLayer(
                                    "functions",
                                    false
                                  );
                                draft.layerManager.addLayer(newLayer);
                                // Set the target to the new layer
                                draft.target = newLayer as Draft<LayerX>;
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            <svg
                              className="w-10 h-10 mr-2"
                              xmlns="http://www.w3.org/2000/svg"
                              width="34.392px"
                              height="18.096px"
                              viewBox="0 -750 1900 1000"
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                              aria-hidden="true"
                            >
                              <defs>
                                <path
                                  id="MJX-13-TEX-I-1D453"
                                  d="M118 -162Q120 -162 124 -164T135 -167T147 -168Q160 -168 171 -155T187 -126Q197 -99 221 27T267 267T289 382V385H242Q195 385 192 387Q188 390 188 397L195 425Q197 430 203 430T250 431Q298 431 298 432Q298 434 307 482T319 540Q356 705 465 705Q502 703 526 683T550 630Q550 594 529 578T487 561Q443 561 443 603Q443 622 454 636T478 657L487 662Q471 668 457 668Q445 668 434 658T419 630Q412 601 403 552T387 469T380 433Q380 431 435 431Q480 431 487 430T498 424Q499 420 496 407T491 391Q489 386 482 386T428 385H372L349 263Q301 15 282 -47Q255 -132 212 -173Q175 -205 139 -205Q107 -205 81 -186T55 -132Q55 -95 76 -78T118 -61Q162 -61 162 -103Q162 -122 151 -136T127 -157L118 -162Z"
                                ></path>
                                <path
                                  id="MJX-13-TEX-N-28"
                                  d="M94 250Q94 319 104 381T127 488T164 576T202 643T244 695T277 729T302 750H315H319Q333 750 333 741Q333 738 316 720T275 667T226 581T184 443T167 250T184 58T225 -81T274 -167T316 -220T333 -241Q333 -250 318 -250H315H302L274 -226Q180 -141 137 -14T94 250Z"
                                ></path>
                                <path
                                  id="MJX-13-TEX-I-1D465"
                                  d="M52 289Q59 331 106 386T222 442Q257 442 286 424T329 379Q371 442 430 442Q467 442 494 420T522 361Q522 332 508 314T481 292T458 288Q439 288 427 299T415 328Q415 374 465 391Q454 404 425 404Q412 404 406 402Q368 386 350 336Q290 115 290 78Q290 50 306 38T341 26Q378 26 414 59T463 140Q466 150 469 151T485 153H489Q504 153 504 145Q504 144 502 134Q486 77 440 33T333 -11Q263 -11 227 52Q186 -10 133 -10H127Q78 -10 57 16T35 71Q35 103 54 123T99 143Q142 143 142 101Q142 81 130 66T107 46T94 41L91 40Q91 39 97 36T113 29T132 26Q168 26 194 71Q203 87 217 139T245 247T261 313Q266 340 266 352Q266 380 251 392T217 404Q177 404 142 372T93 290Q91 281 88 280T72 278H58Q52 284 52 289Z"
                                ></path>
                                <path
                                  id="MJX-13-TEX-N-29"
                                  d="M60 749L64 750Q69 750 74 750H86L114 726Q208 641 251 514T294 250Q294 182 284 119T261 12T224 -76T186 -143T145 -194T113 -227T90 -246Q87 -249 86 -250H74Q66 -250 63 -250T58 -247T55 -238Q56 -237 66 -225Q221 -64 221 250T66 725Q56 737 55 738Q55 746 60 749Z"
                                ></path>
                              </defs>
                              <g
                                stroke="currentColor"
                                fill="currentColor"
                                strokeWidth="0"
                                transform="scale(1,-1)"
                              >
                                <g data-mml-node="math">
                                  <g data-mml-node="mi">
                                    <use
                                      data-c="1D453"
                                      xlinkHref="#MJX-13-TEX-I-1D453"
                                    ></use>
                                  </g>
                                  <g
                                    data-mml-node="mo"
                                    transform="translate(550,0)"
                                  >
                                    <use
                                      data-c="28"
                                      xlinkHref="#MJX-13-TEX-N-28"
                                    ></use>
                                  </g>
                                  <g
                                    data-mml-node="mi"
                                    transform="translate(939,0)"
                                  >
                                    <use
                                      data-c="1D465"
                                      xlinkHref="#MJX-13-TEX-I-1D465"
                                    ></use>
                                  </g>
                                  <g
                                    data-mml-node="mo"
                                    transform="translate(1511,0)"
                                  >
                                    <use
                                      data-c="29"
                                      xlinkHref="#MJX-13-TEX-N-29"
                                    ></use>
                                  </g>
                                </g>
                              </g>
                            </svg>
                            Functions
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <TooltipContent className="text-xs" side="bottom">
                        <p>Adjustment Layer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TrashIcon
                          className="w-6 h-6 cursor-pointer"
                          onClick={() => {
                            if (
                              project.layerManager.layers.length - 1 > 0 &&
                              project.target?.type !== "adjustment" &&
                              containerRef.current
                            ) {
                              setProject((draft) => {
                                if (draft.target) {
                                  draft.layerManager.removeLayer(
                                    draft.target.id
                                  );
                                  // Set the target to the first layer
                                  draft.target = draft.layerManager.findLayer(
                                    draft.layerManager.layers[0].id
                                  ) as Draft<ImageLayer>;
                                  draft.layerManager.checkZIndex();
                                }
                              });
                              const removeLayer = project.target as ImageLayer;
                              removeSpriteFromContainer(
                                containerRef.current,
                                removeLayer.sprite
                              );
                              setTrigger(!trigger);
                            } else if (
                              project.layerManager.layers.length - 1 > 0 &&
                              project.target?.type === "adjustment" &&
                              containerRef.current
                            ) {
                              setProject((draft) => {
                                if (draft.target) {
                                  draft.layerManager.removeLayer(
                                    draft.target.id
                                  );
                                  draft.target = draft.layerManager.findLayer(
                                    draft.layerManager.layers[0].id
                                  ) as Draft<ImageLayer>;
                                  draft.layerManager.checkZIndex();
                                }
                              });

                              const removeLayer =
                                project.target as AdjustmentLayer;
                              if (removeLayer.container)
                                removeAdjustmentLayerKeepChildren(
                                  containerRef.current,
                                  removeLayer.container
                                );
                              setTrigger(!trigger);
                            }
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs" side="bottom">
                        <p>Delete selected layer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <TooltipTrigger asChild>
                            <StackIcon className="w-6 h-6 cursor-pointer" />
                          </TooltipTrigger>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>
                            Modify layer stack
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={
                              project.target?.zIndex ===
                              project.layerManager.layers.length - 1
                            }
                            onClick={() => {
                              setProject((draft) => {
                                // Move the target layer to the front
                                if (draft.target) {
                                  draft.layerManager.moveLayerFront(
                                    draft.target.id
                                  );
                                  draft.layerManager.checkZIndex();
                                  draft.target = draft.layerManager.findLayer(
                                    draft.target.id
                                  ) as Draft<ImageLayer>;
                                }
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            Move layer to front
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              project.target?.zIndex ===
                              project.layerManager.layers.length - 1
                            }
                            onClick={() => {
                              setProject((draft) => {
                                // Move the target layer to the front
                                if (draft.target) {
                                  draft.layerManager.moveLayerUp(
                                    draft.target.id
                                  );
                                  draft.layerManager.checkZIndex();
                                  draft.target = draft.layerManager.findLayer(
                                    draft.target.id
                                  ) as Draft<ImageLayer>;
                                }
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            Move layer foward
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={project.target?.zIndex === 0}
                            onClick={() => {
                              setProject((draft) => {
                                // Move the target layer to the front
                                if (draft.target) {
                                  draft.layerManager.moveLayerDown(
                                    draft.target.id
                                  );
                                  draft.layerManager.checkZIndex();
                                  draft.target = draft.layerManager.findLayer(
                                    draft.target.id
                                  ) as Draft<ImageLayer>;
                                }
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            Move layer backwards
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={project.target?.zIndex === 0}
                            onClick={() => {
                              setProject((draft) => {
                                // Move the target layer to the front
                                if (draft.target) {
                                  draft.layerManager.moveLayerBack(
                                    draft.target.id
                                  );
                                  draft.layerManager.checkZIndex();
                                  draft.target = draft.layerManager.findLayer(
                                    draft.target.id
                                  ) as Draft<ImageLayer>;
                                }
                              });
                              setTrigger(!trigger);
                            }}
                          >
                            Move layer to back
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <TooltipContent className="text-xs" side="bottom">
                        <p>Modify layer stack</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="border-t-2 mt-2 mb-2 border-[#cdcdcd] dark:border-[#252525]"></div>
              {project.layerManager.layers.length > 0 && (
                <div
                  className="flex-grow overflow-y-auto max-h-[calc(100vh-14rem)]"
                  style={{
                    scrollbarWidth: "thin",
                  }}
                >
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="layers">
                      {(provided) => (
                        <ul
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-4 font-medium text-black dark:text-white h-full mb-2"
                        >
                          {project.layerManager.layers
                            .slice()
                            .reverse()
                            .map((layer, index) => (
                              <Draggable
                                key={layer.id}
                                draggableId={layer.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <li
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={(event) => {
                                      if (
                                        event &&
                                        event.target &&
                                        !(event.target as HTMLElement).closest(
                                          ".eye-icon"
                                        )
                                      ) {
                                        setProject((draft) => {
                                          const target =
                                            draft.layerManager.findLayer(
                                              layer.id
                                            );
                                          if (target) {
                                            draft.target =
                                              target as Draft<ImageLayer>;
                                          }
                                          setTrigger(!trigger);
                                        });
                                      }
                                    }}
                                    className={`flex flex-row items-center justify-between w-full h-44 rounded-lg shadow-md dark:shadow-lg p-2 space-x-2 transition duration-300 ease-in-out hover:shadow-xl dark:hover:shadow-xl  ${
                                      layer.visible
                                        ? "opacity-100"
                                        : "opacity-50"
                                    } ${
                                      project.target?.id === layer.id
                                        ? "dark:bg-gray-800 bg-[#e4e9f5]"
                                        : "bg-white dark:bg-navbarBackground hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                  >
                                    {layer.type === "adjustment" && (
                                      <AdjustmentLayerBarItem
                                        layer={layer as AdjustmentLayer}
                                        appRef={appRef}
                                      />
                                    )}
                                    {layer.type === "image" && (
                                      <ImageLayerBarItem
                                        layer={layer as ImageLayer}
                                      />
                                    )}
                                  </li>
                                )}
                              </Draggable>
                            ))}

                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              )}
            </div>
          )}
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
          <li></li>
        </ul>
      </aside>
    </div>
  );
};
export default LayerBar;
