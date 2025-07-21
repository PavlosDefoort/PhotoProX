import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RenameProjectInput from "./RenameProjectInput";
import { useProject } from "@/hooks/useProject";
import { useEffect, useState } from "react";

export function ProjectInfoTabs() {
  const { project, setProject } = useProject();
  const [name, setName] = useState(project.settings.name);

  useEffect(() => {
    setName(project.settings.name);
  }, [project.settings.name]);

  return (
    <Tabs defaultValue="file" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="file">File</TabsTrigger>
        <TabsTrigger value="canvas">Canvas</TabsTrigger>
      </TabsList>
      <TabsContent value="file">
        <Card>
          <CardHeader>
            <CardTitle>File</CardTitle>
            <CardDescription>
              View the project file information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <RenameProjectInput name={name} setName={setName} />
            </div>
            {/* <div className="space-y-1">
              <Label htmlFor="username">Colour Model</Label>
              <Input id="username" defaultValue="@peduarte" />
            </div> */}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                setProject((draft) => {
                  draft.settings.name = name;
                });
              }}
            >
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="canvas">
        <Card>
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
            <CardDescription>
              View the canvas information. To resize the canvas, select resize
              canvas in the dropdown menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="info-width">Width</Label>
              <Input
                disabled
                id="info-width"
                value={project.settings.canvasSettings.width}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="info-height">Height</Label>
              <Input
                disabled
                id="info-height"
                value={project.settings.canvasSettings.height}
              />
            </div>
          </CardContent>
          {/* <CardFooter>
            <Button>Save changes</Button>
          </CardFooter> */}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
