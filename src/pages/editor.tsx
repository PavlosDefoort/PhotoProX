import React, { use } from "react";
import PhotoEditor from "../components/photoeditor";
import ImageSelector from "../components/imageselector";
import PreviousImage from "../components/previousImage";
import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import { set } from "lodash";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const theme = createTheme({
  components: {
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontFamily: `${poppins.style.fontFamily}`,
          fontSize: "0.875rem",
          lineHeight: "1.25rem",
          color: "#282929",
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
  },
});

export default function Editor({}) {
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
    fileName: string
  ) => {
    if (typeof selectedImage === "string") {
      setImage(selectedImage);
    }
    setWidth(natWidth);
    setHeight(natHeight);
    setRealWidth(realWit);
    setRealHeight(realHit);
    setFileName(fileName);
  };

  const previousAgreement = () => {
    setAgree(true);
    setOpen(false);
  };

  const setPreviousOpening = () => {
    setOpen(false);
  };

  return (
    <main className={`bg-[#252525] min-h-screen ${poppins.className}`}>
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
        />
      </ThemeProvider>
    </main>
  );
}
