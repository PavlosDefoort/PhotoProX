import Link from "next/link";

import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import DrawerDemo from "./ImageDrawer";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { handleSignIn, handleSignOut } from "@/services/FireBase";
import { PersonIcon } from "@radix-ui/react-icons";
import { FileImage, Image, LucideIcon, Settings } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { toast } from "sonner";

export function SignOut() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="flex flex-row items-center justify-center w-full bg-red-400 hover:bg-red-500">
          Sign Out
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-black dark:text-white">
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-black dark:text-white">
            Your progress will no longer be saved on your account. Untracked
            progress cannot be recovered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="dark:bg-slate-300 dark:hover:bg-red-300 hover:text-black">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="dark:bg-white dark:hover:bg-green-300 hover:text-black"
            onClick={handleSignOut}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const createComponents: { title: string; href: string; description: string }[] =
  [
    {
      title: "New Project",
      href: "./editor",
      description: "Start a new fresh project from scratch.",
    },
    {
      title: "Open Project",
      href: "/docs/primitives/hover-card",
      description: "Open an existing project to continue working on it.",
    },
    {
      title: "Import Project",
      href: "/docs/primitives/progress",
      description: "Import a project from another source to work on it.",
    },
    {
      title: "Collage",
      href: "/docs/primitives/scroll-area",
      description: "Create a collage of photos to share with others.",
    },
  ];

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Basics",
    href: "https://photoproxdocs.vercel.app/basics",
    description: "Start off your PhotoProX journey with learning the basics.",
  },
  {
    title: "Colour Sciences",
    href: "https://photoproxdocs.vercel.app/technical/colour_sciences",
    description:
      "Learn about the science of color and how it can be used in your projects.",
  },
  {
    title: "Intermediate",
    href: "/docs/primitives/progress",
    description:
      "Take your skills to the next level with these intermediate level topics.",
  },
  {
    title: "Software Design",
    href: "/docs/primitives/scroll-area",
    description: "Learn about the design of PhotoProX and how it was created.",
  },
  {
    title: "Expert",
    href: "/docs/primitives/tabs",
    description:
      "Become an expert in PhotoProX with these advanced level topics.",
  },
  {
    title: "Graphic Design",
    href: "/docs/primitives/tooltip",
    description:
      "Learn about graphic design and how it can be used in PhotoProX.",
  },
];

const UserNavigationMenu: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user is signed in and has a display name
    if (
      user &&
      user.displayName &&
      localStorage.getItem("welcome") !== "true"
    ) {
      toast(`Welcome ${user.displayName}`, {
        description:
          "Explore our powerful photo editor and unleash your creativity.",
        action: {
          label: "Got it!",
          onClick: () => "Undo",
        },
      });
      localStorage.setItem("welcome", "true");
    }
  }, [user]);

  return (
    <div className="bg-transparent">
      <DrawerDemo open={open} setOpen={setOpen} />
      <NavigationMenu className="bg-transparent p-0 m-0 ">
        <NavigationMenuList className="">
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent p-0 m-0 flex flex-row justify-center space-x-2 items-center h-full w-16 hover:bg-buttonHover dark:hover:bg-buttonHover">
              <Avatar className="w-9 h-9 ">
                {user && <AvatarImage className="" src={user.photoURL!} />}
                <AvatarFallback className="bg-violet-100 dark:bg-indigo-600">
                  <PersonIcon />
                </AvatarFallback>
              </Avatar>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] ">
                <li className="row-span-4">
                  <NavigationMenuLink asChild>
                    <Link
                      className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                      href="/"
                    >
                      {/* <Icons.logo className="h-6 w-6" /> */}
                      <div className="mb-2 mt-4 text-lg font-medium">
                        PhotoProX
                      </div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Make Ordinary Photos Extraordinary
                      </p>
                    </Link>
                  </NavigationMenuLink>
                </li>

                <ListItem href="/settings" title="Settings" icon={Settings}>
                  Adjust the settings.
                </ListItem>
                <ListItem href="/projects" title="Projects" icon={FileImage}>
                  View and manage your projects.
                </ListItem>
                <ListItem
                  title="Photos"
                  onClick={() => setOpen(true)}
                  icon={Image}
                  href="/photos"
                >
                  View and manage your photos.
                </ListItem>
                {user ? (
                  <SignOut />
                ) : (
                  <Button onClick={handleSignIn}>Sign in</Button>
                )}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent">
              <div className="">Create</div>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="bg-white dark:bg-[#111111] grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                {createComponents.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                    icon={Image}
                  >
                    {component.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent">
              Learn
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              {" "}
              <ul className="bg-white dark:bg-[#111111] grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                {components.map((component) => (
                  <ListItem
                    key={component.title}
                    title={component.title}
                    href={component.href}
                    icon={Image}
                  >
                    {component.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
};

export default UserNavigationMenu;

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string;
  icon: LucideIcon; // Define the prop type for the icon
}

const ListItem = forwardRef<HTMLAnchorElement, ListItemProps>(
  ({ className, title, icon: Icon, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              className
            )}
            {...props}
          >
            <div className="flex items-center space-x-1">
              {" "}
              <Icon className="w-5 h-5" />
              <div className="text-sm font-medium leading-none">{title}</div>
            </div>

            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {children}
            </p>
          </a>
        </NavigationMenuLink>
      </li>
    );
  }
);
ListItem.displayName = "ListItem";
