import { createFileRoute } from "@tanstack/react-router";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * The landing page.
 */
export const Route = createFileRoute("/")({
  component: IndexPage,
});

// 🧩 Component

/**
 * Renders the landing page's heading.
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
      <h1>CaelundasWeb</h1>
    </section>
  );
}
