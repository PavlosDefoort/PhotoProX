import { useState, useEffect, use } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import NextImage from "next/image";
import { blue, green, red } from "@mui/material/colors";
import { Poppins } from "next/font/google";
import { set } from "lodash";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface PreviousImageProps {
  image: string | ArrayBuffer | null;
  setAgreement: () => void;
  setPreviousOpen: () => void;
}

const PreviousImage: React.FC<PreviousImageProps> = ({
  image,
  setAgreement,
  setPreviousOpen,
}) => {
  const [open, setOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState("");

  const handleClose = () => {
    setOpen(false);
    localStorage.clear();
    setPreviousOpen();
  };

  useEffect(() => {
    if (typeof image === "string" && image.length > 0) {
      setCurrentPhoto(image);
      setOpen(true);
    }
  }, [image]);

  return (
    <div>
      {currentPhoto && (
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {"Continue Project?"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              We found a previous project you were working on, would you like to
              work on it some more?
            </DialogContentText>

            <NextImage
              className="pt-4"
              alt="Chosen image"
              src={currentPhoto}
              width={300} // Set the desired width here
              height={100} // Set the desired height here
            ></NextImage>
            <p className={`pt-2 text-xs ${poppins.className}`}>
              Note: All changes you made from last time are saved!
            </p>
            {/* <p
                  className={`text-xs ${poppins.className} items-center justify-center`}
                >
                  Note: This compression only applies to the canvas, you will
                  still be able to download the uncompressed result
                </p> */}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} sx={{ color: red[400] }}>
              New Project
            </Button>
            <Button onClick={setAgreement} autoFocus sx={{ color: blue[400] }}>
              Continue
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default PreviousImage;
