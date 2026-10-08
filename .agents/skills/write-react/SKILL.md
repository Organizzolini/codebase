---
name: write-react
description: React coding conventions for this codebase. Use when writing or reviewing React components, when asked about component structure, section ordering, Tailwind CSS usage, state management patterns, conditional rendering, list rendering, or React 19 conventions. Covers the conformetry generators for components, hooks, routes, and server functions, component section layout (🔖🧩🪝🏗💪♻️🏁🎨), Tailwind CSS with theme tokens, TanStack Start routes, loaders, and server functions, components-web usage, and testing with Vitest + RTL.
license: MIT
---

# Write React

All projects use **React 19** with the new JSX transform, so nothing imports
`React` itself. Import `ReactNode` as a type for return annotations.

## Scaffold, Then Fill In

Every shape below has a conformetry generator, and the generator's template is
also the standard the file is validated against. Generate rather than writing
the file by hand:

| Shape | Generator | Lands in |
| ----- | --------- | -------- |
| Component | `nx g conformetry:react-component --name=user-card --project=<project>` | `src/components/user-card.tsx` |
| Hook | `nx g conformetry:react-hook --name=use-user --project=<project>` | `src/hooks/use-user.ts` |
| Route | `nx g conformetry:tanstack-route --name=word.$id --path=/word/$id --project=<project>` | `src/routes/word.$id.tsx` |
| Server functions | `nx g conformetry:tanstack-server-function --name=bookmarks --project=<project>` | `src/modules/bookmarks/` |
| Application | `nx g conformetry:tanstack-application --name=<name> --directory=projects` | `projects/<name>/` |

A template is the standard its instances are validated against, bodies
included: every declaration, statement, and section comment it writes must
still be in the file afterwards, in order. Add to a generated file freely;
removing or renaming what the template wrote is what fails validation.

## Component Structure

A component lives in a kebab-case file and is a function declaration taking
`properties`. Mark its sections **in this order**, keeping a marker even when
its section is empty:

| Section | Emoji | Contents |
| ------- | ----- | -------- |
| Type | 🔖 | The `<Name>Properties` interface |
| Component | 🧩 | The component declaration |
| Hooks | 🪝 | `useState`, `useEffect`, custom hooks |
| Setup | 🏗 | Computed values, memoized callbacks |
| Handlers | 💪 | Event handlers |
| Lifecycle | ♻️ | `useEffect` and other effects |
| Early Returns | 🏁 | Loading and error states |
| Markup | 🎨 | The JSX return |

```typescript
// src/components/user-card.tsx
import { useEffect, useState } from "react";

import type { ReactNode } from "react";

// 🔖 Type

/**
 * Properties for the UserCard component.
 */
export interface UserCardProperties {
  className?: string;
  userId: string;
}

// 🧩 Component

/**
 * Shows one user's name with a way to refresh it.
 */
export function UserCard(properties: Readonly<UserCardProperties>): ReactNode {
  const { className, userId } = properties;

  // 🪝 Hooks
  const [user, setUser] = useState<null | User>(null);

  useEffect(() => {
    void fetchUser(userId).then(setUser);
  }, [userId]);

  // 🏗 Setup
  const displayName = user?.name ?? "Unknown User";

  // 💪 Handlers
  const handleRefresh = (): void => {
    void fetchUser(userId).then(setUser);
  };

  // ♻️ Lifecycle

  // 🏁 Early Returns
  if (!user) return <Spinner />;

  // 🎨 Markup
  return (
    <div
      className={className}
      data-testid="user-card"
    >
      <h2>{displayName}</h2>
      <Button onClick={handleRefresh}>Refresh</Button>
    </div>
  );
}
```

A component's root is a `<div>` that receives `className` and a
`data-testid` of its own kebab-case name, so a test can always find it.

A hook follows the same layout under a `// 🧩 Hook` marker, with 🪝 Hooks,
🏗 Setup, 💪 Handlers, ♻️ Lifecycle, and 🎁 Result inside it, its state held in `value`.
Its name carries the `use-` prefix, so `use-user.ts` exports `useUser`.

## components-web

All UI components come from the shared component library. **Never duplicate UI code.**

```typescript
// ✅ CORRECT
import { Button, Card, Input, Label, cn } from "@codebase/components-web";

// ❌ WRONG: Copying component code into lexico
```

Never modify files in `projects/components-web/src/components/ui/` (shadcn-generated). Compose custom components in `projects/components-web/src/components/` instead.

## Styling with Tailwind CSS

