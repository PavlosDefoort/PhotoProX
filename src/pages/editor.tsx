import PhotoEditor from "@/components/Editor/PhotoEditor/photoeditor";
import { GetInfo } from "@/components/getinfo";
import { Project } from "@/utils/editorInterfaces";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { setAutoFreeze } from "immer";
import { Poppins } from "next/font/google";
import { createContext, useContext, useEffect, useState } from "react";
import { Hourglass } from "react-loader-spinner";
import { DraftFunction, useImmer } from "use-immer";
import { ThemeContext } from "../components/ThemeProvider/themeprovider";
import "../styles/animations.css";

import {
  ProjectSettings,
  initialEditingParameters,
} from "@/utils/editorInterfaces";
import { SCALE_MODES, TYPES } from "pixi.js";
import { useAuth } from "../../app/authcontext";

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
  setAutoFreeze(false);
  const [project, setProject] = useImmer<Project>(new Project());
  const [trigger, setTrigger] = useState(false);
  const [landing, setLanding] = useState(false);

  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
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

  const previousAgreement = () => {
    setAgree(true);
    setOpen(false);
  };

  const setPreviousOpening = () => {
    setOpen(false);
  };

  return (
    <main className={`h-screen max-h-screen  ${poppins.className} select-none`}>
      <div
        className={`bg-[#cdcdcd] dark:bg-[#252525] h-full w-full ${
          loading ? "tint-in" : "tint-out"
        }`}
      >
        <ThemeProvider theme={theme}>
          {/* {!agree && possibleImage && open && (
          <PreviousImage
            image={possibleImage}
            setAgreement={previousAgreement}
            setPreviousOpen={setPreviousOpening}
          />
        )} */}

          <ProjectContext.Provider
            value={{
              project,
              setProject,
              trigger,
              setTrigger,
              landing,
              setLanding,
              loading,
              setLoading,
            }}
          >
            <PhotoEditor />
          </ProjectContext.Provider>
        </ThemeProvider>
      </div>
      {loading && (
        <div
          className="bg-white dark:bg-black bg-opacity-50 dark:bg-opacity-50 h-full w-full flex items-center justify-center"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            zIndex: "1000",
            transform: "translate(-50%, -50%)",
          }}
        >
          <h1 className="text-xl text-black dark:text-white ">Loading...</h1>
          <Hourglass visible={loading} />
        </div>
      )}
    </main>
  );
}

interface ProjectContextValue {
  project: Project;
  setProject: (arg: Project | DraftFunction<Project>) => void;
  trigger: boolean;
  setTrigger: (value: boolean) => void;
  landing: boolean;
  setLanding: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
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
  landing: false,
  setLanding: (value: boolean) => {
    // Add your implementation here
  },
  loading: false,
  setLoading: (value: boolean) => {
    // Add your implementation here
  },
});

export function useProjectContext() {
  return useContext(ProjectContext);
}
