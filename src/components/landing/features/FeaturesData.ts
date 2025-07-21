import { PhotoFilter, Psychology, Transform } from "@mui/icons-material";
import { ComponentBooleanIcon } from "@radix-ui/react-icons";

export type Feature = {
  icon: React.FC;
  title: string;
  description: string;
};
export const features = [
  {
    icon: Transform,
    title: "Transform",
    description: "Rotations, skewing, and scaling.",
  },
  {
    icon: PhotoFilter,
    title: "Filters",
    description:
      "Commonly used filters, such as blue, sepia, grayscale, and much more!",
  },
  {
    icon: ComponentBooleanIcon,
    title: "Adjustment/Clipping Layers",
    description:
      "Apply adjustments to your images without changing the original",
  },
  {
    icon: Psychology,
    title: "Artificial Intelligence",
    description:
      "Utilise the power of AI to enhance your images. Background removal, object detection, and more coming soon!",
  },
  {
    icon: PhotoFilter,
    title: "Image Discovery",
    description:
      "Don't have an image? No problem! We have a streamlined tag-based image search.",
  },
  {
    icon: PhotoFilter,
    title: "Secure Cloud Storage",
    description:
      "All your work done on PhotoProX is saved to the cloud. No need to worry about downloading your projects.",
  },
];