### Utility-First CSS

```typescript
// ✅ CORRECT: Tailwind utility classes
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-md">

// ❌ AVOID: Inline styles
<div style={{ display: "flex", padding: "1rem" }}>
```

### Theme Tokens

Use CSS variables for themed colors to support dark mode:

```typescript
// ✅ CORRECT: Theme-aware classes
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// ❌ AVOID: Hardcoded colors (breaks dark mode)
<button className="bg-blue-600 text-white">
```

### Conditional Classes with `cn()`

```typescript
import { cn } from "@codebase/components-web";

<button
  className={cn(
    "rounded font-medium transition-colors",
    { "bg-primary text-primary-foreground": variant === "primary" },
    { "px-4 py-2": size === "md" },
    className,
  )}
>
```

## TanStack Start Routes

Routes are files in `src/routes/`, named the way TanStack Router names them:
`index.tsx` serves `/`, `word.$id.tsx` serves `/word/$id`. A route file holds
its `Route` under a `// 🧭 Route` marker and the page it renders. Reusable
pieces belong in `src/components/`, stateful logic in `src/hooks/`, and
anything that runs on the server in `src/modules/`.

```typescript
// src/routes/word.$id.tsx
import { createFileRoute } from "@tanstack/react-router";

import { getWord } from "../modules/words/words.functions";

import type { ReactNode } from "react";

// 🧭 Route

/**
 * One dictionary entry.
 */
export const Route = createFileRoute("/word/$id")({
  component: WordIdPage,
  loader: ({ params: parameters }) => {
    return getWord({ data: { id: parameters.id } });
  },
});

// 🧩 Component

/**
 * Renders the entry the loader read.
 */
function WordIdPage(): ReactNode {
  // 🪝 Hooks
  const word = Route.useLoaderData();

  // 🏗 Setup

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <section>
      <h1>{word.text}</h1>
    </section>
  );
}
```

The page is named after the route file — `word.$id` renders `WordIdPage` — and
is a `<section>` whose first heading is an `<h1>`, because the application's
root layout already owns the `<main>`.

There are no separate loader or action files. Reads are GET server functions
called from a route's `loader`. Writes are POST server functions called from a
component through `useServerFn`, followed by `router.invalidate()`. A server
function module keeps its logic in `<feature>.utilities.ts`, outside
`createServerFn`, so the logic is unit tested without the Start runtime.

## State Management

| Scenario | Pattern |
| -------- | ------- |
| Component-local state | `useState` |
| Server/fetched data | TanStack Router loaders |
| Expensive computations | `useMemo` |
| Stable callbacks | `useCallback` |

## Common Patterns

### Conditional Rendering

```typescript
// Short-circuit with &&
{isLoggedIn && <UserMenu />}

// Ternary for if-else
{isLoading ? <Spinner /> : <Content />}

// Nullish coalescing for defaults
{user?.name ?? "Guest"}
```

### List Rendering

```typescript
// ✅ CORRECT: Stable key from data ID
{users.map((user) => <UserCard key={user.id} user={user} />)}

// ❌ WRONG: Index as key (unstable on reorder/insert)
{users.map((user, index) => <UserCard key={index} user={user} />)}
```

### Event Handlers

```typescript
// ✅ Arrow function for parameterized handlers
<button onClick={() => handleClick(user.id)}>Click</button>

// ❌ AVOID: bind() in render (new function every render)
<button onClick={handleClick.bind(null, user.id)}>Click</button>
```

## Testing React Components

Use Vitest and React Testing Library, beside the file under test:

| File | Test | Shape |
| ---- | ---- | ----- |
| `user-card.tsx` | `user-card.unit.test.tsx` | `describe(UserCard, …)`, rendering with `render` |
| `use-user.ts` | `use-user.unit.test.ts` | `describe(useUser, …)`, rendering with `renderHook` |
| `word.$id.tsx` | `word.$id.integration.test.tsx` | `describe("word.$id", …)`, rendering with `renderRoute` |

`renderRoute` comes from a generated application's `testing/render-route.tsx`:
it loads the real route tree in a memory-history router, so the route's loader,
head, and page all run. That is why a route test is an integration test. The
distinct suffix is also what keeps a route's files from fitting the component
template when conformance is checked.

```typescript
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserCard } from "./user-card";

describe(UserCard, () => {
  it("applies its class name", () => {
    const { container } = render(<UserCard className="card" userId="1" />);

    expect(container.firstElementChild?.className).toBe("card");
  });
});
```
