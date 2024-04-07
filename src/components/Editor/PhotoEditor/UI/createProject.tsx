import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useContext, useEffect } from "react";
import Draggable from "react-draggable";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileIcon } from "@radix-ui/react-icons";
import Image from "next/image";

import { ThemeContext } from "@/components/ThemeProvider/themeprovider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useProjectContext } from "@/pages/editor";
import { convertFromTo } from "@/utils/calcUtils";
import { BackgroundLayer, Color, rgb } from "@/utils/editorInterfaces";
import { DialogClose } from "@radix-ui/react-dialog";
import { SketchPicker } from "react-color";
import { PhotoshopPickerStylesProps } from "react-color/lib/components/photoshop/Photoshop";

type TemplateType = "social" | "print" | "screen" | "mobile" | "photo";

export interface Template {
  name: string;
  art: string;
  width: number;
  height: number;
  aspectRatio: string;
  type: TemplateType;
}

export const works: Template[] = [
  {
    name: "A3",
    art: "/A3.png",
    width: 297,
    height: 420,
    aspectRatio: "1/1.41",
    type: "print",
  },
  {
    name: "A4",
    art: "/A4.png",
    width: 210,
    height: 297,
    aspectRatio: "1/1.41",
    type: "print",
  },
  {
    name: "A5",
    art: "/A5.png",
    width: 148,
    height: 210,
    aspectRatio: "1/1.41",
    type: "print",
  },
  {
    name: "Youtube Thumbnail",
    art: "/editor/create_project/social/youtube_thumbnail.jpeg",
    width: 1280,
    height: 720,
    aspectRatio: "16/9",
    type: "social",
  },
  {
    name: "Youtube Profile Picture",
    art: "/editor/create_project/social/youtube_pfp.png",
    width: 800,
    height: 800,
    aspectRatio: "1/1",
    type: "social",
  },
  {
    name: "Youtube Banner",
    art: "/editor/create_project/social/youtube_banner.jpg",
    width: 2560,
    height: 1440,
    aspectRatio: "16/9",
    type: "social",
  },
  {
    name: "Instagram Square Post",
    art: "/editor/create_project/social/insta_square.webp",
    width: 1080,
    height: 1080,
    aspectRatio: "1/1",
    type: "social",
  },
  {
    name: "Instagram Landscape Post",
    art: "/editor/create_project/social/insta_horizontal.jpg",
    width: 1080,
    height: 566,
    aspectRatio: "1.91/1",
    type: "social",
  },
  {
    name: "Instagram Portrait Post",
    art: "/editor/create_project/social/insta_vertical.jpg",
    width: 1080,
    height: 1350,
    aspectRatio: "4/5",
    type: "social",
  },
  {
    name: "Discord Avatar",
    art: "/editor/create_project/social/discord_avatar.png",
    width: 128,
    height: 128,
    aspectRatio: "1/1",
    type: "social",
  },
  {
    name: "Discord Server Avatar",
    art: "/editor/create_project/social/discord_server_avatar.png",
    width: 512,
    height: 512,
    aspectRatio: "1/1",
    type: "social",
  },
  {
    name: "VGA",
    art: "/download (2).png",
    width: 640,
    height: 480,
    aspectRatio: "4/3",
    type: "screen",
  },
  {
    name: "HD",
    art: "/download (3).png",
    width: 1280,
    height: 720,
    aspectRatio: "16/9",
    type: "screen",
  },
  {
    name: "Full HD",
    art: "/download (4).png",
    width: 1920,
    height: 1080,
    aspectRatio: "16/9",
    type: "screen",
  },
  {
    name: "2K",
    art: "/download (5).png",
    width: 2560,
    height: 1440,
    aspectRatio: "16/9",
    type: "screen",
  },
  {
    name: "4K",
    art: "/download (6).png",
    width: 3840,
    height: 2160,
    aspectRatio: "16/9",
    type: "screen",
  },
  {
    name: "8K",
    art: "/download (7).png",
    width: 7680,
    height: 4320,
    aspectRatio: "16/9",
    type: "screen",
  },
  {
    name: "iPhone 5",
    art: "/download (8).png",
    width: 640,
    height: 1136,
    aspectRatio: "9/16",
    type: "mobile",
  },
  {
    name: "iPhone 6",
    art: "/download (9).png",
    width: 750,
    height: 1334,
    aspectRatio: "9/16",
    type: "mobile",
  },
  {
    name: "iPhone 6 Plus",
    art: "/download (10).png",
    width: 1080,
    height: 1920,
    aspectRatio: "9/16",
    type: "mobile",
  },
  {
    name: "iPhone X",
    art: "/download (11).png",
    width: 1125,
    height: 2436,
    aspectRatio: "9/19.5",
    type: "mobile",
  },
  {
    name: "iPhone 12",
    art: "/download (12).png",
    width: 1170,
    height: 2532,
    aspectRatio: "9/19.5",
    type: "mobile",
  },
];

