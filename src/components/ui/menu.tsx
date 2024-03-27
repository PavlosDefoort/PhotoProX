import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useProjectContext } from "@/pages/editor";
import { ImageLayer, initialEditingParameters } from "@/utils/editorInterfaces";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { useAuth } from "../../../app/authcontext";
import { Poppins } from "next/font/google";
import { produce } from "immer";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Export from "./export";
import { set } from "lodash";
import { Application, Container } from "pixi.js";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
interface MenubarDemoProps {
  trigger: boolean;
  setTrigger: (value: boolean) => void;
  appRef: React.MutableRefObject<Application | null>;
  containerRef: React.MutableRefObject<Container | null>;
}
const MenubarDemo: React.FC<MenubarDemoProps> = ({
  trigger,
  setTrigger,
  appRef,
  containerRef,
}) => {
  const { project, setProject } = useProjectContext();
  const { user } = useAuth();
  const [showExport, setShowExport] = useState(false);
  const [type, setType] = useState("png");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files && event.target.files[0];

    if (selectedFile) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = function () {
          const width = img.width;
          const height = img.height;
          const newLayer = project.layerManager.createLayer(
            width,
            height,
            {
              src: img.src,
              imageWidth: width,
              imageHeight: height,
              name: selectedFile.name,
            },
            selectedFile,
            project.id,
            user?.uid!
          );
          setProject((draft) => {
            // Create a new project object so that the state updates
            draft.layerManager.addLayer({
              ...newLayer,
              type: "image", // Add the missing 'type' property
            });
          });
          setTrigger(!trigger);
        };

        img.src = e.target!.result as string;
      };

      reader.readAsDataURL(selectedFile);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (Cmd on macOS) + L is pressed
      if ((event.ctrlKey || event.metaKey) && event.key === "o") {
        event.preventDefault(); // Prevent browser's default behavior
        fileInputRef.current?.click();
      }
    };

    // Add event listener when component mounts
    document.addEventListener("keydown", handleKeyDown);

    // Remove event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const onLayerClick = () => {
    fileInputRef.current?.click();
  };

  const onNewLayer = () => {};

  const onLayerRemove = () => {
    setProject((draft) =>
      draft.layerManager.moveLayerBack(draft.layerManager.layers[1].id)
    );
    // project.removeLayer(project.layers[1].id, setProject);
    // Possible solution, pass the containerRef to the project
  };

  const onLayerSwap = () => {
    setProject((draft) => {
      draft.layerManager.moveLayerUp(draft.layerManager.layers[0].id);
    });
  };

  return (
    <div>
      <Export
        showExport={showExport}
        setShowExport={setShowExport}
        type={type}
        setType={setType}
        appRef={appRef}
        containerRef={containerRef}
      />
      <Menubar className="h-2 flex justify-center items-center border-0 bg-navbarBackground dark:bg-navbarBackground">
        <input
          className="hidden"
          id="file-input"
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.svg"
          onChange={handleFileInputChange}
          ref={fileInputRef}
        />
        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            {" "}
            File
            {/* <HamburgerMenuIcon className=" mr-1 text-gray-600 dark:text-gray-100" /> */}
          </MenubarTrigger>

          <MenubarContent className={`${poppins.className}`}>
            <MenubarItem onClick={onLayerClick}>
              Open
              <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>

            {/* <MenubarItem onClick={onLayerRemove}>
              Remove Layer
              <MenubarShortcut>Ctrl+L</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={onLayerSwap}>
              Move Layer Up
              <MenubarShortcut>Ctrl+L</MenubarShortcut>
            </MenubarItem> */}

            <MenubarItem>
              Save Project <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            {/* <MenubarItem disabled>Remove Layer</MenubarItem> */}
            <MenubarSeparator />
            {/* <MenubarSub>
            <MenubarSubTrigger>Share</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Email</MenubarItem>
              <MenubarItem>X</MenubarItem>
            </MenubarSubContent>
          </MenubarSub> */}
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>
                Export as
                <MenubarShortcut>Ctrl+E</MenubarShortcut>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={() => {
                    setShowExport(true);
                    setType("png");
                  }}
                >
                  PNG
                  <MenubarShortcut>.png</MenubarShortcut>
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    setShowExport(true);
                    setType("jpg");
                  }}
                >
                  JPG
                  <MenubarShortcut>.jpg</MenubarShortcut>
                </MenubarItem>
                <MenubarItem
                  onClick={() => {
                    setShowExport(true);
                    setType("webp");
                  }}
                >
                  WEBP
                  <MenubarShortcut>.webp</MenubarShortcut>
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />

            <MenubarItem>
              Export Layers<MenubarShortcut>Ctrl+Alt+E</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            Edit
          </MenubarTrigger>
          <MenubarContent className={`${poppins.className}`}>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Search the web</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            View
          </MenubarTrigger>
          <MenubarContent className={`${poppins.className}`}>
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>
              Always Show Full URLs
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Reload <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Hide Sidebar</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            Profiles
          </MenubarTrigger>
          <MenubarContent className={`${poppins.className}`}>
            <MenubarRadioGroup value="benoit">
              <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
              <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
              <MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Edit...</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Add Profile...</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};
export default MenubarDemo;
