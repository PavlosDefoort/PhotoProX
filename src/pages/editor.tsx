import React from "react";
import PhotoEditor from "../components/photoeditor";
import ImageSelector from "../components/imageselector";
import { useState } from "react";
import { Inter } from "next/font/google";
import TextField from "@mui/material/TextField";
import { Poppins } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function Editor({}) {
  const [image, setImage] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [realWidth, setRealWidth] = useState(0);
  const [realHeight, setRealHeight] = useState(0);
  const [fileName, setFileName] = useState("");
  const [scaleOption, setScaleOption] = useState("none");
  const [urlString, setUrlString] = useState("");

  const handleImageSet = (
    selectedImage: HTMLImageElement | string | ArrayBuffer | null,
    natWidth: number,
    natHeight: number,
    realWit: number,
    realHit: number,
    fileName: string
  ) => {
    console.log(fileName);
    if (typeof selectedImage === "string") {
      setImage(selectedImage);
    }
    setWidth(natWidth);
    setHeight(natHeight);
    setRealWidth(realWit);
    setRealHeight(realHit);
    setFileName(fileName);
  };

  // useEffect(() => {
  //   const urlParams = new URLSearchParams(window.location.search);

  //   if (urlParams.has("imageUrl")) {
  //     const imageUrl = urlParams.get("imageUrl");
  //     const imageTitle = urlParams.get("imageTitle");

  //     const loadImageAndSetDataUrl = async () => {
  //       const target = await createFileFromImageUrl(imageUrl, imageTitle);
  //       // setCrop(undefined);
  //       const reader = new FileReader();
  //       reader.addEventListener("load", () =>
  //         setImgSrc(reader.result ? reader.result.toString() : "")
  //       );
  //       reader.readAsDataURL(target);
  //     };

  //     loadImageAndSetDataUrl();
  //   }
  // }, []);

  // const createFileFromImageUrl = async (imageUrl, imageTitle) => {
  //   // Specify the desired file name here

  //   // Create the API URL
  //   const apiUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
  //   try {
  //     const response = await fetch(apiUrl);
  //     const blobData = await response.blob();
  //     const lastModified = Date.now();
  //     const file = new File([blobData], imageTitle, { lastModified });

  //     return file;
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }

  return (
    <main className={`${poppins.className}`}>
      <div>
        {!image && <ImageSelector onImageSelect={handleImageSet} />}

        <PhotoEditor
          naturalWidth={width}
          naturalHeight={height}
          imageData={image}
          realNaturalWidth={realWidth}
          realNaturalHeight={realHeight}
          fileName={fileName}
        />
      </div>
    </main>
  );
}
