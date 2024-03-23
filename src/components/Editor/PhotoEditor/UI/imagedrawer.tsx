import * as React from "react";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";

import CarouselDemo from "@/components/Editor/PhotoEditor/UI/imageslider";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuth } from "../../../../../app/authcontext";
import {
  StorageReference,
  getBlob,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
} from "firebase/storage";
import { storage } from "../../../../../app/firebase";
import { useProjectContext } from "@/pages/editor";
import { set } from "lodash";
import MyCursor from "@/components/cursor";
import { Poppins } from "next/font/google";

interface DrawerProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const DrawerDemo: React.FC<DrawerProps> = ({ open, setOpen }) => {
  interface photoObject {
    url: string;
    name: string;
    fullPath: string;
  }
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [goal, setGoal] = React.useState(350);
  const [photos, setPhotos] = React.useState<photoObject[]>([]);
  const { user } = useAuth();
  const { project, setProject } = useProjectContext();

  React.useEffect(() => {
    const getAllPhotosForUser = async (storagePath: StorageReference) => {
      try {
        // List all projects for the user
        const projectList = await listAll(storagePath);

        // Iterate over each project folder
        const allPhotos = await Promise.all(
          projectList.prefixes.map(async (project) => {
            // List all photos within the project folder
            const photoList = await listAll(project);

            // Access the URLs or metadata for each photo
            const photoURLs = await Promise.all(
              photoList.items.map(async (photoItem) => {
                const photoURL = await getDownloadURL(photoItem);
                // You can also access other metadata like photoItem.name, photoItem.fullPath, etc.
                const dateAdded = async (photoItem: StorageReference) => {
                  try {
                    const metadata = await getMetadata(photoItem);
                    return metadata.timeCreated;
                  } catch (error) {
                    console.error("Error getting metadata:", error);
                    return null; // or handle the error in a way that makes sense for your application
                  }
                };

                const date = await dateAdded(photoItem);
                return {
                  url: photoURL,
                  name: photoItem.name,
                  fullPath: photoItem.fullPath,
                  date: date,
                };
              })
            );
            // Return an object for each project with photo URLs
            return { projectId: project.name, photos: photoURLs };
          })
        );

        return allPhotos;
      } catch (error) {
        console.error("Error getting all photos for user:", error);
        return [];
      }
    };
    if (user !== null) {
      const storageRef = ref(storage, `${user.uid}`);
      getAllPhotosForUser(storageRef).then((photos) => {
        // Create an array of all values of photo key in each object
        const allPhotos = photos.map((photo) => photo.photos).flat();
        // Sort the array by date
        const sortedPhotos = allPhotos.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        setPhotos(sortedPhotos);
      });
    }
  }, [user]);

  function onClick(adjustment: number) {
    setGoal(Math.max(200, Math.min(400, goal + adjustment)));
  }

  const downloadImage = async (photoUrl: StorageReference) => {
    getBlob(photoUrl).then((blob) => {
      // Download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photos[currentIndex].name;
      a.click();
    });
  };

  const addImageToProject = async (photoUrl: StorageReference) => {
    try {
      const blob = await getBlob(photoUrl);

      // Turn the blob into an image file
      const file = new File([blob], photos[currentIndex].name, {
        type: "image/jpeg",
      });

      // Get the dimensions of the image
      const dimensions = await getImageDimensions(file);
      // project
      //   .createLayer(
      //     {
      //       src: dimensions.source,
      //       imageWidth: dimensions.width,
      //       imageHeight: dimensions.height,
      //       name: file.name,
      //     },
      //     file,
      //     project.id,
      //     user?.uid!,
      //     true
      //   )
      //   .then((layer) => {
      //     project.addLayer(layer, setProject);
      //   });

      // Now you can use dimensions to create your layer
    } catch (error) {
      console.error("Error adding image to project:", error);
    }
  };

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number; source: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target) {
          const img = new Image();
          img.src = event.target.result as string;

          img.onload = () => {
            const dimensions = {
              width: img.width,
              height: img.height,
              source: img.src,
            };
            resolve(dimensions);
          };
        } else {
          reject(new Error("Event target is null"));
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file);
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger> */}
      <DrawerContent className={`${poppins.className}`}>
        <div className="mx-auto w-full max-w-sm max-h-screen">
          <DrawerHeader>
            <DrawerTitle className="dark:text-white">Images</DrawerTitle>
            <DrawerDescription className="dark:text-slate-100">
              Select, download, or upload an image
            </DrawerDescription>
          </DrawerHeader>
          <div className="">
            <CarouselDemo
              photos={photos}
              setCurrentIndex={setCurrentIndex}
              currentIndex={currentIndex}
            />
          </div>
          <DrawerFooter>
            <Button
              className="text-white bg-green-600 hover:bg-green-700"
              onClick={() => {
                addImageToProject(ref(storage, photos[currentIndex].url));
                setOpen(!open);
              }}
            >
              Add to project
            </Button>
            <Button
              className="text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                downloadImage(ref(storage, photos[currentIndex].url));
              }}
            >
              Download
            </Button>
            <DrawerClose asChild>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
export default DrawerDemo;
