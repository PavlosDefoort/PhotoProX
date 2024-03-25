import {
  AdjustmentLayer,
  AnalysisData,
  HistogramArray,
  ImageLayer,
  defaultHistogram,
} from "@/utils/editorInterfaces";
import {
  analyseAlphaValues,
  analyseEverything,
  analyseImageGreenIntensities,
  analyseImageLuminance,
  analyseImageRedIntensities,
  calculateHueAngle,
  convertFloat32ArrayToNumberArray,
  sortIntensityArray,
  takeMultipleSamples,
  takeSamples,
} from "@/utils/calcUtils";
import React, { useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/pages/editor";
import {
  EyeClosedIcon,
  EyeOpenIcon,
  OpacityIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { clamp } from "@/utils/calcUtils";
import { Slider } from "@/components/ui/slider";
import { ColorLens, FilterVintage, Waves } from "@mui/icons-material";
import { AdjustmentFilter, AdvancedBloomFilter } from "pixi-filters";
import { Application, ColorMatrixFilter } from "pixi.js";
import LuminanceHistogram from "./histogram";
import BezierCurves from "./draggablegraph";
import DynamicPlot from "./dynamicplot";

interface AdjustmentLayerBarItemProps {
  layer: AdjustmentLayer;
  appRef?: React.MutableRefObject<Application | null>;
}

const AdjustmentLayerBarItem: React.FC<AdjustmentLayerBarItemProps> = ({
  layer,
  appRef,
}) => {
  const { project, setProject, trigger, setTrigger } = useProjectContext();
  const [stringOpacity, setStringOpacity] = useState("100%");
  const NUM_SAMPLES = 80;

  const [histogramData, setHistogramData] = useState(defaultHistogram);

  useEffect(() => {
    if (appRef && layer.adjustmentType === "waves" && appRef.current) {
      const imageLayer = project.layerManager.layers[0] as ImageLayer;
      const imageSprite = imageLayer.sprite;
      const pixelArray = appRef.current.renderer.extract.pixels(imageSprite);

      const analysis: AnalysisData = analyseEverything(
        pixelArray as Uint8Array
      );

      const propertiesToSample: (keyof AnalysisData)[] = ["luminance"];

      const samples = takeMultipleSamples(
        analysis,
        NUM_SAMPLES,
        propertiesToSample
      );

      const luminanceSamples = samples["luminance"] ?? [[], []];
      const redSamples = samples["red"] ?? [[], []];
      const greenSamples = samples["green"] ?? [[], []];
      const blueSamples = samples["blue"] ?? [[], []];
      const alphaSamples = samples["alpha"] ?? [[], []];
      const histogramData: HistogramArray = {
        luminance: {
          bins: luminanceSamples[0],
          frequencies: luminanceSamples[1],
        },
        red: {
          bins: redSamples[0],
          frequencies: redSamples[1],
        },
        green: {
          bins: greenSamples[0],
          frequencies: greenSamples[1],
        },
        blue: {
          bins: blueSamples[0],
          frequencies: blueSamples[1],
        },
        alpha: {
          bins: alphaSamples[0],
          frequencies: alphaSamples[1],
        },
      };

      setHistogramData(histogramData);
    }
  }, []);

  return (
    <div className="flex flex-row items-center justify-between space-x-4">
      <div className="flex flex-row justify-center items-center eye-icon">
        {layer.visible ? (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"ghost"}
                    className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
                    onClick={() => {
                      setProject((draft) => {
                        const foundLayer = draft.layerManager.findLayer(
                          layer.id
                        );
                        if (foundLayer) {
                          draft.layerManager.layers =
                            draft.layerManager.layers.map((l) => {
                              if (l.id === foundLayer.id) {
                                // Create a new object with the updated 'visible' property
                                return {
                                  ...l,
                                  visible: false,
                                };
                              }
                              return l;
                            });
                        }
                      });
                      setTrigger(!trigger);
                    }}
                  >
                    <EyeOpenIcon className="cursor-pointer w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="text-xs"
                  side="bottom"
                  sideOffset={10}
                >
                  <p>Hide layer</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"ghost"}
                    className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
                    onClick={() => {
                      setProject((draft) => {
                        const foundLayer = draft.layerManager.findLayer(
                          layer.id
                        );
                        if (foundLayer) {
                          draft.layerManager.layers =
                            draft.layerManager.layers.map((l) => {
                              if (l.id === foundLayer.id) {
                                // Create a new object with the updated 'visible' property
                                return {
                                  ...l,
                                  visible: true,
                                };
                              }
                              return l;
                            });
                        }
                      });
                      setTrigger(!trigger);
                    }}
                  >
                    <EyeClosedIcon className="cursor-pointer z-10 w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="text-xs z-10"
                  side="bottom"
                  sideOffset={10}
                >
                  <p>Show layer</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        <Popover>
          <PopoverTrigger
            asChild
            onClick={() => {
              const adjustmentLayer = layer as AdjustmentLayer;
              setStringOpacity(
                (adjustmentLayer.opacity * 100).toFixed(0) + "%"
              );
            }}
          >
            <Button
              variant="ghost"
              className="hover:bg-[#e6e6e6] dark:hover:bg-gray-700"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <OpacityIcon className="cursor-pointer w-5 h-5" />
                  </TooltipTrigger>
                  <TooltipContent
                    className="text-xs"
                    side="bottom"
                    sideOffset={10}
                  >
                    <p>Change opacity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Opacity</h4>
                <p className="text-sm text-muted-foreground">
                  Set the opacity of the layer
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="width">Opacity</Label>
                  <Input
                    id="opacity"
                    className="col-span-2 h-8"
                    value={stringOpacity}
                    onChange={(e) => {
                      // Check if the value is a number
                      if (
                        isNaN(Number(e.currentTarget.value)) &&
                        e.currentTarget.value !== "-"
                      ) {
                        return;
                      }
                      setStringOpacity(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Remove the '%' sign
                        const opacity = e.currentTarget.value.replace("%", "");
                        const numberOpacity = clamp(
                          Number(opacity) / 100,
                          0,
                          1
                        );
                        setProject((draft) => {
                          const foundLayer = draft.layerManager.findLayer(
                            layer.id
                          );
                          if (foundLayer && foundLayer.type === "image") {
                            const adjustmentLayer =
                              foundLayer as AdjustmentLayer;
                            adjustmentLayer.opacity = numberOpacity;
                          }
                        });
                        setTrigger(!trigger);
                        setStringOpacity(
                          (numberOpacity * 100).toFixed(0) + "%"
                        );
                        // ADD SLIDER TO CHANGE OPACITY
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="w-40 h-40 aspect-square relative bg-navbarBackground dark:bg-navbarBackground hover:bg-buttonHover dark:hover:bg-buttonHover  border border-gray-500 disabled:opacity-20 transition-opacity duration-300 ease-linear transform hover:scale-110 active:scale-95 dark:text-white text-black">
            {layer.adjustmentType === "brightness" && (
              <SunIcon className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            )}
            {layer.adjustmentType === "hue" && (
              <ColorLens className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            )}
            {layer.adjustmentType === "bloom" && (
              <FilterVintage className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            )}
            {layer.adjustmentType === "waves" && (
              <svg
                className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
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
                      <use data-c="3A8" xlinkHref="#MJX-23-TEX-N-3A8"></use>
                    </g>
                  </g>
                </g>
              </svg>
            )}
            {layer.adjustmentType === "levels" && (
              <svg
                className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
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
                      <use data-c="1D706" xlinkHref="#MJX-33-TEX-I-1D706"></use>
                    </g>
                  </g>
                </g>
              </svg>
            )}
            {layer.adjustmentType === "functions" && (
              <svg
                className="w-16 h-16 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
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
                      <use data-c="1D453" xlinkHref="#MJX-13-TEX-I-1D453"></use>
                    </g>
                    <g data-mml-node="mo" transform="translate(550,0)">
                      <use data-c="28" xlinkHref="#MJX-13-TEX-N-28"></use>
                    </g>
                    <g data-mml-node="mi" transform="translate(939,0)">
                      <use data-c="1D465" xlinkHref="#MJX-13-TEX-I-1D465"></use>
                    </g>
                    <g data-mml-node="mo" transform="translate(1511,0)">
                      <use data-c="29" xlinkHref="#MJX-13-TEX-N-29"></use>
                    </g>
                  </g>
                </g>
              </svg>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-96"
          side="left"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          {layer.adjustmentType == "brightness" && (
            <div className="grid gap-4 ">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">
                  Brightness/Contrast
                </h4>
                <p className="text-sm text-muted-foreground">
                  Set the brightness and contrast of the layer
                </p>
              </div>
              <div>
                <Label>Brightness</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={3}
                    min={0}
                    step={0.01}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdjustmentFilter)
                          ?.brightness) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdjustmentFilter;
                        theFilter.brightness = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    ((layer.container.filters &&
                      (layer.container.filters[0] as AdjustmentFilter)
                        ?.brightness) ||
                      0) * 100
                  ).toFixed(0)}
                  %
                </div>
              </div>
              <div>
                <Label>Contrast</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={5}
                    min={-5}
                    step={0.01}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdjustmentFilter)
                          ?.contrast) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdjustmentFilter;
                        theFilter.contrast = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    ((layer.container.filters &&
                      (layer.container.filters[0] as AdjustmentFilter)
                        ?.contrast) ||
                      0) * 100
                  ).toFixed(0)}
                  %
                </div>
              </div>
            </div>
          )}
          {layer.adjustmentType == "hue" && (
            <div className="grid gap-4 ">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Hue/Saturation</h4>
                <p className="text-sm text-muted-foreground">
                  Set the hue and saturation of the layer
                </p>
              </div>
              <div>
                <Label>Saturation</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={2}
                    min={0}
                    step={0.05}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdjustmentFilter)
                          ?.saturation) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdjustmentFilter;
                        theFilter.saturation = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    ((layer.container.filters &&
                      (layer.container.filters[0] as AdjustmentFilter)
                        ?.saturation) ||
                      0) * 100
                  ).toFixed(0)}
                  %
                </div>
              </div>
              <div>
                <Label>Hue</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={180}
                    min={-180}
                    step={1}
                    value={
                      layer.container.filters
                        ? [
                            calculateHueAngle(
                              (layer.container.filters[1] as ColorMatrixFilter)
                                .matrix[0],
                              (layer.container.filters[1] as ColorMatrixFilter)
                                .matrix[1],
                              (layer.container.filters[1] as ColorMatrixFilter)
                                .matrix[2]
                            ) || 0,
                          ]
                        : [0]
                    }
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[1] as ColorMatrixFilter;
                        theFilter.hue(value[0], false);

                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {layer.container.filters
                    ? [
                        calculateHueAngle(
                          (layer.container.filters[1] as ColorMatrixFilter)
                            .matrix[0],
                          (layer.container.filters[1] as ColorMatrixFilter)
                            .matrix[1],
                          (layer.container.filters[1] as ColorMatrixFilter)
                            .matrix[2]
                        ) || 0,
                      ]
                    : [0]}
                  {"\u00B0"}
                </div>
              </div>
            </div>
          )}
          {layer.adjustmentType == "bloom" && (
            <div className="grid gap-4 ">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Bloom</h4>
                <p className="text-sm text-muted-foreground">
                  Set the bloom of the layer
                </p>
              </div>
              <div>
                <Label>Blur</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={20}
                    min={0}
                    step={1}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdvancedBloomFilter)
                          ?.blur) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdvancedBloomFilter;
                        theFilter.blur = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    (layer.container.filters &&
                      (layer.container.filters[0] as AdvancedBloomFilter)
                        ?.blur) ||
                    0
                  ).toFixed(0)}
                </div>
              </div>
              <div>
                <Label>Threshold</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={1}
                    min={0}
                    step={0.01}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdvancedBloomFilter)
                          ?.threshold) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdvancedBloomFilter;
                        theFilter.threshold = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    ((layer.container.filters &&
                      (layer.container.filters[0] as AdvancedBloomFilter)
                        ?.threshold) ||
                      0) * 100
                  ).toFixed(0)}
                  %
                </div>
              </div>
              <div>
                <Label>Brightness</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={1}
                    min={0}
                    step={0.01}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdvancedBloomFilter)
                          ?.brightness) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdvancedBloomFilter;
                        theFilter.brightness = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    ((layer.container.filters &&
                      (layer.container.filters[0] as AdvancedBloomFilter)
                        ?.brightness) ||
                      0) * 100
                  ).toFixed(0)}
                  %
                </div>
              </div>
              <div>
                <Label>Scale</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={10}
                    min={-10}
                    step={0.1}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdvancedBloomFilter)
                          ?.bloomScale) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdvancedBloomFilter;
                        theFilter.bloomScale = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    (layer.container.filters &&
                      (layer.container.filters[0] as AdvancedBloomFilter)
                        ?.bloomScale) ||
                    0
                  ).toFixed(1)}
                </div>
              </div>
              <div>
                <Label>Quality</Label>
                <div className="flex flex-row space-x-2">
                  <Slider
                    className="w-8/12"
                    max={100}
                    min={1}
                    step={1}
                    value={[
                      (layer.container.filters &&
                        (layer.container.filters[0] as AdvancedBloomFilter)
                          ?.quality) ||
                        0,
                    ]}
                    onValueChange={(value) => {
                      if (layer.container.filters) {
                        const theFilter = layer.container
                          .filters[0] as AdvancedBloomFilter;
                        theFilter.quality = value[0];
                        setTrigger(!trigger);
                      }
                    }}
                  />
                  {(
                    (layer.container.filters &&
                      (layer.container.filters[0] as AdvancedBloomFilter)
                        ?.quality) ||
                    0
                  ).toFixed(0)}
                </div>
              </div>
            </div>
          )}
          {layer.adjustmentType == "waves" && (
            <div className="">
              <div className="space-y-2 pb-2">
                <h4 className="font-medium leading-none">Waves</h4>
                <p className="text-sm text-muted-foreground">
                  Manipulate the luminance of the layer
                </p>
              </div>

              <div className="flex flex-row  h-full">
                <div className="h-full w-full">
                  {/* <LuminanceHistogram
                      binEdges={bins}
                      frequencies={frequencies}
                    />  */}
                  <BezierCurves histogramData={histogramData} />
                </div>
              </div>
            </div>
          )}
          {layer.adjustmentType == "functions" && (
            <div className="">
              <div className="space-y-2 pb-2">
                <h4 className="font-medium leading-none">Functions</h4>
                <p className="text-sm text-muted-foreground">
                  Express your creativity with functions
                </p>
                <Label>Note: Only univariate functions will be graphed</Label>
              </div>

              <div className="flex flex-row  h-full">
                <div className="h-full w-full">
                  {/* <LuminanceHistogram
                      binEdges={bins}
                      frequencies={frequencies}
                    /> */}
                  <DynamicPlot layer={layer} />
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <span className="text-xs">Layer {layer.zIndex}</span>
    </div>
  );
};
export default AdjustmentLayerBarItem;
