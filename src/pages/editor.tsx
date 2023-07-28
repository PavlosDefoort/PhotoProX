import React, { use } from "react";
import PhotoEditor from "@/components/photoeditor";
import ImageSelector from "@/components/imageselector";
import PreviousImage from "@/components/previousImage";
import { ThemeContext } from "../components/themeprovider";
import { GetInfo } from "@/components/getinfo";
import { useState, useEffect, useContext } from "react";
import { Poppins } from "next/font/google";
import { set, toNumber } from "lodash";
import { createTheme, ThemeProvider } from "@mui/material/styles";

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

  useEffect(() => {
    GetInfo().then((gpu) => {
      console.log(gpu);
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

  useEffect(() => {
    const storedImage = localStorage.getItem("imageData");
    const storedWidth = localStorage.getItem("realNaturalWidth");
    const storedHeight = localStorage.getItem("realNaturalHeight");
    if (storedImage !== null && storedImage.length > 0 && agree) {
      setImage(storedImage);
      setRealWidth(parseInt(storedWidth!));
      setRealHeight(parseInt(storedHeight!));
    }
  }, [agree]);

  useEffect(() => {
    const storedImage = localStorage.getItem("imageData");
    if (storedImage !== null && storedImage.length > 0) {
      setPossibleImage(storedImage);
      setOpen(true);
    }
  }, []);

  const handleImageSet = (
    selectedImage: HTMLImageElement | string | ArrayBuffer | null,
    natWidth: number,
    natHeight: number,
    realWit: number,
    realHit: number,
    fileName: string,
    fileSize: number
  ) => {
    if (typeof selectedImage === "string") {
      setImage(selectedImage);
    }
    setWidth(natWidth);
    setHeight(natHeight);
    setRealWidth(realWit);
    setRealHeight(realHit);
    setFileName(fileName);

    setFileSize(toNumber((fileSize / 1024 / 1024).toFixed(2)));
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
      className={` bg-[#cdcdcd] dark:bg-[#252525] min-h-screen ${poppins.className}`}
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
        <PhotoEditor
          imageData={image}
          realNaturalWidth={realWidth}
          realNaturalHeight={realHeight}
          fileName={fileName}
          fileSize={fileSize}
        />
      </ThemeProvider>
    </main>
  );
}
