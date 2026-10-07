import type { ReactNode } from "react";

// 🔖 Type

/**
 * TODO: Document the properties {{namePascalCase}} accepts.
 */
export interface {{namePascalCase}}Properties {
  className?: string;
}

// 🧩 Component

/**
 * TODO: Document what {{namePascalCase}} renders.
 */
export function {{namePascalCase}}(
  properties: Readonly<{{namePascalCase}}Properties>,
): ReactNode {
  const { className } = properties;

  // 🪝 Hooks

  // 🏗 Setup

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <div
      className={className}
      data-testid="{{nameKebabCase}}"
    >
      {{namePascalCase}}
    </div>
  );
}
