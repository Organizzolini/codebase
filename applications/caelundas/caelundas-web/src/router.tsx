import { createRouter, type Router } from "@tanstack/react-router";

import { routeTree } from "./lib/routeTree.gen";

/**
 * Creates the application router, which TanStack Start calls once per request
 * on the server and once on the client.
 */
export function getRouter(): Router<typeof routeTree> {
  return createRouter({
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  /**
   * Registers this application's router, so links and hooks are typed against
   * its route tree.
   */
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
