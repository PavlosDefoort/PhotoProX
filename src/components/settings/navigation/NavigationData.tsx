import {
  Accessibility,
  CogIcon,
  KeyboardIcon,
  PaintbrushIcon,
  PaletteIcon,
  PowerIcon,
  Settings2Icon,
  UserIcon,
} from "lucide-react";

type NavigationInstance = {
  name: string;
  icon: React.FC;
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
      { name: "Performance", icon: CogIcon },
      { name: "Keybindings", icon: KeyboardIcon },
      { name: "Appearance", icon: PaletteIcon },
    ],
  },
];
