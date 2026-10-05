import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useMatches,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Bookmark, BookOpen, Info, Search, User, Wrench } from "lucide-react";
import { useState } from "react";

import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@codebase/components-web";
import applicationCss from "@codebase/components-web/styles/globals.css?url";

import { Logo } from "../components/layout";
import { getCurrentUser } from "../lib/auth";

import type { ReactNode } from "react";

/**
 * Navigation item.
 */
interface NavigationItem {
  href: string;
  icon: ReactNode;
  label: string;
}

const navigationItems: NavigationItem[] = [
  { href: "/search", icon: <Search className="h-5 w-5" />, label: "Search" },
  {
    href: "/bookmarks",
    icon: <Bookmark className="h-5 w-5" />,
    label: "Bookmarks",
  },
  {
    href: "/library",
    icon: <BookOpen className="h-5 w-5" />,
    label: "Literature",
  },
  { href: "/tools", icon: <Wrench className="h-5 w-5" />, label: "Grammar" },
  { href: "/settings", icon: <User className="h-5 w-5" />, label: "User" },
  { href: "/about", icon: <Info className="h-5 w-5" />, label: "About" },
];

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    return { user };
  },
  component: RootComponent,
  head: () => ({
    links: [
      { href: "/favicon.ico", rel: "icon" },
      { href: applicationCss, rel: "stylesheet" },
    ],
    meta: [
      {
        charSet: "utf8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Lexico - Latin Dictionary & Reader",
      },
      {
        content:
          "Lexico is a Latin dictionary and reader application for students and scholars.",
        name: "description",
      },
    ],
  }),
  notFoundComponent: NotFound,
});

/**
 * Properties for the ApplicationSidebar component.
 */
interface ApplicationSidebarProperties {
  /** Callback when hover state changes */
  onHoverChange: (hovered: boolean) => void;
}

/**
 * Properties for the RootDocument component.
 */
interface RootDocumentProperties {
  /** Child elements to render */
  children: ReactNode;
}

/**
 * Application sidebar component with navigation items.
 *
 */
function ApplicationSidebar(
  properties: Readonly<ApplicationSidebarProperties>,
): ReactNode {
  const { onHoverChange } = properties;
  const matches = useMatches();
  const currentPath = matches.at(-1)?.pathname ?? "/";
  const { isMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => !isMobile && onHoverChange(true)}
      onMouseLeave={() => !isMobile && onHoverChange(false)}
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          className="flex h-8 items-center gap-2 text-lg font-semibold text-sidebar-foreground transition-colors hover:text-sidebar-accent-foreground cursor-pointer"
          to="/"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#66023C]">
            <Logo width={18} />
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            Lexico
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const isActive =
                currentPath === item.href ||
                (item.href === "/search" && currentPath === "/");
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    asChild
                  >
                    <Link to={item.href}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * 404 Not Found page component.
 *
 */
function NotFound(): ReactNode {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
      <Button
        className="mt-4"
        asChild
      >
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  );
}

/**
 * Root component that wraps the entire application.
 *
 */
function RootComponent(): ReactNode {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

/**
 * Root document component that provides HTML structure and sidebar.
 *
 */
function RootDocument(properties: Readonly<RootDocumentProperties>): ReactNode {
  const { children } = properties;
  const [open, setOpen] = useState(false);

  return (
    <html
      className="dark"
      lang="en"
    >
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SidebarProvider
          onOpenChange={setOpen}
          open={open}
        >
          <ApplicationSidebar onHoverChange={setOpen} />
          <SidebarInset>
            {/* Mobile header with hamburger */}
            <header className="flex h-14 items-center border-b border-border bg-card px-4 md:hidden">
              <SidebarTrigger />
              <span className="ml-3 text-lg font-semibold">Lexico</span>
            </header>
            {/* Page content */}
            <div className="flex-1 px-4 py-8 md:px-8">{children}</div>
          </SidebarInset>
        </SidebarProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
