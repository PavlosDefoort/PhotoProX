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
import { ImageLayer, initialEditingParameters } from "@/utils/interfaces";
import { ChangeEvent, useEffect, useRef } from "react";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";

const MenubarDemo = () => {
  const { project, setProject } = useProjectContext();

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
          const newLayer = project.createLayer({
            src: img.src,
            imageWidth: width,
            imageHeight: height,
            name: selectedFile.name,
          });

          project.addLayer(newLayer, setProject);
        };

        img.src = e.target!.result as string;
      };

      reader.readAsDataURL(selectedFile);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (Cmd on macOS) + L is pressed
      if ((event.ctrlKey || event.metaKey) && event.key === "l") {
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

  useEffect(() => {
    console.log(project?.layers);
  }, [project?.layers]);

  const onLayerRemove = () => {
    project.moveLayerBack(project.layers[1].id, setProject);
    // project.removeLayer(project.layers[1].id, setProject);
    // Possible solution, pass the containerRef to the project
  };

  const onLayerSwap = () => {
    project.moveLayerUp(project.layers[0].id, setProject);
  };

  return (
    <Menubar className="h-7 w-9 border-0 flex justify-center items-center hover:bg-buttonHover dark:hover:bg-buttonHover ">
      <input
        id="file-input"
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.svg"
        onChange={handleFileInputChange}
        ref={fileInputRef}
      />
      <MenubarMenu>
        <MenubarTrigger>
          {" "}
          <HamburgerMenuIcon className=" mr-1 text-gray-600 dark:text-gray-100" />
        </MenubarTrigger>

        <MenubarContent>
          <MenubarItem onClick={onLayerClick}>
            New Layer
            <MenubarShortcut>Ctrl+L</MenubarShortcut>
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
          <MenubarItem disabled>Remove Layer</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Share</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Email</MenubarItem>
              <MenubarItem>X</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>
            Export Project<MenubarShortcut>Ctrl+E</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      {/* <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
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
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
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
        <MenubarTrigger>Profiles</MenubarTrigger>
        <MenubarContent>
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
      </MenubarMenu>*/}
    </Menubar>
  );
};
export default MenubarDemo;
