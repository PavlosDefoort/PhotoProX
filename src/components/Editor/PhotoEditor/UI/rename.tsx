import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useProjectContext } from "@/pages/editor";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { set } from "lodash";

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
    <div className="grid grid-cols-2 gap-2">
      {SHEET_SIDES.map((side) => (
        <Sheet key={side} open={open} onOpenChange={() => setOpen(false)}>
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
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    console.log("Name:", e.target.value);
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
                  onClick={() => project.renameProject(name, setProject)}
                >
                  Save changes
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
};
export default SheetSide;
