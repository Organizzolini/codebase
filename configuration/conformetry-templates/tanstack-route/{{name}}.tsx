{{! The name is the route file's own stem — index, search, word.$id — so it is used raw rather than cased. The route's URL path is the `path` input when generating and is inferred from each route's own files when validating. }}
import { createFileRoute } from "@tanstack/react-router";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * TODO: Document what the {{name}} route serves.
 */
export const Route = createFileRoute("{{path}}")({
  component: {{namePascalCase}}Page,
});

// 🧩 Component

/**
 * TODO: Document what the {{name}} page renders.
 */
function {{namePascalCase}}Page(): ReactNode {
  // 🪝 Hooks

  // 🏗 Setup

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <section>
      <h1>{{namePascalCase}}</h1>
    </section>
  );
}
