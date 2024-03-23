import PhotoEditor from "@/components/Editor/PhotoEditor/photoeditor";
import ImageSelector from "@/components/Editor/ImageSelect/imageselector";
import PreviousImage from "@/components/Editor/previousImage";
import { ThemeContext } from "../components/ThemeProvider/themeprovider";
import { GetInfo } from "@/components/getinfo";
import { useState, useEffect, useContext, createContext } from "react";
import { Poppins } from "next/font/google";
import { create, toNumber } from "lodash";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Project } from "@/utils/editorInterfaces";
import { DraftFunction, useImmer } from "use-immer";

import {
  EditingParameters,
  EditorProject,
  ImageData,
  ImageLayer,
  ProjectSettings,
  initialEditingParameters,
} from "@/utils/editorInterfaces";
import { TYPES, SCALE_MODES, Sprite } from "pixi.js";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../../app/authcontext";
import { uploadLayer } from "../../app/firebase";
import { Draft } from "immer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const lightTheme = createTheme({
  palette: {
    text: {
      primary: "#000000",
      secondary: "#000000",
    },
  },
  components: {
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontFamily: `${poppins.style.fontFamily}`,
          fontSize: "0.875rem",
          lineHeight: "1.25rem",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: `${poppins.style.fontFamily}`,
          fontSize: "1.25rem",
          lineHeight: "1.75rem",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: `${poppins.style.fontFamily}`,
          fontSize: "0.875rem",
          lineHeight: "1.25rem",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          fontFamily: `${poppins.style.fontFamily}`,
          justifyContent: "center",
          alignItems: "center",
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          fontFamily: `${poppins.style.fontFamily}`,
          justifyContent: "center",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: `${poppins.style.fontFamily}`,
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  components: lightTheme.components,
});

