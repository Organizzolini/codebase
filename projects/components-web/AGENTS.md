# Lexico Components: Shared React Component Library

## Quick Start

**Type**: Shared UI component library (shadcn/ui + Radix UI)

**Purpose**: Single source of UI primitives and shared components for the codebase

### Add a shadcn Component

```bash
cd projects/components-web
pnpx shadcn@latest add <component-name>
```

Then export it in [src/index.ts](src/index.ts).

## Architecture Overview

### Component Ownership Model

- **`src/components/ui/`**: **Never modify** (shadcn-generated)
- **`src/components/`**: Custom components (safe to edit)
- **`src/hooks/`**: Shared hooks
- **`src/lib/`**: Utilities (e.g., `cn()`)

**Rule**: Compose `ui/` primitives in `components/` instead of editing `ui/` files directly.

### Theming Strategy

- Tailwind CSS + CSS variables
- Light/dark mode via `data-theme`
- Tokens in [src/styles/globals.css](src/styles/globals.css)

See the [write-react skill](../../.agents/skills/write-react/SKILL.md) for theming patterns.

## Usage in Apps

```tsx
import { Button, Card, Input } from "@codebase/components-web";
```

Never duplicate UI code in apps. Always import from this package.

## Development

### Add Custom Components

```bash
cd projects/components-web/src/components
touch word-card.tsx
```

### Export Components

```ts
// src/index.ts
export * from "./components/word-card";
```

## Troubleshooting

- **shadcn updates overwriting `ui/` files** — never edit `src/components/ui/` directly; compose those primitives in `src/components/` instead, so `pnpx shadcn@latest add <component>` stays safe to re-run.
- **Theme tokens not updating** — CSS variables in [src/styles/globals.css](src/styles/globals.css) must be bare HSL values (`--primary: 0 0% 9%`), not `hsl(...)` wrapped. Clear `node_modules/.vite` and restart the dev server after changing them.

## Key Files

- [src/components/ui/](src/components/ui/): shadcn-generated components
- [src/components/](src/components/): custom components
- [src/hooks/](src/hooks/): shared hooks
- [src/lib/utils.ts](src/lib/utils.ts): `cn()` utility
- [src/styles/globals.css](src/styles/globals.css): theme tokens
- [components.json](components.json): shadcn configuration