interface SelectDimensionsProps {
  setDimension: (dimension: string) => void;
  setWidth: (width: string) => void;
  setHeight: (height: string) => void;
  dimension: string;
  width: string;
  height: string;
  ppi: string;
}

interface SelectDefaultColorsProps {
  wordColor: string;
  setWordColor: (color: string) => void;
  setShowColorPicker: (showColorPicker: boolean) => void;
}

const SelectDefaultColors: React.FC<SelectDefaultColorsProps> = ({
  wordColor,
  setWordColor,
  setShowColorPicker,
}) => {
  return (
    <Select
      value={wordColor}
      onValueChange={(value) => {
        // Convert from the previous dimension to the new dimension
        if (value === "custom") {
          setShowColorPicker(true);
        } else {
          setShowColorPicker(false);
        }
        setWordColor(value);
      }}
    >
      <SelectTrigger className="w-28 h-9 bg-input dark:bg-input border-border">
        <SelectValue placeholder="Background Color" />
      </SelectTrigger>
      <SelectContent className="bg-selectBackground">
        <SelectGroup>
          <SelectLabel>Background Color</SelectLabel>
          <SelectSeparator />
          <SelectItem value="white" className="hover:bg-hover">
            White
          </SelectItem>
          <SelectItem value="black" className="hover:bg-hover">
            Black
          </SelectItem>
          <SelectItem value="custom" className="hover:bg-hover">
            Custom
          </SelectItem>
          <SelectItem value="transparent" className="hover:bg-hover">
            Transparent
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

interface SelectTemplateTypeProps {
  templateType: TemplateType;
  setTemplateType: (templateType: TemplateType) => void;
}

const SelectTemplateType: React.FC<SelectTemplateTypeProps> = ({
  templateType,
  setTemplateType,
}) => {
  return (
    <Select
      value={templateType}
      onValueChange={(value) => {
        setTemplateType(value as TemplateType);
      }}
    >
      <SelectTrigger className="w-28 h-9 bg-input dark:bg-input border-border">
        <SelectValue placeholder="Template Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Template Type</SelectLabel>
          <SelectSeparator />
          <SelectItem
            value="social"
            className="hover:dark:bg-hover hover:bg-hover"
          >
            Social
          </SelectItem>
          <SelectItem
            value="print"
            className="hover:dark:bg-hover hover:bg-hover"
          >
            Print
          </SelectItem>
          <SelectItem
            value="screen"
            className="hover:dark:bg-hover hover:bg-hover"
          >
            Screen
          </SelectItem>
          <SelectItem
            value="mobile"
            className="hover:dark:bg-hover hover:bg-hover"
          >
            Mobile
          </SelectItem>
          <SelectItem
            value="photo"
            className="hover:dark:bg-hover hover:bg-hover"
          >
            Photo
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const SelectDimensions: React.FC<SelectDimensionsProps> = ({
  dimension,
  setDimension,
  setWidth,
  setHeight,
  width,
  height,
  ppi,
}) => {
  const convertFactory = (value: string) => {
    const newDim = convertFromTo(
      value,
      dimension,
      parseFloat(width),
      parseFloat(height),
      parseFloat(ppi)
    );
    setWidth(newDim.width.toString());
    setHeight(newDim.height.toString());
    setDimension(value);
  };
  return (
    <Select
      value={dimension}
      onValueChange={(value) => {
        // Convert from the previous dimension to the new dimension
        convertFactory(value);
      }}
    >
      <SelectTrigger className="w-28 h-9 bg-input dark:bg-input border-border">
        <SelectValue placeholder="Dimensions" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Dimensions</SelectLabel>
          <SelectSeparator />
          <SelectItem value="px" className="hover:dark:bg-hover hover:bg-hover">
            Pixels
          </SelectItem>
          <SelectItem
            value="inch"
            className="hover:dark:bg-hover hover:bg-hover"
          >
            Inches
          </SelectItem>
          <SelectItem value="mm" className="hover:dark:bg-hover hover:bg-hover">
            Millimeters
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

const CreateProject: React.FC = () => {
  const [width, setWidth] = React.useState<string>("1920");
  const [stringWidth, setStringWidth] = React.useState<string>("1920");
  const [stringHeight, setStringHeight] = React.useState<string>("1080");
  const [height, setHeight] = React.useState<string>("1080");
  const [name, setName] = React.useState<string>("New Project");
  const [color, setColor] = React.useState<Color>({
    hex: "#ffffff",
    rgb: { r: 255, g: 255, b: 255, a: 1 },
  });
  const [wordColor, setWordColor] = React.useState<string>("white");
  const [dimension, setDimension] = React.useState<string>("px");
  const { project, setProject, setLanding } = useProjectContext();
  const [ppi, setPpi] = React.useState<string>("300");
  const [showColorPicker, setShowColorPicker] = React.useState<boolean>(false);
  const [templateType, setTemplateType] =
    React.useState<TemplateType>("social");

  const initializeProject = () => {
    const newPixels = convertFromTo(
      "px",
      dimension,
      parseFloat(width),
      parseFloat(height),
      300
    );

    const backgroundLayer: BackgroundLayer =
      project.layerManager.createBackgroundLayer(
        false,
        color.hex,
        Math.round(newPixels.width),
        Math.round(newPixels.height),
        color.rgb.a
      );

    // Convert the width and height to pixels, pixels are the goat unit

    setProject((draft) => {
      draft.settings.canvasSettings.width = Math.round(newPixels.width);
      draft.settings.canvasSettings.height = Math.round(newPixels.height);
      draft.settings.name = name;
      draft.layerManager.addLayer(backgroundLayer);
      draft.target = backgroundLayer;
    });
    setLanding(true);
  };

  useEffect(() => {
    if (wordColor === "white") {
      setColor({ hex: "#ffffff", rgb: { r: 255, g: 255, b: 255, a: 1 } });
    } else if (wordColor === "black") {
      setColor({ hex: "#000000", rgb: { r: 0, g: 0, b: 0, a: 1 } });
    } else if (wordColor === "transparent") {
      setColor({ hex: "#ffffff", rgb: { r: 255, g: 255, b: 255, a: 0 } });
    }
  }, [wordColor]);

  const transparentStyle = {
    background:
      "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px",
  };

  const nonTransparentStyle = {
    backgroundColor: color.hex,
    opacity: color.rgb.a,
  };

  const currentStyle =
    wordColor === "transparent" || color.rgb.a === 0
      ? transparentStyle
      : nonTransparentStyle;

  const handleWidthEnter = (value: number) => {
    if (isNaN(value)) {
      return;
    }
    // Round to the nearest hundredth if working with inches
    if (dimension === "inch") {
      const rounded = Math.round(value * 100) / 100;
      setWidth(rounded.toString());
    } else {
      setWidth(Math.round(value).toString());
    }
  };

  const handleHeightEnter = (value: number) => {
    if (isNaN(value)) {
      return;
    }
    // Round to the nearest hundredth if working with inches
    if (dimension === "inch") {
      const rounded = Math.round(value * 100) / 100;
      setHeight(rounded.toString());
    } else {
      setHeight(Math.round(value).toString());
    }
  };

  return (
    <div>
      <Dialog modal={true}>
        <DialogTrigger asChild>
          <Button variant="outline" className="dark:text-white">
            New Project
            <FileIcon className="w-5 h-5 ml-2" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] dark:text-white">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new project to start designing
            </DialogDescription>
          </DialogHeader>
          <div className="w-full flex flex-col space-y-5 items-start">
            <SelectDimensions
              dimension={dimension}
              setDimension={setDimension}
              width={width}
              height={height}
              ppi={ppi}
              setWidth={setWidth}
              setHeight={setHeight}
            />
            <div className="space-y-1">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => {
                  //Limit the length of the name to 1-20 characters
                  if (e.target.value.length === 0) {
                    alert("Name cannot be empty");
                    return;
                  }
                  if (e.target.value.length > 20) {
                    alert("Name should be less than or equal to 20 characters");
                    return;
                  }
                  setName(e.target.value);
                }}
                className="bg-input dark:bg-input border-border dark:border-border focus:ring-ring dark:focus:ring-ring "
              />
            </div>
            <div className="flex flex-row items-center justify-center space-x-2">
              <div id="width-container" className="space-y-2">
                <div className="flex flex-row items-center justify-start space-x-1 mb-1">
                  <Label>Width</Label>
                </div>
                <Input
                  type="text"
                  onBlur={(e) => handleWidthEnter(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  value={width}
                  className="bg-input dark:bg-input border-border"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleWidthEnter(Number(e.currentTarget.value));
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Check if the value is a number, omitting the minus sign and the degree symbol
                    if (isNaN(Number(value))) {
                      return;
                    }
                    // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                    // We don't want the picture to go out of bound and be hidden

                    const maxPositive = 10000;
                    const maxNegative = 0;

                    if (
                      Number(value) > maxPositive ||
                      Number(value) <= maxNegative
                    ) {
                      return;
                    }
                    setWidth(e.target.value);
                  }}
                  id="project-input-width"
                />
              </div>
              <div id="height-container" className="space-y-2">
                <div className="flex flex-row items-center justify-start mb-1">
                  <Label>Height</Label>
                </div>

                <Input
                  onBlur={(e) => handleHeightEnter(Number(e.target.value))}
                  type="text"
                  className="bg-input dark:bg-input border-border"
                  id="project-input-height"
                  value={height}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleHeightEnter(Number(e.currentTarget.value));
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Check if the value is a number, omitting the minus sign and the degree symbol
                    if (isNaN(Number(value))) {
                      return;
                    }
                    // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                    // We don't want the picture to go out of bound and be hidden

                    const maxPositive = 10000;
                    const maxNegative = 0;

                    if (
                      Number(value) > maxPositive ||
                      Number(value) <= maxNegative
                    ) {
                      return;
                    }

                    setHeight(e.target.value);
                  }}
                />
              </div>
              <div id="ppi-container" className="space-y-2">
                <div className="flex flex-row items-center justify-start mb-1">
                  <Label>PPI</Label>
                </div>

                <Input
                  className="bg-input dark:bg-input border-border"
                  type="text"
                  id="project-input-height"
                  value={ppi}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Check if the value is a number, omitting the minus sign and the degree symbol
                    if (isNaN(Number(value))) {
                      return;
                    }
                    // Consider that origin is at the center of the image, the origin of the canvas is at the top left
                    // We don't want the picture to go out of bound and be hidden

                    const maxPositive = 500;
                    const maxNegative = 1;

                    // Check if the input is not an integer
                    if (!Number.isInteger(Number(value))) {
                      alert(
                        "PPI should be an integer since pixels cannot be fractional"
                      );
                      return;
                    }

                    if (
                      Number(value) > maxPositive ||
                      Number(value) <= maxNegative
                    ) {
                      alert("PPI should be between 1 and 500");
                      return;
                    }
                    setPpi(e.target.value);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
            <div className="">
              <div className="flex flex-row justify-center items-center space-x-3">
                <Label>Background Color</Label>
                <SelectDefaultColors
                  wordColor={wordColor}
                  setWordColor={setWordColor}
                  setShowColorPicker={setShowColorPicker}
                />
                <div
                  className={`aspect-square w-10 h-10 border-2 border-black`}
                  style={currentStyle}
                  onClick={() => {
                    setShowColorPicker(true);
                    setWordColor("custom");
                  }}
                ></div>
              </div>

              {wordColor === "custom" && showColorPicker && (
                <ColorSelectorPopover
                  color={color}
                  setColor={setColor}
                  setShowColorPicker={setShowColorPicker}
                />
              )}
            </div>
            <div>
              <div className="flex flex-row items-center space-x-3 mb-2">
                <Label>Templates</Label>
                <SelectTemplateType
                  templateType={templateType}
                  setTemplateType={setTemplateType}
                />
              </div>
              <ScrollAreaHorizontalDemo
                setWidth={setWidth}
                setHeight={setHeight}
                templateType={templateType}
                setPpi={setPpi}
                setDimension={setDimension}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="submit"
                onClick={() => initializeProject()}
                className="w-full"
              >
                Create
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateProject;

interface ScrollAreaProps {
  setWidth: (width: string) => void;
  setHeight: (height: string) => void;
  setPpi: (ppi: string) => void;
  templateType: TemplateType;
  setDimension: (dimension: string) => void;
}

interface ColorSelectorProps {
  color: Color;
  setColor: (color: Color) => void;
  setShowColorPicker: (showColorPicker: boolean) => void;
}

const ColorSelectorPopover: React.FC<ColorSelectorProps> = ({
  color,
  setColor,
  setShowColorPicker,
}) => {
  // Define styles for light mode and dark mode
  const lightModeStyles = {
    body: {
      width: "100%",
      height: "100%",
      background: "#FFFFFF", // Light mode background color
      color: "#000000", // Light mode text color
      // Other light mode styles
    },
  };

  const darkModeStyles: PhotoshopPickerStylesProps = {
    // Existing styles for dark mode components
    body: {
      width: "100%",
      height: "100%",
      background: "#000000", // Dark mode background color
      color: "#FFFFFF", // Dark mode text color
      // Other dark mode styles
    },
    picker: {
      boxShadow: "none",
      border: "none",
      background: "#000000",
      color: "#FFFFFF",
    },
    head: {
      background: "#000000",
      color: "#FFFFFF",
    },
    actions: {
      background: "#000000",
      color: "#FFFFFF",
    },
    controls: {
      background: "#000000",
      color: "#FFFFFF",
    },
    hue: {
      background: "#000000",
      color: "#FFFFFF",
    },
    saturation: {
      background: "#000000",
      color: "#FFFFFF",
    },
    previews: {
      background: "#000000",
      color: "#FFFFFF",
    },
    top: {
      background: "#000000",
      color: "#FFFFFF",
    },
  };
  const { darkMode } = useContext(ThemeContext);

  const currentStyle = lightModeStyles;

  return (
    <Draggable handle=".popup-header" defaultPosition={{ x: 0, y: 0 }}>
      <div className="absolute bottom-0 left-0 opacity-80 transition-opacity duration-300 hover:opacity-100 z-50">
        <div className="popup-header px-2 py-1 cursor-move bg-navbarBackground  dark:bg-navbarBackground border-2 border-[#cdcdcd] dark:border-[#252525]">
          Color Picker
        </div>
        <div className="popup-content p-1 text-black">
          <SketchPicker
            className="w-full h-full "
            color={color.rgb}
            onChange={(newColor) => {
              const newColorObj: Color = {
                hex: newColor.hex,
                rgb: newColor.rgb as rgb,
              };
              setColor(newColorObj);
            }}
          />
        </div>
      </div>
    </Draggable>
  );
};

const ScrollAreaHorizontalDemo: React.FC<ScrollAreaProps> = ({
  setWidth,
  setHeight,
  templateType,
  setPpi,
  setDimension,
}) => {
  return (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border hover:shadow-lg transition-shadow duration-300 ease-in-out bg-input dark:bg-input border-border">
      <div className="flex w-max space-x-4 p-4">
        {works
          .filter((template) => template.type === templateType)
          .map((template) => (
            <figure key={template.name} className="shrink-0 ">
              <div
                className={`overflow-hidden rounded-md`}
                onClick={() => {
                  if (templateType === "print") {
                    // Convert millimeters to pixels given 300 ppi
                    setDimension("mm");
                    setPpi("300");
                    setWidth(template.width.toString());
                    setHeight(template.height.toString());
                  } else {
                    setDimension("px");
                    setPpi("72");
                    setWidth(template.width.toString());
                    setHeight(template.height.toString());
                  }
                }}
              >
                <Image
                  quality={100}
                  src={template.art}
                  alt={template.name}
                  width={150}
                  height={150}
                  className={`hover:scale-110 transition-transform duration-300 ease-in-out`}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
              <figcaption className="pt-2 text-xs text-muted-foreground flex flex-col">
                <span className="font-semibold text-foreground">
                  {template.name}
                </span>
                <span>
                  {" "}
                  {template.width}x{template.height}{" "}
                  {template.type === "print" ? "mm" : "px"}
                </span>
              </figcaption>
            </figure>
          ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