export default function Editor({}) {
  // // Create a new project
  const initialParameters = initialEditingParameters;

  const initialSettings: ProjectSettings = {
    name: "New Project",
    dateCreated: Date.now(),
    dateModified: Date.now(),
    size: 0,
    colorMode: TYPES.UNSIGNED_BYTE,
    scaleMode: SCALE_MODES.LINEAR,
    canvasSettings: {
      width: 0,
      height: 0,
      antialias: false,
    },
  };

  const [project, setProject] = useImmer<Project>(new Project());
  const [trigger, setTrigger] = useState(false);

  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  const [image, setImage] = useState("");
  const [possibleImage, setPossibleImage] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [realWidth, setRealWidth] = useState(0);
  const [realHeight, setRealHeight] = useState(0);
  const [fileName, setFileName] = useState("");
  const [scaleOption, setScaleOption] = useState("none");
  const [urlString, setUrlString] = useState("");
  const [agree, setAgree] = useState(false);
  const [open, setOpen] = useState(false);
  const [fileSize, setFileSize] = useState(0);
  const [userGPU, setUserGPU] = useState<Object>({});
  const [theme, setTheme] = useState(darkTheme);
  const { user } = useAuth();

  useEffect(() => {
    GetInfo().then((gpu) => {
      setUserGPU(gpu);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      setTheme(darkTheme);
    } else {
      setTheme(lightTheme);
    }
  }, [darkMode]);

  // useEffect(() => {
  //   const storedImage = localStorage.getItem("imageData");
  //   const storedWidth = localStorage.getItem("realNaturalWidth");
  //   const storedHeight = localStorage.getItem("realNaturalHeight");
  //   if (storedImage !== null && storedImage.length > 0 && agree) {
  //     setImage(storedImage);
  //     setRealWidth(parseInt(storedWidth!));
  //     setRealHeight(parseInt(storedHeight!));
  //     setFileName(localStorage.getItem("imageName")!);
  //   }
  // }, [agree]);

  // useEffect(() => {
  //   const storedImage = localStorage.getItem("imageData");
  //   if (storedImage !== null && storedImage.length > 0) {
  //     setPossibleImage(storedImage);
  //     setOpen(true);
  //   }
  // }, []);

  /// Create a function that will remove the file extension from the string

  const removeExtension = (fileName: string) => {
    const splitName = fileName.split(".");
    if (splitName.length > 1) {
      splitName.pop();
    }
    return splitName.join(".");
  };

  useEffect(() => {
    console.log(project.layerManager.layers);
  }, [project.layerManager.layers]);

  const handleImageSet = (
    selectedImage: HTMLImageElement | string | ArrayBuffer | null,
    natWidth: number,
    natHeight: number,
    realWit: number,
    realHit: number,
    fileName: string,
    fileSize: number,
    file: File
  ) => {
    if (typeof selectedImage === "string") {
      setImage(selectedImage);
      const randomId = uuidv4();
      const imageData: ImageData = {
        name: fileName,
        src: selectedImage,
        imageHeight: realHit,
        imageWidth: realWit,
      };
      console.log(realWit, realHit, "realWit, realHit");

      try {
        const layer = project.layerManager.createLayer(
          realWit,
          realHit,
          imageData,
          file,
          project.id,
          user?.uid!
        );
        setProject((draft) => {
          draft.settings.canvasSettings.width = realWit;
          draft.settings.canvasSettings.height = realHit;

          const imageLayer: ImageLayer = {
            id: layer.id,
            imageData: layer.imageData,
            zIndex: layer.zIndex,
            editingParameters: layer.editingParameters,
            sprite: layer.sprite,
            visible: layer.visible,
            type: "image", // Add the 'type' property with the value 'image'
          };

          draft.layerManager.addLayer(imageLayer);
          console.log(draft.layerManager.layers, "draft.layerManager.layers");
          const targetLayer = draft.layerManager.findLayer(layer.id);
          if (targetLayer) {
            draft.target = targetLayer as Draft<ImageLayer>;
          }
        });

        // Now you can use the 'newLayer' object after it's resolved
      } catch (error) {
        // Handle any errors that may occur during the async operation
        console.error("Error creating layer:", error);
      }

      // Add the layer to the project
    }

    setWidth(natWidth);
    setHeight(natHeight);
    setRealWidth(realWit);
    setRealHeight(realHit);
    const newName = removeExtension(fileName);
    setFileName(newName);
    setFileSize(toNumber((fileSize / 1024 / 1024).toFixed(2)));
    uploadLayer(file, project.id, user?.uid!);
  };

  const previousAgreement = () => {
    setAgree(true);
    setOpen(false);
  };

  const setPreviousOpening = () => {
    setOpen(false);
  };

  return (
    <main
      className={` bg-[#cdcdcd] dark:bg-[#252525] h-screen max-h-screen ${poppins.className}`}
    >
      <ThemeProvider theme={theme}>
        {!agree && possibleImage && open && (
          <PreviousImage
            image={possibleImage}
            setAgreement={previousAgreement}
            setPreviousOpen={setPreviousOpening}
          />
        )}

        {!image && <ImageSelector onImageSelect={handleImageSet} />}
        <ProjectContext.Provider
          value={{ project, setProject, trigger, setTrigger }}
        >
          <PhotoEditor
            imageData={image}
            fileName={fileName}
            fileSize={fileSize}
          />
        </ProjectContext.Provider>
      </ThemeProvider>
    </main>
  );
}

interface ProjectContextValue {
  project: Project;
  setProject: (arg: Project | DraftFunction<Project>) => void;
  trigger: boolean;
  setTrigger: (value: boolean) => void;
}

export const ProjectContext = createContext<ProjectContextValue>({
  project: new Project(),
  setProject: (arg: Project | DraftFunction<Project>) => {
    // Add your implementation here
  },
  trigger: false,
  setTrigger: (value: boolean) => {
    // Add your implementation here
  },
});

export function useProjectContext() {
  return useContext(ProjectContext);
}
