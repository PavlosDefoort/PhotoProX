import { Build, Engineering, Lightbulb } from "@mui/icons-material";
import { EyeIcon, GitCommitIcon, GitForkIcon, StarIcon } from "lucide-react";

type IconProps = {
  className?: string;
};

export type OpenSource = {
  title: string;
  description: string;
  direction: string;
  href: string;
  icon: React.FC<IconProps>;
};

export type GitStat = {
  count: number;
  icon: React.FC<IconProps>;
  title: string;
};

export const openSourceData: OpenSource[] = [
  {
    title: "Suggest Features",
    description:
      "We are always open to new ideas. Feel free to suggest new features using our Github Issues page.",
    direction: "Submit a feature request",
    href: "https://github.com/PavlosDefoort/PhotoProX/issues",
    icon: Lightbulb,
  },
  {
    title: "Contribute",
    description:
      "We welcome all contributions. Feel free to fork our project and submit a pull request.",
    direction: "Fork the Project",
    href: "https://github.com/PavlosDefoort/PhotoProX",
    icon: Engineering,
  },
  {
    title: "Development Build",
    description:
      "Check out our development build to see what we are working on before it is released.",
    direction: "Development Build",
    href: "https://photoprox-dev.vercel.app/",
    icon: Build,
  },
];

export const gitStats: GitStat[] = [
  {
    count: 80,
    icon: GitCommitIcon,
    title: "Commits",
  },
  {
    count: 1,
    icon: StarIcon,
    title: "Stars",
  },
  {
    count: 0,
    icon: GitForkIcon,
    title: "Forks",
  },
  {
    count: 1,
    icon: EyeIcon,
    title: "Watching",
  },
];
