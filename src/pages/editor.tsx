import React from "react";
import PhotoEditor from "../components/photoeditor";
import ImageSelector from "../components/imageselector";
import { useState } from "react";
import { Poppins } from "next/font/google";

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
