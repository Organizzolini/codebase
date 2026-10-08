import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import applicationCss from "../styles/application.css?url";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * The document shell every other route renders inside.
 */
export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [{ href: applicationCss, rel: "stylesheet" }],
    meta: [
      { charSet: "utf8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "MeanderawWeb" },
    ],
  }),
});

// 🧩 Component

/**
 * Renders the HTML document around the matched route.
 */
function RootComponent(): ReactNode {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <main>
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  );
}
