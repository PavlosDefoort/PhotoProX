import {
  Accessibility,
  CogIcon,
  KeyboardIcon,
  LucideIcon,
  PaletteIcon,
  Settings2Icon,
  Boxes,
  UserIcon,
  Wrench,
} from "lucide-react";

type NavigationInstance = {
  name: string;
  icon: LucideIcon;
};

type NavigationList = NavigationInstance[];

export type NavigationData = {
  content: NavigationList;
  title: string;
};

export const navigationData: NavigationData[] = [
  {
    title: "General",
    content: [
      { name: "Account", icon: UserIcon },
      { name: "Accessibility", icon: Accessibility },
    ],
  },
  {
    title: "Editor Settings",
    content: [
      { name: "Preferences", icon: Settings2Icon },
      { name: "Developer", icon: Wrench },
      { name: "Performance", icon: CogIcon },
      { name: "Keybindings", icon: KeyboardIcon },
      { name: "Appearance", icon: PaletteIcon },
      { name: "Models", icon: Boxes },
    ],
  },
];
