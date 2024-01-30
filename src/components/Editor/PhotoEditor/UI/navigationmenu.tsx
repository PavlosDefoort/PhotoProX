import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "../../../../../app/authcontext";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "../../../../../app/firebase";
import DrawerDemo from "./imagedrawer";

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

export function AlertDialogDemo() {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // User is signed out
      localStorage.removeItem("welcome");
      // refresh the page to clear the state of the app
      window.location.href = "/";
    } catch (error) {
      // Handle errors
      console.error("Error signing out:", error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="flex flex-row items-center justify-center w-full bg-red-300 hover:bg-red-400">
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
          <AlertDialogCancel className="dark:bg-white dark:hover:bg-red-300 hover:text-black">
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

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Alert Dialog",
    href: "/docs/primitives/alert-dialog",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
  },
  {
    title: "Hover Card",
    href: "/docs/primitives/hover-card",
    description:
      "For sighted users to preview content available behind a link.",
  },
  {
    title: "Progress",
    href: "/docs/primitives/progress",
    description:
      "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
  },
  {
    title: "Scroll-area",
    href: "/docs/primitives/scroll-area",
    description: "Visually or semantically separates content.",
  },
  {
    title: "Tabs",
    href: "/docs/primitives/tabs",
    description:
      "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
  },
  {
    title: "Tooltip",
    href: "/docs/primitives/tooltip",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
];

export function NavigationMenuDemo() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <DrawerDemo open={open} setOpen={setOpen} />
      <NavigationMenu className="bg-navbarBackground dark:bg-navbarBackground w-20 h-7">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-navbarBackground dark:bg-navbarBackground">
              <div className="flex flex-row items-center justify-center bg-navbarBackground dark:bg-navbarBackground">
                <Avatar className="w-8 h-8 ml-1 mr-2">
                  {user && <AvatarImage src={user.photoURL!} />}
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                {/* <button className="text-sm pl-2" onClick={handleSignOut}>
                Sign Out
              </button> */}
              </div>
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
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
                        Beautifully designed modern web editor for photos.
                      </p>
                    </Link>
                  </NavigationMenuLink>
                </li>

                <ListItem href="/docs" title="Profile Settings">
                  Adjust your profile settings.
                </ListItem>
                <ListItem href="/docs/installation" title="Projects">
                  Manage your projects.
                </ListItem>
                <ListItem title="Photos" onClick={() => setOpen(true)}>
                  Upload photos to use in your projects.
                </ListItem>
                <AlertDialogDemo />
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          {/* <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/docs" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Documentation
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem> */}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
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
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
