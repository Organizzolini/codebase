import {
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";

import { getRouter } from "../src/router";

// The real root renders a whole `<html>` document, which cannot mount inside
// the `<div>` a test renders into, so routes are rendered under a bare root.
vi.mock(import("../src/routes/__root"), async () => {
  const { createRootRoute } = await import("@tanstack/react-router");

  return { Route: createRootRoute() };
});

/**
 * Renders the application's router at a path, running that route's loader and
 * head the way a navigation would.
 */
export async function renderRoute(path: string): Promise<void> {
  const router = getRouter();

  router.update({
    ...router.options,
    history: createMemoryHistory({ initialEntries: [path] }),
    scrollRestoration: false,
  });
  await router.load();

  render(<RouterProvider router={router} />);
}
