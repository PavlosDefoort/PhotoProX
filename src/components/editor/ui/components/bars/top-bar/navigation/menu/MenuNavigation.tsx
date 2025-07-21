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
import { useEffect, useRef, useState } from "react";
import ImageInput from "../../../../input/ImageInput";
import Export from "./file/Export";

const MenuNavigation: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [imageType, setImageType] = useState("jpeg");
  const [trigger, setTrigger] = useState(false);

  // Listen for ctrl + E to export
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        setTrigger(true);
        // triggerRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div>
      <Export
        imageType={imageType}
        setImageType={setImageType}
        triggerRef={triggerRef}
        allLayers={!true}
        openTrigger={trigger}
        setOpenTrigger={setTrigger}
      />

      <Menubar className="h-2 flex justify-center items-center border-0 bg-navbarBackground dark:bg-navbarBackground">
        <ImageInput inputRef={fileInputRef} />

        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            {" "}
            File
            {/* <HamburgerMenuIcon className=" mr-1 text-gray-600 dark:text-gray-100" /> */}
          </MenubarTrigger>

          <MenubarContent>
            <MenubarItem onClick={() => fileInputRef.current?.click()}>
              Open
              <MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>

            <MenubarItem>
              Save Project <MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />

            <MenubarSub>
              <MenubarSubTrigger className="">
                Export As
                <MenubarShortcut>Ctrl+E</MenubarShortcut>
              </MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem
                  onClick={(e) => {
                    e.preventDefault();

                    setTrigger(true);
                    setImageType("png");
                    triggerRef.current?.click();
                  }}
                >
                  PNG
                </MenubarItem>
                <MenubarItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTrigger(true);
                    setImageType("jpeg");
                    triggerRef.current?.click();
                  }}
                >
                  JPEG
                </MenubarItem>
                <MenubarItem
                  onClick={(e) => {
                    e.preventDefault();
                    setTrigger(true);
                    setImageType("webp");
                    triggerRef.current?.click();
                  }}
                >
                  WebP
                </MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            {/* <MenubarSeparator /> */}

            {/* <MenubarItem>
            Export Layers<MenubarShortcut>Ctrl+Alt+E</MenubarShortcut>
          </MenubarItem> */}
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            Edit
          </MenubarTrigger>
          <MenubarContent>
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
          <MenubarContent>
            <MenubarCheckboxItem>Zoom In</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>Zoom Out</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Fit to Screen <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Fill Screen <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Ruler</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Mode</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="hover:bg-buttonHover dark:hover:bg-buttonHover">
            More
          </MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value="benoit">
              <MenubarRadioItem value="andy">Language</MenubarRadioItem>
              <MenubarRadioItem value="benoit">Theme</MenubarRadioItem>
              <MenubarRadioItem value="Luis">
                Keyboard Shortcuts
              </MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Device Specs</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Add PhotoProX As Bookmark</MenubarItem>
            <MenubarItem inset>About PhotoProX.</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};
export default MenuNavigation;
