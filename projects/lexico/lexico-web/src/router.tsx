import { createRouter, type Router } from "@tanstack/react-router";

import { routeTree } from "./lib/routeTree.gen";

/**
 * Creates and configures the application router.
 *
 * @returns Configured TanStack Router instance.
 */
export function getRouter(): Router<typeof routeTree> {
  const router = createRouter({
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  });

  return router;
}

declare module "@tanstack/react-router" {
  /**
   * Register.
   */
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
