import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectContext } from "@/pages/editor";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const SHEET_SIDES = ["top"] as const;

type SheetSide = (typeof SHEET_SIDES)[number];

interface SheetSideProps {
  imgName: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  setFileName: (value: string) => void;
}
const SheetSide: React.FC<SheetSideProps> = ({
  open,
  setOpen,
  imgName,
  setFileName,
}) => {
  const [name, setName] = useState(imgName);
  const { project, setProject } = useProjectContext();
  useEffect(() => {
    setName(imgName);
    localStorage.setItem("imageName", imgName);
  }, [imgName]);

  useEffect(() => {
    setName(project.settings.name);
  }, [project.settings.name]);

  return (
    <div className="grid grid-cols-2 gap-2 z-[-10]">
      <Sheet open={open} onOpenChange={setOpen}>
        {/* <SheetTrigger asChild>
          <Button variant="outline">Open</Button>
        </SheetTrigger> */}
        <SheetContent side="top">
          <SheetHeader>
            <SheetTitle>Rename project</SheetTitle>
            <SheetDescription>
              Change your project name. Click save when you are done.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4 text-black dark:text-white">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (name === "") {
                      alert("Name cannot be empty");
                      return;
                    } else if (name.length > 20) {
                      alert("Name should be less than 20 characters");
                    } else {
                      setProject((draft) => {
                        draft.settings.name = name;
                      });
                      setOpen(!open);
                    }
                  }
                }}
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  //Limit the length of the name to 20 characters

                  if (e.target.value.length > 20) {
                    alert("Name should be less than or equal to 20 characters");
                    return;
                  }
                  setName(e.target.value);
                }}
                className="col-span-3 bg-buttonHover dark:bg-[#3b3b3b]"
              />
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button
                type="submit"
                onClick={() => {
                  if (name === "") {
                    alert("Name cannot be empty");
                    return;
                  } else if (name.length > 20) {
                    alert("Name should be less than 20 characters");
                  } else {
                    setProject((draft) => {
                      draft.settings.name = name;
                    });
                    setOpen(!open);
                  }
                }}
              >
                Save changes
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
export default SheetSide;
