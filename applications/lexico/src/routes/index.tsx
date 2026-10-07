import { createFileRoute, redirect } from "@tanstack/react-router";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * The landing path, which redirects to search.
 */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Redirect home to search page
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router expects redirect to be thrown
    throw redirect({ to: "/search" });
  },
  component: IndexPage,
});

// 🧩 Component

/**
 * The landing page, shown only for as long as the redirect to search takes.
 */
function IndexPage(): ReactNode {
  // 🪝 Hooks

  // 🏗 Setup

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <section>
      <h1>Lexico</h1>
    </section>
  );
}
