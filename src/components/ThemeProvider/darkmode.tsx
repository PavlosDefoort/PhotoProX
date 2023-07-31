import { ThemeContext } from "./themeprovider";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { Tooltip } from "@mui/material";
import { useContext, useRef } from "react";

const DarkMode = () => {
  const anchorRef = useRef(null);
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  return (
    <div className="animate-jump z-50 absolute top-4 right-12">
      {darkMode ? (
        <Tooltip
          title="See the Sun rise"
          placement="bottom"
          id="darktool"
          ref={anchorRef}
        >
          <DarkModeIcon
            onClick={toggleDarkMode}
            className="text-white hover:animate-bounce"
          />
        </Tooltip>
      ) : (
        <Tooltip
          title="Let the Moon fall"
          placement="bottom"
          ref={anchorRef}
          id="lighttool"
        >
          <LightModeIcon
            onClick={toggleDarkMode}
            className="text-black hover:animate-bounce"
          />
        </Tooltip>
      )}
    </div>
  );
};
export default DarkMode;
