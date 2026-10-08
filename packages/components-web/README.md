# 🎨 Lexico Components

**Shared React component library built on shadcn/ui and Radix UI primitives.**

A collection of accessible, customizable UI components for the codebase, providing a consistent design system across applications. Built with Tailwind CSS, TypeScript, and shadcn/ui (New York style).

The interface half of the [Lexico](../../applications/lexico/lexico-web/README.md) suite:

| Project | Role |
| ------- | ---- |
| 🐺 [lexico-web](../../applications/lexico/lexico-web/README.md) | The SSR web application |
| 🎨 [components-web](README.md) | This package — shared React components |
| 📖 [lexico-entities](../lexico-entities/README.md) | TypeORM entities and migrations |
| 🚰 [lexico-cli](../../applications/lexico/lexico-cli/README.md) | Dictionary and literature ingestion |

## Features

- **50+ UI Components**: Buttons, cards, forms, dialogs, navigation, feedback, and more
- **Accessible**: WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- **Themeable**: CSS variables for light/dark mode, customizable colors
- **Type-Safe**: Full TypeScript support with strict mode
- **Tree-Shakeable**: Only bundle components you actually use
- **Radix UI Primitives**: Built on high-quality, unstyled component primitives

## Quick Start

### Installation

This package is already available in the codebase via workspace protocol. Import from consuming applications:

```tsx
// In applications/lexico/lexico-web/src/routes/example.tsx
import { Button, Card, Input } from "@codebase/components-web";
import "@codebase/components-web/styles/globals.css"; // Import once in root layout

function ExamplePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Enter text..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

### Import Styles

Add global CSS import to your root layout:

```tsx
// applications/lexico/lexico-web/src/routes/__root.tsx
import "@codebase/components-web/styles/globals.css";
```

## Component Categories

### Layout & Structure

- **Card**: Content containers with header, content, footer sections
- **Separator**: Divider lines for visual separation
- **Accordion**: Collapsible content sections
- **Tabs**: Tabbed navigation and content
- **Sidebar**: Navigation sidebar with collapsible sections
- **Resizable**: Resizable panel layouts

### Form Controls

- **Input**: Text input field
- **Textarea**: Multi-line text input
- **Select**: Dropdown selection menu
- **Checkbox**: Boolean selection control
- **Radio Group**: Single selection from multiple options
- **Switch**: Toggle control for binary states
- **Slider**: Range selection control
- **Label**: Form field labels with accessibility

### Buttons & Navigation

- **Button**: Primary action buttons with variants
- **Button Group**: Grouped button controls
- **Navigation Menu**: Multi-level navigation menus
- **Breadcrumb**: Hierarchical path display
- **Dropdown Menu**: Context menus with actions
- **Command**: Cmd+K style command palette

### Feedback & Status

- **Badge**: Status indicators and labels
- **Spinner**: Loading indicator
- **Skeleton**: Loading placeholder animation
- **Progress**: Progress bar indicator
- **Alert**: Informational messages
- **Toast (Sonner)**: Temporary notification messages

### Overlays & Dialogs

- **Dialog**: Modal dialogs
- **Sheet**: Slide-over panels
- **Drawer**: Mobile-friendly bottom sheets
- **Popover**: Floating content containers
- **Tooltip**: Hover hints and descriptions
- **Hover Card**: Rich hover previews

## Adding Components

### Add from shadcn Registry

```bash
# Navigate to package directory
cd packages/components-web

# Add component
pnpx shadcn@latest add <component-name>

# Examples
pnpx shadcn@latest add dropdown-menu
pnpx shadcn@latest add command
pnpx shadcn@latest add sonner
```

### Export in Index

After adding a component, export it in [src/index.ts](src/index.ts):

```typescript
export * from "./components/ui/dropdown-menu";
```

### Create Custom Components

For project-specific components, create in `src/components/` (not `ui/`):

```tsx
// src/components/word-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface WordCardProps {
  word: string;
  definition: string;
}

export function WordCard({ word, definition }: WordCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{word}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{definition}</p>
      </CardContent>
    </Card>
  );
}
```

**⚠️ Important**: Never modify files in `src/components/ui/` directly - they are managed by shadcn CLI and will be overwritten on updates.

## Theming

### CSS Variables

Customize colors by editing [src/styles/globals.css](src/styles/globals.css):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  /* ... more colors */
}

[data-theme="dark"] {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode colors */
}
```

### Using Theme Colors

```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Button
  </button>
</div>
```

### Dark Mode

Set `data-theme` attribute on root element:

```tsx
document.documentElement.setAttribute("data-theme", "dark");
```

Or use next-themes for automatic theme switching:

```tsx
import { ThemeProvider } from "next-themes";

<ThemeProvider
  attribute="data-theme"
  defaultTheme="system"
>
  {children}
</ThemeProvider>;
```

## Development

### Build Library

```bash
nx run components-web:build
```

### Type Checking

```bash
nx run components-web:typecheck
```

### Type Coverage

```bash
nx run components-web:type-coverage
# Target: 99.84%
```

### Bundle Size Analysis

```bash
nx run components-web:codometer
# Limit: 512 KB gzipped, warning at 384 KB
```

The 512 KB limit is a ratchet against the measured size, not a design target — the Vite library build bundles React and Radix into the output rather than externalizing them, even though React is a `peerDependency`. See `codometer.config.ts` for the full note.

## Usage Examples

### Button Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

### Form with Validation

```tsx
import { Input, Label, Button } from "@codebase/components-web";

function LoginForm() {
  return (
    <form>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
        />
      </div>
      <Button type="submit">Sign In</Button>
    </form>
  );
}
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
} from "@codebase/components-web";

function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
        </DialogHeader>
        <p>This action cannot be undone.</p>
        <Button>Confirm</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from "@codebase/components-web";

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Configuration

### shadcn Config ([components.json](components.json))

```json
{
  "style": "new-york",
  "tailwind": {
    "baseColor": "gray",
    "cssVariables": true
  },
  "iconLibrary": "lucide"
}
```

### Tailwind Config ([tailwind.config.cjs](tailwind.config.cjs))

Extends shared Tailwind configuration with component-specific patterns:

```js
content: [
  "./src/**/*.{ts,tsx}",
  "../../packages/components-web/src/**/*.{ts,tsx}",
];
```

## Accessibility

All components follow WCAG 2.1 Level AA standards:

- ✅ Keyboard navigation (Tab, Enter, Space, Arrow keys)
- ✅ Focus management (visible focus indicators)
- ✅ ARIA attributes (screen reader announcements)
- ✅ Color contrast (4.5:1 for text, 3:1 for UI)

Built on Radix UI primitives which handle complex accessibility patterns automatically:

- Focus trapping in dialogs
- Roving focus in menus
- Screen reader announcements
- Keyboard shortcuts

## Troubleshooting

### Styles Not Applied

Import global CSS in your root layout:

```tsx
import "@codebase/components-web/styles/globals.css";
```

### Import Errors

Verify TypeScript path mapping in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@codebase/components-web": [
        "../../packages/components-web/src/index.ts"
      ]
    }
  }
}
```

### Dark Mode Not Working

Set `data-theme` attribute on `<html>` or use ThemeProvider.

## Documentation

For detailed architecture, component patterns, and development workflows:

- **[AGENTS.md](AGENTS.md)**: Complete architectural documentation
- **[Main AGENTS.md](../../AGENTS.md)**: Codebase architecture and Nx workflows
- **[lexico-web](../../applications/lexico/lexico-web/README.md)**: The application these components build

External resources:

- [shadcn/ui Documentation](https://ui.shadcn.com/docs): Component reference and CLI
- [Radix UI Documentation](https://www.radix-ui.com/primitives): Primitive APIs
- [Tailwind CSS Documentation](https://tailwindcss.com/docs): Utility classes

## License

See [LICENSE](../../LICENSE) for licensing information.

<!-- callidescope:start -->

## 🔭 Callidescope

Call stacks traced through `packages/components-web`, deepest first. Each frame shows what it takes, what it returns, and what its documentation says.

| Measure | Value |
| --- | --- |
| Callables | 278 |
| Files | 62 |
| Calls traced | 304 |
| Call stacks | 219 |
| Deepest stack | 3 |
| Stacks through recursion | 0 |
| Unfollowable calls | 16 |

### Limits

What this project is judged against, as declared in its own `callidescope.config.ts`.

| Limit | Value |
| --- | --- |
| `maximumDepth` | 3 |
| `maximumBreadth` | 7 |

### Call stacks (depth)

**1. `ChartStyle`** — depth 3 · orphan-root

```text
🚀 ChartStyle(…): Element | null [packages/components-web/src/components/ui/chart.tsx:69]
  └─> map(…)([theme, prefix]: [string, "" | ".dark"]): string [packages/components-web/src/components/ui/chart.tsx:89]
    └─> map(…)(…): string | null [packages/components-web/src/components/ui/chart.tsx:92]
```

**2. `forwardRef(…)`** — depth ≥ 3 · orphan-root

```text
🚀 forwardRef(…)(…): Element | null [packages/components-web/src/components/ui/chart.tsx:138]
  └─> useMemo(…)(): React.JSX.Element | null [packages/components-web/src/components/ui/chart.tsx:158]
    └─> getPayloadConfigurationFromPayload(…): { label?: ReactNode; icon?: ComponentType<{}>; } | undefined [packages/components-web/src/components/ui/chart.tsx:359]
```

**3. `forwardRef(…)`** — depth 3 · orphan-root

```text
🚀 forwardRef(…)(…): Element | null [packages/components-web/src/components/ui/chart.tsx:302]
  └─> map(…)(item: PayloadItem, index: number): React.JSX.Element [packages/components-web/src/components/ui/chart.tsx:323]
    └─> getPayloadConfigurationFromPayload(…): { label?: ReactNode; icon?: ComponentType<{}>; } | undefined [packages/components-web/src/components/ui/chart.tsx:359]
```

<details>
<summary>216 more call stacks</summary>

**4. `FieldError`** — depth 3 · orphan-root

```text
🚀 FieldError(…): Element | null [packages/components-web/src/components/ui/field.tsx:187]
  └─> useMemo(…)(…): string | number | bigint | true | Iterable<ReactNode> | Promise<AwaitedReactNode> | Element | null [packages/components-web/src/components/ui/field.tsx:195]
    └─> map(…)(…): "" | Element | undefined [packages/components-web/src/components/ui/field.tsx:211]
```

**5. `forwardRef(…)`** — depth ≥ 3 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:63]
  └─> useIsMobile(): boolean [packages/components-web/src/hooks/use-mobile.tsx:5]
    └─> useEffect(…)(): () => void [packages/components-web/src/hooks/use-mobile.tsx:8]
```

**6. `useBreakpoint`** — depth ≥ 3 · orphan-root

```text
🚀 useBreakpoint(…): { isSm: boolean; isMd: boolean; isLg: boolean; isXl: boolean; is2xl: boolean; } [packages/components-web/src/hooks/use-media-query.ts:62]
   ↳ Hook to check if viewport is at or above a Tailwind breakpoint
  └─> useMediaQuery(query: string): boolean [packages/components-web/src/hooks/use-media-query.ts:16]
     ↳ A hook that returns whether a media query matches the current viewport.
    └─> useEffect(…)(): () => void [packages/components-web/src/hooks/use-media-query.ts:19]
```

**7. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/accordion.tsx:13]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**8. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/accordion.tsx:25]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**9. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/accordion.tsx:45]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**10. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert.tsx:26]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**11. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert.tsx:39]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**12. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert.tsx:51]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**13. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/button.tsx:45]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**14. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:17]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**15. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:32]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**16. `AlertDialogHeader`** — depth 2 · orphan-root

```text
🚀 AlertDialogHeader(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:47]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**17. `AlertDialogFooter`** — depth 2 · orphan-root

```text
🚀 AlertDialogFooter(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:61]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**18. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:78]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**19. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:90]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**20. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:103]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**21. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/alert-dialog.tsx:115]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**22. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/avatar.tsx:12]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**23. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/avatar.tsx:27]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**24. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/avatar.tsx:39]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**25. `Badge`** — depth 2 · orphan-root

```text
🚀 Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element [packages/components-web/src/components/ui/badge.tsx:31]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**26. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/breadcrumb.tsx:19]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**27. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/breadcrumb.tsx:34]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**28. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/breadcrumb.tsx:48]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**29. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/breadcrumb.tsx:64]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**30. `BreadcrumbSeparator`** — depth 2 · orphan-root

```text
🚀 BreadcrumbSeparator(…): Element [packages/components-web/src/components/ui/breadcrumb.tsx:76]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**31. `BreadcrumbEllipsis`** — depth 2 · orphan-root

```text
🚀 BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">): React.JSX.Element [packages/components-web/src/components/ui/breadcrumb.tsx:92]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**32. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/separator.tsx:11]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**33. `ButtonGroup`** — depth 2 · orphan-root

```text
🚀 ButtonGroup(…): Element [packages/components-web/src/components/ui/button-group.tsx:25]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**34. `ButtonGroupText`** — depth 2 · orphan-root

```text
🚀 ButtonGroupText(…): Element [packages/components-web/src/components/ui/button-group.tsx:41]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**35. `ButtonGroupSeparator`** — depth 2 · orphan-root

```text
🚀 ButtonGroupSeparator(…): Element [packages/components-web/src/components/ui/button-group.tsx:61]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**36. `Calendar`** — depth 2 · orphan-root

```text
🚀 Calendar(…): Element [packages/components-web/src/components/ui/calendar.tsx:15]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**37. `Root`** — depth 2 · orphan-root

```text
🚀 Root(…): Element [packages/components-web/src/components/ui/calendar.tsx:129]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**38. `Chevron`** — depth 2 · orphan-root

```text
🚀 Chevron(…): Element [packages/components-web/src/components/ui/calendar.tsx:139]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**39. `CalendarDayButton`** — depth 2 · orphan-root

```text
🚀 CalendarDayButton(…): Element [packages/components-web/src/components/ui/calendar.tsx:176]
  └─> useEffect(…)(): void [packages/components-web/src/components/ui/calendar.tsx:185]
```

**40. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/card.tsx:9]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**41. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/card.tsx:24]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**42. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/card.tsx:36]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**43. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/card.tsx:48]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**44. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/card.tsx:60]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**45. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/card.tsx:68]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**46. `forwardRef(…)`** — depth ≥ 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/carousel.tsx:48]
  └─> useCallback(…)(api: CarouselApi): void [packages/components-web/src/components/ui/carousel.tsx:70]
```

**47. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/carousel.tsx:155]
  └─> useCarousel(): CarouselContextProps [packages/components-web/src/components/ui/carousel.tsx:34]
```

**48. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/carousel.tsx:177]
  └─> useCarousel(): CarouselContextProps [packages/components-web/src/components/ui/carousel.tsx:34]
```

**49. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/carousel.tsx:199]
  └─> useCarousel(): CarouselContextProps [packages/components-web/src/components/ui/carousel.tsx:34]
```

**50. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/carousel.tsx:228]
  └─> useCarousel(): CarouselContextProps [packages/components-web/src/components/ui/carousel.tsx:34]
```

**51. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/chart.tsx:44]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**52. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/checkbox.tsx:11]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**53. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dialog.tsx:21]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**54. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dialog.tsx:36]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**55. `DialogHeader`** — depth 2 · orphan-root

```text
🚀 DialogHeader(…): Element [packages/components-web/src/components/ui/dialog.tsx:57]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**56. `DialogFooter`** — depth 2 · orphan-root

```text
🚀 DialogFooter(…): Element [packages/components-web/src/components/ui/dialog.tsx:71]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**57. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dialog.tsx:88]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**58. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dialog.tsx:103]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**59. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/command.tsx:15]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**60. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/command.tsx:42]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**61. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/command.tsx:61]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**62. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/command.tsx:87]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**63. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/command.tsx:103]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**64. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/command.tsx:115]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**65. `CommandShortcut`** — depth 2 · orphan-root

```text
🚀 CommandShortcut(…): Element [packages/components-web/src/components/ui/command.tsx:128]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**66. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:25]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**67. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:44]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**68. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:59]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**69. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:78]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**70. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:94]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**71. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:118]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**72. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:142]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**73. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/context-menu.tsx:158]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**74. `ContextMenuShortcut`** — depth 2 · orphan-root

```text
🚀 ContextMenuShortcut(…): Element [packages/components-web/src/components/ui/context-menu.tsx:167]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**75. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/drawer.tsx:27]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**76. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/drawer.tsx:39]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**77. `DrawerHeader`** — depth 2 · orphan-root

```text
🚀 DrawerHeader(…): Element [packages/components-web/src/components/ui/drawer.tsx:57]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**78. `DrawerFooter`** — depth 2 · orphan-root

```text
🚀 DrawerFooter(…): Element [packages/components-web/src/components/ui/drawer.tsx:68]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**79. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/drawer.tsx:82]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**80. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/drawer.tsx:97]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**81. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:27]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**82. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:47]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**83. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:63]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**84. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:84]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**85. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:100]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**86. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:124]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**87. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:148]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**88. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:164]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**89. `DropdownMenuShortcut`** — depth 2 · orphan-root

```text
🚀 DropdownMenuShortcut(…): Element [packages/components-web/src/components/ui/dropdown-menu.tsx:173]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**90. `Empty`** — depth 2 · orphan-root

```text
🚀 Empty({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/empty.tsx:6]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**91. `EmptyHeader`** — depth 2 · orphan-root

```text
🚀 EmptyHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/empty.tsx:19]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**92. `EmptyMedia`** — depth 2 · orphan-root

```text
🚀 EmptyMedia(…): Element [packages/components-web/src/components/ui/empty.tsx:47]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**93. `EmptyTitle`** — depth 2 · orphan-root

```text
🚀 EmptyTitle({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/empty.tsx:62]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**94. `EmptyDescription`** — depth 2 · orphan-root

```text
🚀 EmptyDescription({ className, ...props }: React.ComponentProps<"p">): React.JSX.Element [packages/components-web/src/components/ui/empty.tsx:72]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**95. `EmptyContent`** — depth 2 · orphan-root

```text
🚀 EmptyContent({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/empty.tsx:85]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**96. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/label.tsx:18]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**97. `FieldSet`** — depth 2 · orphan-root

```text
🚀 FieldSet({ className, ...props }: React.ComponentProps<"fieldset">): React.JSX.Element [packages/components-web/src/components/ui/field.tsx:11]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**98. `FieldLegend`** — depth 2 · orphan-root

```text
🚀 FieldLegend(…): Element [packages/components-web/src/components/ui/field.tsx:25]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**99. `FieldGroup`** — depth 2 · orphan-root

```text
🚀 FieldGroup({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/field.tsx:45]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**100. `Field`** — depth 2 · orphan-root

```text
🚀 Field(…): Element [packages/components-web/src/components/ui/field.tsx:82]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**101. `FieldContent`** — depth 2 · orphan-root

```text
🚀 FieldContent({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/field.tsx:98]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**102. `FieldLabel`** — depth 2 · orphan-root

```text
🚀 FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>): React.JSX.Element [packages/components-web/src/components/ui/field.tsx:111]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**103. `FieldTitle`** — depth 2 · orphan-root

```text
🚀 FieldTitle({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/field.tsx:129]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**104. `FieldDescription`** — depth 2 · orphan-root

```text
🚀 FieldDescription({ className, ...props }: React.ComponentProps<"p">): React.JSX.Element [packages/components-web/src/components/ui/field.tsx:142]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**105. `FieldSeparator`** — depth 2 · orphan-root

```text
🚀 FieldSeparator(…): Element [packages/components-web/src/components/ui/field.tsx:157]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**106. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/form.tsx:77]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**107. `forwardRef(…)`** — depth ≥ 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/form.tsx:91]
  └─> useFormField(…): { invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: FieldError; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; } [packages/components-web/src/components/ui/form.tsx:41]
```

**108. `forwardRef(…)`** — depth ≥ 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/form.tsx:108]
  └─> useFormField(…): { invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: FieldError; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; } [packages/components-web/src/components/ui/form.tsx:41]
```

**109. `forwardRef(…)`** — depth ≥ 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/form.tsx:130]
  └─> useFormField(…): { invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: FieldError; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; } [packages/components-web/src/components/ui/form.tsx:41]
```

**110. `forwardRef(…)`** — depth ≥ 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element | null [packages/components-web/src/components/ui/form.tsx:147]
  └─> useFormField(…): { invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: FieldError; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; } [packages/components-web/src/components/ui/form.tsx:41]
```

**111. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/hover-card.tsx:14]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**112. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/input.tsx:7]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**113. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/textarea.tsx:9]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**114. `InputGroup`** — depth 2 · orphan-root

```text
🚀 InputGroup({ className, ...properties }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/input-group.tsx:10]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**115. `InputGroupAddon`** — depth 2 · orphan-root

```text
🚀 InputGroupAddon(…): Element [packages/components-web/src/components/ui/input-group.tsx:57]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**116. `InputGroupButton`** — depth 2 · orphan-root

```text
🚀 InputGroupButton(…): Element [packages/components-web/src/components/ui/input-group.tsx:94]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**117. `InputGroupText`** — depth 2 · orphan-root

```text
🚀 InputGroupText({ className, ...properties }: React.ComponentProps<"span">): React.JSX.Element [packages/components-web/src/components/ui/input-group.tsx:113]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**118. `InputGroupInput`** — depth 2 · orphan-root

```text
🚀 InputGroupInput({ className, ...properties }: React.ComponentProps<"input">): React.JSX.Element [packages/components-web/src/components/ui/input-group.tsx:125]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**119. `InputGroupTextarea`** — depth 2 · orphan-root

```text
🚀 InputGroupTextarea(…): Element [packages/components-web/src/components/ui/input-group.tsx:138]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**120. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/input-otp.tsx:11]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**121. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/input-otp.tsx:27]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**122. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/input-otp.tsx:35]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**123. `ItemGroup`** — depth 2 · orphan-root

```text
🚀 ItemGroup({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:9]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**124. `ItemSeparator`** — depth 2 · orphan-root

```text
🚀 ItemSeparator(…): Element [packages/components-web/src/components/ui/item.tsx:20]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**125. `Item`** — depth 2 · orphan-root

```text
🚀 Item(…): Element [packages/components-web/src/components/ui/item.tsx:55]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**126. `ItemMedia`** — depth 2 · orphan-root

```text
🚀 ItemMedia(…): Element [packages/components-web/src/components/ui/item.tsx:92]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**127. `ItemContent`** — depth 2 · orphan-root

```text
🚀 ItemContent({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:107]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**128. `ItemTitle`** — depth 2 · orphan-root

```text
🚀 ItemTitle({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:120]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**129. `ItemDescription`** — depth 2 · orphan-root

```text
🚀 ItemDescription({ className, ...props }: React.ComponentProps<"p">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:133]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**130. `ItemActions`** — depth 2 · orphan-root

```text
🚀 ItemActions({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:147]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**131. `ItemHeader`** — depth 2 · orphan-root

```text
🚀 ItemHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:157]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**132. `ItemFooter`** — depth 2 · orphan-root

```text
🚀 ItemFooter({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/item.tsx:170]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**133. `Kbd`** — depth 2 · orphan-root

```text
🚀 Kbd({ className, ...props }: React.ComponentProps<"kbd">): React.JSX.Element [packages/components-web/src/components/ui/kbd.tsx:4]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**134. `KbdGroup`** — depth 2 · orphan-root

```text
🚀 KbdGroup({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element [packages/components-web/src/components/ui/kbd.tsx:19]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**135. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:41]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**136. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:56]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**137. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:73]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**138. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:92]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**139. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:108]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**140. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:134]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**141. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:150]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**142. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:173]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**143. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:197]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**144. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/menubar.tsx:213]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**145. `MenubarShortcut`** — depth 2 · orphan-root

```text
🚀 MenubarShortcut(…): Element [packages/components-web/src/components/ui/menubar.tsx:222]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**146. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/navigation-menu.tsx:12]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**147. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/navigation-menu.tsx:30]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**148. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/navigation-menu.tsx:51]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**149. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/navigation-menu.tsx:69]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**150. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/navigation-menu.tsx:86]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**151. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/navigation-menu.tsx:104]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**152. `Pagination`** — depth 2 · orphan-root

```text
🚀 Pagination({ className, ...props }: React.ComponentProps<"nav">): React.JSX.Element [packages/components-web/src/components/ui/pagination.tsx:8]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**153. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/pagination.tsx:21]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**154. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/pagination.tsx:33]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**155. `PaginationLink`** — depth 2 · orphan-root

```text
🚀 PaginationLink(…): Element [packages/components-web/src/components/ui/pagination.tsx:43]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**156. `PaginationPrevious`** — depth 2 · orphan-root

```text
🚀 PaginationPrevious(…): Element [packages/components-web/src/components/ui/pagination.tsx:63]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**157. `PaginationNext`** — depth 2 · orphan-root

```text
🚀 PaginationNext(…): Element [packages/components-web/src/components/ui/pagination.tsx:79]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**158. `PaginationEllipsis`** — depth 2 · orphan-root

```text
🚀 PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">): React.JSX.Element [packages/components-web/src/components/ui/pagination.tsx:95]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**159. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/popover.tsx:16]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**160. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/progress.tsx:12]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**161. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/radio-group.tsx:11]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**162. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/radio-group.tsx:25]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**163. `ResizablePanelGroup`** — depth 2 · orphan-root

```text
🚀 ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof Group>): React.JSX.Element [packages/components-web/src/components/ui/resizable.tsx:9]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**164. `ResizableHandle`** — depth 2 · orphan-root

```text
🚀 ResizableHandle(…): Element [packages/components-web/src/components/ui/resizable.tsx:24]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**165. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/scroll-area.tsx:10]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**166. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/scroll-area.tsx:28]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**167. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:19]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**168. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:39]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**169. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:56]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**170. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:74]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**171. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:106]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**172. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:118]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**173. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/select.tsx:140]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**174. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sheet.tsx:22]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**175. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sheet.tsx:60]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**176. `SheetHeader`** — depth 2 · orphan-root

```text
🚀 SheetHeader(…): Element [packages/components-web/src/components/ui/sheet.tsx:78]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**177. `SheetFooter`** — depth 2 · orphan-root

```text
🚀 SheetFooter(…): Element [packages/components-web/src/components/ui/sheet.tsx:92]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**178. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sheet.tsx:109]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**179. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sheet.tsx:121]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**180. `Skeleton`** — depth 2 · orphan-root

```text
🚀 Skeleton(…): Element [packages/components-web/src/components/ui/skeleton.tsx:4]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**181. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/tooltip.tsx:18]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**182. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:170]
  └─> useSidebar(): SidebarContextProperties [packages/components-web/src/components/ui/sidebar.tsx:46]
```

**183. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:272]
  └─> useSidebar(): SidebarContextProperties [packages/components-web/src/components/ui/sidebar.tsx:46]
```

**184. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:298]
  └─> useSidebar(): SidebarContextProperties [packages/components-web/src/components/ui/sidebar.tsx:46]
```

**185. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:327]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**186. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:345]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**187. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:363]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**188. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:378]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**189. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:393]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**190. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:408]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**191. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:426]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**192. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:441]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**193. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:462]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**194. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:485]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**195. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:498]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**196. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:511]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**197. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:551]
  └─> useSidebar(): SidebarContextProperties [packages/components-web/src/components/ui/sidebar.tsx:46]
```

**198. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:608]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**199. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:636]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**200. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:659]
  └─> useMemo(…)(): string [packages/components-web/src/components/ui/sidebar.tsx:661]
```

**201. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:695]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**202. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/sidebar.tsx:722]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**203. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/slider.tsx:10]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**204. `Spinner`** — depth 2 · orphan-root

```text
🚀 Spinner({ className, ...props }: React.ComponentProps<"svg">): React.JSX.Element [packages/components-web/src/components/ui/spinner.tsx:6]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**205. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/switch.tsx:10]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**206. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:9]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**207. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:23]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**208. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:31]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**209. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:43]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**210. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:58]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**211. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:73]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**212. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:88]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**213. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/table.tsx:103]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**214. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/tabs.tsx:12]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**215. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/tabs.tsx:27]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**216. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/tabs.tsx:42]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**217. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/toggle.tsx:34]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**218. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/toggle-group.tsx:22]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

**219. `forwardRef(…)`** — depth 2 · orphan-root

```text
🚀 forwardRef(…)(…): Element [packages/components-web/src/components/ui/toggle-group.tsx:40]
  └─> cn(...inputs: ClassValue[]): string [packages/components-web/src/lib/utils.ts:4]
```

</details>

### Breadth

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `forwardRef(…)` | 7 | `useCallback(…)`, `useCallback(…)`, `useCallback(…)`, `useCallback(…)`, `useEffect(…)`, `useEffect(…)`, `cn` | `packages/components-web/src/components/ui/carousel.tsx:48` |
| `forwardRef(…)` | 6 | `useIsMobile`, `useCallback(…)`, `useCallback(…)`, `useEffect(…)`, `useMemo(…)`, `cn` | `packages/components-web/src/components/ui/sidebar.tsx:63` |
| `forwardRef(…)` | 5 | `useChart`, `useMemo(…)`, `cn`, `map(…)`, `filter(…)` | `packages/components-web/src/components/ui/chart.tsx:138` |

<details>
<summary>224 more callables</summary>

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `forwardRef(…)` | 4 | `useChart`, `cn`, `map(…)`, `filter(…)` | `packages/components-web/src/components/ui/chart.tsx:302` |
| `CalendarDayButton` | 2 | `useEffect(…)`, `cn` | `packages/components-web/src/components/ui/calendar.tsx:176` |
| `forwardRef(…)` | 2 | `useCarousel`, `cn` | `packages/components-web/src/components/ui/carousel.tsx:155` |
| `forwardRef(…)` | 2 | `useCarousel`, `cn` | `packages/components-web/src/components/ui/carousel.tsx:177` |
| `forwardRef(…)` | 2 | `useCarousel`, `cn` | `packages/components-web/src/components/ui/carousel.tsx:199` |
| `forwardRef(…)` | 2 | `useCarousel`, `cn` | `packages/components-web/src/components/ui/carousel.tsx:228` |
| `ChartStyle` | 2 | `filter(…)`, `map(…)` | `packages/components-web/src/components/ui/chart.tsx:69` |
| `useMemo(…)` | 2 | `getPayloadConfigurationFromPayload`, `cn` | `packages/components-web/src/components/ui/chart.tsx:158` |
| `map(…)` | 2 | `getPayloadConfigurationFromPayload`, `cn` | `packages/components-web/src/components/ui/chart.tsx:212` |
| `map(…)` | 2 | `getPayloadConfigurationFromPayload`, `cn` | `packages/components-web/src/components/ui/chart.tsx:323` |
| `FieldError` | 2 | `useMemo(…)`, `cn` | `packages/components-web/src/components/ui/field.tsx:187` |
| `forwardRef(…)` | 2 | `useFormField`, `cn` | `packages/components-web/src/components/ui/form.tsx:91` |
| `forwardRef(…)` | 2 | `useFormField`, `cn` | `packages/components-web/src/components/ui/form.tsx:130` |
| `forwardRef(…)` | 2 | `useFormField`, `cn` | `packages/components-web/src/components/ui/form.tsx:147` |
| `useCallback(…)` | 2 | `setOpenMobile(…)`, `setOpen(…)` | `packages/components-web/src/components/ui/sidebar.tsx:98` |
| `forwardRef(…)` | 2 | `useSidebar`, `cn` | `packages/components-web/src/components/ui/sidebar.tsx:170` |
| `forwardRef(…)` | 2 | `useSidebar`, `cn` | `packages/components-web/src/components/ui/sidebar.tsx:272` |
| `forwardRef(…)` | 2 | `useSidebar`, `cn` | `packages/components-web/src/components/ui/sidebar.tsx:298` |
| `forwardRef(…)` | 2 | `useSidebar`, `cn` | `packages/components-web/src/components/ui/sidebar.tsx:551` |
| `forwardRef(…)` | 2 | `useMemo(…)`, `cn` | `packages/components-web/src/components/ui/sidebar.tsx:659` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/accordion.tsx:13` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/accordion.tsx:25` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/accordion.tsx:45` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert.tsx:26` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert.tsx:39` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert.tsx:51` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/button.tsx:45` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:17` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:32` |
| `AlertDialogHeader` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:47` |
| `AlertDialogFooter` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:61` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:78` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:90` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:103` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/alert-dialog.tsx:115` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/avatar.tsx:12` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/avatar.tsx:27` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/avatar.tsx:39` |
| `Badge` | 1 | `cn` | `packages/components-web/src/components/ui/badge.tsx:31` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/breadcrumb.tsx:19` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/breadcrumb.tsx:34` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/breadcrumb.tsx:48` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/breadcrumb.tsx:64` |
| `BreadcrumbSeparator` | 1 | `cn` | `packages/components-web/src/components/ui/breadcrumb.tsx:76` |
| `BreadcrumbEllipsis` | 1 | `cn` | `packages/components-web/src/components/ui/breadcrumb.tsx:92` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/separator.tsx:11` |
| `ButtonGroup` | 1 | `cn` | `packages/components-web/src/components/ui/button-group.tsx:25` |
| `ButtonGroupText` | 1 | `cn` | `packages/components-web/src/components/ui/button-group.tsx:41` |
| `ButtonGroupSeparator` | 1 | `cn` | `packages/components-web/src/components/ui/button-group.tsx:61` |
| `Calendar` | 1 | `cn` | `packages/components-web/src/components/ui/calendar.tsx:15` |
| `Root` | 1 | `cn` | `packages/components-web/src/components/ui/calendar.tsx:129` |
| `Chevron` | 1 | `cn` | `packages/components-web/src/components/ui/calendar.tsx:139` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/card.tsx:9` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/card.tsx:24` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/card.tsx:36` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/card.tsx:48` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/card.tsx:60` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/card.tsx:68` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/chart.tsx:44` |
| `map(…)` | 1 | `map(…)` | `packages/components-web/src/components/ui/chart.tsx:89` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/checkbox.tsx:11` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dialog.tsx:21` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dialog.tsx:36` |
| `DialogHeader` | 1 | `cn` | `packages/components-web/src/components/ui/dialog.tsx:57` |
| `DialogFooter` | 1 | `cn` | `packages/components-web/src/components/ui/dialog.tsx:71` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dialog.tsx:88` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dialog.tsx:103` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:15` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:42` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:61` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:87` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:103` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:115` |
| `CommandShortcut` | 1 | `cn` | `packages/components-web/src/components/ui/command.tsx:128` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:25` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:44` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:59` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:78` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:94` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:118` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:142` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:158` |
| `ContextMenuShortcut` | 1 | `cn` | `packages/components-web/src/components/ui/context-menu.tsx:167` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/drawer.tsx:27` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/drawer.tsx:39` |
| `DrawerHeader` | 1 | `cn` | `packages/components-web/src/components/ui/drawer.tsx:57` |
| `DrawerFooter` | 1 | `cn` | `packages/components-web/src/components/ui/drawer.tsx:68` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/drawer.tsx:82` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/drawer.tsx:97` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:27` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:47` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:63` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:84` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:100` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:124` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:148` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:164` |
| `DropdownMenuShortcut` | 1 | `cn` | `packages/components-web/src/components/ui/dropdown-menu.tsx:173` |
| `Empty` | 1 | `cn` | `packages/components-web/src/components/ui/empty.tsx:6` |
| `EmptyHeader` | 1 | `cn` | `packages/components-web/src/components/ui/empty.tsx:19` |
| `EmptyMedia` | 1 | `cn` | `packages/components-web/src/components/ui/empty.tsx:47` |
| `EmptyTitle` | 1 | `cn` | `packages/components-web/src/components/ui/empty.tsx:62` |
| `EmptyDescription` | 1 | `cn` | `packages/components-web/src/components/ui/empty.tsx:72` |
| `EmptyContent` | 1 | `cn` | `packages/components-web/src/components/ui/empty.tsx:85` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/label.tsx:18` |
| `FieldSet` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:11` |
| `FieldLegend` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:25` |
| `FieldGroup` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:45` |
| `Field` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:82` |
| `FieldContent` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:98` |
| `FieldLabel` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:111` |
| `FieldTitle` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:129` |
| `FieldDescription` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:142` |
| `FieldSeparator` | 1 | `cn` | `packages/components-web/src/components/ui/field.tsx:157` |
| `useMemo(…)` | 1 | `map(…)` | `packages/components-web/src/components/ui/field.tsx:195` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/form.tsx:77` |
| `forwardRef(…)` | 1 | `useFormField` | `packages/components-web/src/components/ui/form.tsx:108` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/hover-card.tsx:14` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/input.tsx:7` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/textarea.tsx:9` |
| `InputGroup` | 1 | `cn` | `packages/components-web/src/components/ui/input-group.tsx:10` |
| `InputGroupAddon` | 1 | `cn` | `packages/components-web/src/components/ui/input-group.tsx:57` |
| `InputGroupButton` | 1 | `cn` | `packages/components-web/src/components/ui/input-group.tsx:94` |
| `InputGroupText` | 1 | `cn` | `packages/components-web/src/components/ui/input-group.tsx:113` |
| `InputGroupInput` | 1 | `cn` | `packages/components-web/src/components/ui/input-group.tsx:125` |
| `InputGroupTextarea` | 1 | `cn` | `packages/components-web/src/components/ui/input-group.tsx:138` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/input-otp.tsx:11` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/input-otp.tsx:27` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/input-otp.tsx:35` |
| `ItemGroup` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:9` |
| `ItemSeparator` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:20` |
| `Item` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:55` |
| `ItemMedia` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:92` |
| `ItemContent` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:107` |
| `ItemTitle` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:120` |
| `ItemDescription` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:133` |
| `ItemActions` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:147` |
| `ItemHeader` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:157` |
| `ItemFooter` | 1 | `cn` | `packages/components-web/src/components/ui/item.tsx:170` |
| `Kbd` | 1 | `cn` | `packages/components-web/src/components/ui/kbd.tsx:4` |
| `KbdGroup` | 1 | `cn` | `packages/components-web/src/components/ui/kbd.tsx:19` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:41` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:56` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:73` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:92` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:108` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:134` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:150` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:173` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:197` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:213` |
| `MenubarShortcut` | 1 | `cn` | `packages/components-web/src/components/ui/menubar.tsx:222` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/navigation-menu.tsx:12` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/navigation-menu.tsx:30` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/navigation-menu.tsx:51` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/navigation-menu.tsx:69` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/navigation-menu.tsx:86` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/navigation-menu.tsx:104` |
| `Pagination` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:8` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:21` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:33` |
| `PaginationLink` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:43` |
| `PaginationPrevious` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:63` |
| `PaginationNext` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:79` |
| `PaginationEllipsis` | 1 | `cn` | `packages/components-web/src/components/ui/pagination.tsx:95` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/popover.tsx:16` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/progress.tsx:12` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/radio-group.tsx:11` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/radio-group.tsx:25` |
| `ResizablePanelGroup` | 1 | `cn` | `packages/components-web/src/components/ui/resizable.tsx:9` |
| `ResizableHandle` | 1 | `cn` | `packages/components-web/src/components/ui/resizable.tsx:24` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/scroll-area.tsx:10` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/scroll-area.tsx:28` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:19` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:39` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:56` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:74` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:106` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:118` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/select.tsx:140` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sheet.tsx:22` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sheet.tsx:60` |
| `SheetHeader` | 1 | `cn` | `packages/components-web/src/components/ui/sheet.tsx:78` |
| `SheetFooter` | 1 | `cn` | `packages/components-web/src/components/ui/sheet.tsx:92` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sheet.tsx:109` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sheet.tsx:121` |
| `useIsMobile` | 1 | `useEffect(…)` | `packages/components-web/src/hooks/use-mobile.tsx:5` |
| `Skeleton` | 1 | `cn` | `packages/components-web/src/components/ui/skeleton.tsx:4` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/tooltip.tsx:18` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:327` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:345` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:363` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:378` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:393` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:408` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:426` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:441` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:462` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:485` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:498` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:511` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:608` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:636` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:695` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/sidebar.tsx:722` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/slider.tsx:10` |
| `Spinner` | 1 | `cn` | `packages/components-web/src/components/ui/spinner.tsx:6` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/switch.tsx:10` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:9` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:23` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:31` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:43` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:58` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:73` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:88` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/table.tsx:103` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/tabs.tsx:12` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/tabs.tsx:27` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/tabs.tsx:42` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/toggle.tsx:34` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/toggle-group.tsx:22` |
| `forwardRef(…)` | 1 | `cn` | `packages/components-web/src/components/ui/toggle-group.tsx:40` |
| `useMediaQuery` | 1 | `useEffect(…)` | `packages/components-web/src/hooks/use-media-query.ts:16` |
| `useBreakpoint` | 1 | `useMediaQuery` | `packages/components-web/src/hooks/use-media-query.ts:62` |

</details>
<!-- callidescope:end -->

## 🕸️ Codependix

Dependency graphs exported by [codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli), regenerated by `nx run codebase:codependix:write`.

### Nx Neighborhood

<!-- codependix:start name="codependix-nx-projects" -->
```mermaid
graph LR
  components_web["components-web"]
  lexico_web["lexico-web"]
  lexico_web --> components_web
  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px
  class components_web subject
```
<!-- codependix:end name="codependix-nx-projects" -->

### File Imports

<!-- codependix:start name="codependix-file-imports" -->
```mermaid
graph LR
  file_callidescope_config_ts["callidescope.config.ts"]
  file_codependix_config_ts["codependix.config.ts"]
  file_codometer_config_ts["codometer.config.ts"]
  file_eslint_config_ts["eslint.config.ts"]
  file_src_components_ui_accordion_tsx["src/components/ui/accordion.tsx"]
  file_src_components_ui_alert_dialog_tsx["src/components/ui/alert-dialog.tsx"]
  file_src_components_ui_alert_tsx["src/components/ui/alert.tsx"]
  file_src_components_ui_aspect_ratio_tsx["src/components/ui/aspect-ratio.tsx"]
  file_src_components_ui_avatar_tsx["src/components/ui/avatar.tsx"]
  file_src_components_ui_badge_tsx["src/components/ui/badge.tsx"]
  file_src_components_ui_breadcrumb_tsx["src/components/ui/breadcrumb.tsx"]
  file_src_components_ui_button_group_tsx["src/components/ui/button-group.tsx"]
  file_src_components_ui_button_tsx["src/components/ui/button.tsx"]
  file_src_components_ui_calendar_tsx["src/components/ui/calendar.tsx"]
  file_src_components_ui_card_tsx["src/components/ui/card.tsx"]
  file_src_components_ui_carousel_tsx["src/components/ui/carousel.tsx"]
  file_src_components_ui_chart_tsx["src/components/ui/chart.tsx"]
  file_src_components_ui_checkbox_tsx["src/components/ui/checkbox.tsx"]
  file_src_components_ui_collapsible_tsx["src/components/ui/collapsible.tsx"]
  file_src_components_ui_command_tsx["src/components/ui/command.tsx"]
  file_src_components_ui_context_menu_tsx["src/components/ui/context-menu.tsx"]
  file_src_components_ui_dialog_tsx["src/components/ui/dialog.tsx"]
  file_src_components_ui_drawer_tsx["src/components/ui/drawer.tsx"]
  file_src_components_ui_dropdown_menu_tsx["src/components/ui/dropdown-menu.tsx"]
  file_src_components_ui_empty_tsx["src/components/ui/empty.tsx"]
  file_src_components_ui_field_tsx["src/components/ui/field.tsx"]
  file_src_components_ui_form_tsx["src/components/ui/form.tsx"]
  file_src_components_ui_hover_card_tsx["src/components/ui/hover-card.tsx"]
  file_src_components_ui_input_group_tsx["src/components/ui/input-group.tsx"]
  file_src_components_ui_input_otp_tsx["src/components/ui/input-otp.tsx"]
  file_src_components_ui_input_tsx["src/components/ui/input.tsx"]
  file_src_components_ui_item_tsx["src/components/ui/item.tsx"]
  file_src_components_ui_kbd_tsx["src/components/ui/kbd.tsx"]
  file_src_components_ui_label_tsx["src/components/ui/label.tsx"]
  file_src_components_ui_menubar_tsx["src/components/ui/menubar.tsx"]
  file_src_components_ui_navigation_menu_tsx["src/components/ui/navigation-menu.tsx"]
  file_src_components_ui_pagination_tsx["src/components/ui/pagination.tsx"]
  file_src_components_ui_popover_tsx["src/components/ui/popover.tsx"]
  file_src_components_ui_progress_tsx["src/components/ui/progress.tsx"]
  file_src_components_ui_radio_group_tsx["src/components/ui/radio-group.tsx"]
  file_src_components_ui_resizable_tsx["src/components/ui/resizable.tsx"]
  file_src_components_ui_scroll_area_tsx["src/components/ui/scroll-area.tsx"]
  file_src_components_ui_select_tsx["src/components/ui/select.tsx"]
  file_src_components_ui_separator_tsx["src/components/ui/separator.tsx"]
  file_src_components_ui_sheet_tsx["src/components/ui/sheet.tsx"]
  file_src_components_ui_sidebar_tsx["src/components/ui/sidebar.tsx"]
  file_src_components_ui_skeleton_tsx["src/components/ui/skeleton.tsx"]
  file_src_components_ui_slider_tsx["src/components/ui/slider.tsx"]
  file_src_components_ui_sonner_tsx["src/components/ui/sonner.tsx"]
  file_src_components_ui_spinner_tsx["src/components/ui/spinner.tsx"]
  file_src_components_ui_switch_tsx["src/components/ui/switch.tsx"]
  file_src_components_ui_table_tsx["src/components/ui/table.tsx"]
  file_src_components_ui_tabs_tsx["src/components/ui/tabs.tsx"]
  file_src_components_ui_textarea_tsx["src/components/ui/textarea.tsx"]
  file_src_components_ui_toggle_group_tsx["src/components/ui/toggle-group.tsx"]
  file_src_components_ui_toggle_tsx["src/components/ui/toggle.tsx"]
  file_src_components_ui_tooltip_tsx["src/components/ui/tooltip.tsx"]
  file_src_hooks_use_media_query_ts["src/hooks/use-media-query.ts"]
  file_src_hooks_use_mobile_tsx["src/hooks/use-mobile.tsx"]
  file_src_index_ts["src/index.ts"]
  file_src_lib_utils_ts["src/lib/utils.ts"]
  file_vite_config_mts["vite.config.mts"]
  file_src_components_ui_accordion_tsx --> file_src_lib_utils_ts
  file_src_components_ui_alert_dialog_tsx --> file_src_components_ui_button_tsx
  file_src_components_ui_alert_dialog_tsx --> file_src_lib_utils_ts
  file_src_components_ui_alert_tsx --> file_src_lib_utils_ts
  file_src_components_ui_avatar_tsx --> file_src_lib_utils_ts
  file_src_components_ui_badge_tsx --> file_src_lib_utils_ts
  file_src_components_ui_breadcrumb_tsx --> file_src_lib_utils_ts
  file_src_components_ui_button_group_tsx --> file_src_components_ui_separator_tsx
  file_src_components_ui_button_group_tsx --> file_src_lib_utils_ts
  file_src_components_ui_button_tsx --> file_src_lib_utils_ts
  file_src_components_ui_calendar_tsx --> file_src_components_ui_button_tsx
  file_src_components_ui_calendar_tsx --> file_src_lib_utils_ts
  file_src_components_ui_card_tsx --> file_src_lib_utils_ts
  file_src_components_ui_carousel_tsx --> file_src_components_ui_button_tsx
  file_src_components_ui_carousel_tsx --> file_src_lib_utils_ts
  file_src_components_ui_chart_tsx --> file_src_lib_utils_ts
  file_src_components_ui_checkbox_tsx --> file_src_lib_utils_ts
  file_src_components_ui_command_tsx --> file_src_components_ui_dialog_tsx
  file_src_components_ui_command_tsx --> file_src_lib_utils_ts
  file_src_components_ui_context_menu_tsx --> file_src_lib_utils_ts
  file_src_components_ui_dialog_tsx --> file_src_lib_utils_ts
  file_src_components_ui_drawer_tsx --> file_src_lib_utils_ts
  file_src_components_ui_dropdown_menu_tsx --> file_src_lib_utils_ts
  file_src_components_ui_empty_tsx --> file_src_lib_utils_ts
  file_src_components_ui_field_tsx --> file_src_components_ui_label_tsx
  file_src_components_ui_field_tsx --> file_src_components_ui_separator_tsx
  file_src_components_ui_field_tsx --> file_src_lib_utils_ts
  file_src_components_ui_form_tsx --> file_src_components_ui_label_tsx
  file_src_components_ui_form_tsx --> file_src_lib_utils_ts
  file_src_components_ui_hover_card_tsx --> file_src_lib_utils_ts
  file_src_components_ui_input_group_tsx --> file_src_components_ui_button_tsx
  file_src_components_ui_input_group_tsx --> file_src_components_ui_input_tsx
  file_src_components_ui_input_group_tsx --> file_src_components_ui_textarea_tsx
  file_src_components_ui_input_group_tsx --> file_src_lib_utils_ts
  file_src_components_ui_input_otp_tsx --> file_src_lib_utils_ts
  file_src_components_ui_input_tsx --> file_src_lib_utils_ts
  file_src_components_ui_item_tsx --> file_src_components_ui_separator_tsx
  file_src_components_ui_item_tsx --> file_src_lib_utils_ts
  file_src_components_ui_kbd_tsx --> file_src_lib_utils_ts
  file_src_components_ui_label_tsx --> file_src_lib_utils_ts
  file_src_components_ui_menubar_tsx --> file_src_lib_utils_ts
  file_src_components_ui_navigation_menu_tsx --> file_src_lib_utils_ts
  file_src_components_ui_pagination_tsx --> file_src_components_ui_button_tsx
  file_src_components_ui_pagination_tsx --> file_src_lib_utils_ts
  file_src_components_ui_popover_tsx --> file_src_lib_utils_ts
  file_src_components_ui_progress_tsx --> file_src_lib_utils_ts
  file_src_components_ui_radio_group_tsx --> file_src_lib_utils_ts
  file_src_components_ui_resizable_tsx --> file_src_lib_utils_ts
  file_src_components_ui_scroll_area_tsx --> file_src_lib_utils_ts
  file_src_components_ui_select_tsx --> file_src_lib_utils_ts
  file_src_components_ui_separator_tsx --> file_src_lib_utils_ts
  file_src_components_ui_sheet_tsx --> file_src_lib_utils_ts
  file_src_components_ui_sidebar_tsx --> file_src_components_ui_button_tsx
  file_src_components_ui_sidebar_tsx --> file_src_components_ui_input_tsx
  file_src_components_ui_sidebar_tsx --> file_src_components_ui_separator_tsx
  file_src_components_ui_sidebar_tsx --> file_src_components_ui_sheet_tsx
  file_src_components_ui_sidebar_tsx --> file_src_components_ui_skeleton_tsx
  file_src_components_ui_sidebar_tsx --> file_src_components_ui_tooltip_tsx
  file_src_components_ui_sidebar_tsx --> file_src_hooks_use_mobile_tsx
  file_src_components_ui_sidebar_tsx --> file_src_lib_utils_ts
  file_src_components_ui_skeleton_tsx --> file_src_lib_utils_ts
  file_src_components_ui_slider_tsx --> file_src_lib_utils_ts
  file_src_components_ui_spinner_tsx --> file_src_lib_utils_ts
  file_src_components_ui_switch_tsx --> file_src_lib_utils_ts
  file_src_components_ui_table_tsx --> file_src_lib_utils_ts
  file_src_components_ui_tabs_tsx --> file_src_lib_utils_ts
  file_src_components_ui_textarea_tsx --> file_src_lib_utils_ts
  file_src_components_ui_toggle_group_tsx --> file_src_components_ui_toggle_tsx
  file_src_components_ui_toggle_group_tsx --> file_src_lib_utils_ts
  file_src_components_ui_toggle_tsx --> file_src_lib_utils_ts
  file_src_components_ui_tooltip_tsx --> file_src_lib_utils_ts
```
<!-- codependix:end name="codependix-file-imports" -->

<!-- codometer:start -->

## ⏲️ Codometer

### Project

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-373-22c55e?style=flat-square)
![Repository Size](https://img.shields.io/badge/Repository_Size-22.93_kB-6b7280?style=flat-square)
![Folders](https://img.shields.io/badge/Folders-2-4a4a4a?style=flat-square)
![Source Files](https://img.shields.io/badge/Source_Files-8-3178c6?style=flat-square)

### Measured Targets

![Library bundle Size](https://img.shields.io/badge/Library_bundle_Size-201.08_kB_gzip-6b7280?style=flat-square)

### TypeScript

![TypeScript Files](https://img.shields.io/badge/TypeScript_Files-6-3178c6?style=flat-square)
![Interfaces](https://img.shields.io/badge/Interfaces-0-0ea5e9?style=flat-square)
![Generic Declarations](https://img.shields.io/badge/Generic_Declarations-0-0369a1?style=flat-square)
![Enums](https://img.shields.io/badge/Enums-0-f97316?style=flat-square)
![Decorators](https://img.shields.io/badge/Decorators-0-db2777?style=flat-square)
![Doc Comments](https://img.shields.io/badge/Doc_Comments-3-6366f1?style=flat-square)
![Static Methods](https://img.shields.io/badge/Static_Methods-0-166534?style=flat-square)

### JavaScript

![JavaScript Files](https://img.shields.io/badge/JavaScript_Files-2-f7df1e?style=flat-square)
![Test Files](https://img.shields.io/badge/Test_Files-0-10b981?style=flat-square)
![External Packages](https://img.shields.io/badge/External_Packages-6-8b5cf6?style=flat-square)
![Classes](https://img.shields.io/badge/Classes-0-7c3aed?style=flat-square)
![Functions](https://img.shields.io/badge/Functions-1-16a34a?style=flat-square)
![Methods](https://img.shields.io/badge/Methods-0-15803d?style=flat-square)
![Sync Functions](https://img.shields.io/badge/Sync_Functions-1-4ade80?style=flat-square)
![Async Functions](https://img.shields.io/badge/Async_Functions-0-059669?style=flat-square)
![Constants](https://img.shields.io/badge/Constants-2-dc2626?style=flat-square)
![Imports](https://img.shields.io/badge/Imports-10-0284c7?style=flat-square)
![Exported Symbols](https://img.shields.io/badge/Exported_Symbols-0-ea580c?style=flat-square)
![Comments](https://img.shields.io/badge/Comments-26-64748b?style=flat-square)
![Comment Lines](https://img.shields.io/badge/Comment_Lines-62-475569?style=flat-square)
![TODO Comments](https://img.shields.io/badge/TODO_Comments-0-ca8a04?style=flat-square)

### Python

![Python Files](https://img.shields.io/badge/Python_Files-0-3776ab?style=flat-square)
![Python Lines](https://img.shields.io/badge/Python_Lines-0-4b8bbe?style=flat-square)
![Python Classes](https://img.shields.io/badge/Python_Classes-0-7c3aed?style=flat-square)
![Python Functions](https://img.shields.io/badge/Python_Functions-0-16a34a?style=flat-square)
![Python Protocols](https://img.shields.io/badge/Python_Protocols-0-0ea5e9?style=flat-square)
![Python Constants](https://img.shields.io/badge/Python_Constants-0-dc2626?style=flat-square)
![Python Imports](https://img.shields.io/badge/Python_Imports-0-0284c7?style=flat-square)
![Python Decorators](https://img.shields.io/badge/Python_Decorators-0-db2777?style=flat-square)
![Docstrings](https://img.shields.io/badge/Docstrings-0-6366f1?style=flat-square)
![Docstring Lines](https://img.shields.io/badge/Docstring_Lines-0-818cf8?style=flat-square)
![Python Comments](https://img.shields.io/badge/Python_Comments-0-64748b?style=flat-square)
![Python Comment Lines](https://img.shields.io/badge/Python_Comment_Lines-0-475569?style=flat-square)

### JSON

![JSON Files](https://img.shields.io/badge/JSON_Files-4-a16207?style=flat-square)
![JSON Lines](https://img.shields.io/badge/JSON_Lines-180-ca8a04?style=flat-square)
![JSON Objects](https://img.shields.io/badge/JSON_Objects-37-7c3aed?style=flat-square)
![JSON Arrays](https://img.shields.io/badge/JSON_Arrays-10-8b5cf6?style=flat-square)
![JSON Properties](https://img.shields.io/badge/JSON_Properties-137-0284c7?style=flat-square)
![JSON Strings](https://img.shields.io/badge/JSON_Strings-108-16a34a?style=flat-square)
![JSON Numbers](https://img.shields.io/badge/JSON_Numbers-1-059669?style=flat-square)
![JSON Booleans](https://img.shields.io/badge/JSON_Booleans-8-0ea5e9?style=flat-square)
![JSON Nulls](https://img.shields.io/badge/JSON_Nulls-0-64748b?style=flat-square)
![JSON Items](https://img.shields.io/badge/JSON_Items-23-475569?style=flat-square)
![JSON Nodes](https://img.shields.io/badge/JSON_Nodes-164-dc2626?style=flat-square)
![JSON Max Depth](https://img.shields.io/badge/JSON_Max_Depth-5-ea580c?style=flat-square)

### YAML

![YAML Files](https://img.shields.io/badge/YAML_Files-0-cb171e?style=flat-square)
![YAML Lines](https://img.shields.io/badge/YAML_Lines-0-e34c26?style=flat-square)
![YAML Documents](https://img.shields.io/badge/YAML_Documents-0-f97316?style=flat-square)
![YAML Mappings](https://img.shields.io/badge/YAML_Mappings-0-7c3aed?style=flat-square)
![YAML Sequences](https://img.shields.io/badge/YAML_Sequences-0-8b5cf6?style=flat-square)
![YAML Keys](https://img.shields.io/badge/YAML_Keys-0-0284c7?style=flat-square)
![YAML Scalars](https://img.shields.io/badge/YAML_Scalars-0-16a34a?style=flat-square)
![YAML Anchors](https://img.shields.io/badge/YAML_Anchors-0-059669?style=flat-square)
![YAML Aliases](https://img.shields.io/badge/YAML_Aliases-0-10b981?style=flat-square)
![YAML Comments](https://img.shields.io/badge/YAML_Comments-0-64748b?style=flat-square)
![YAML Max Depth](https://img.shields.io/badge/YAML_Max_Depth-0-ea580c?style=flat-square)

### TOML

![TOML Files](https://img.shields.io/badge/TOML_Files-0-9c4221?style=flat-square)
![TOML Lines](https://img.shields.io/badge/TOML_Lines-0-b45309?style=flat-square)
![TOML Tables](https://img.shields.io/badge/TOML_Tables-0-7c3aed?style=flat-square)
![TOML Array Tables](https://img.shields.io/badge/TOML_Array_Tables-0-8b5cf6?style=flat-square)
![TOML Keys](https://img.shields.io/badge/TOML_Keys-0-0284c7?style=flat-square)
![TOML Arrays](https://img.shields.io/badge/TOML_Arrays-0-16a34a?style=flat-square)
![TOML Comments](https://img.shields.io/badge/TOML_Comments-0-64748b?style=flat-square)

### Shell

![Shell Files](https://img.shields.io/badge/Shell_Files-0-89e051?style=flat-square)
![Shell Lines](https://img.shields.io/badge/Shell_Lines-0-4eaa25?style=flat-square)
![Shell Functions](https://img.shields.io/badge/Shell_Functions-0-16a34a?style=flat-square)
![Shell Variables](https://img.shields.io/badge/Shell_Variables-0-0284c7?style=flat-square)
![Shell Exports](https://img.shields.io/badge/Shell_Exports-0-ea580c?style=flat-square)
![Shell Conditionals](https://img.shields.io/badge/Shell_Conditionals-0-7c3aed?style=flat-square)
![Shell Loops](https://img.shields.io/badge/Shell_Loops-0-8b5cf6?style=flat-square)
![Shell Pipelines](https://img.shields.io/badge/Shell_Pipelines-0-059669?style=flat-square)
![Shebangs](https://img.shields.io/badge/Shebangs-0-6b7280?style=flat-square)
![Shell Comments](https://img.shields.io/badge/Shell_Comments-0-64748b?style=flat-square)
![Shell Comment Lines](https://img.shields.io/badge/Shell_Comment_Lines-0-475569?style=flat-square)

### SQL

![SQL Files](https://img.shields.io/badge/SQL_Files-0-e38c00?style=flat-square)
![SQL Lines](https://img.shields.io/badge/SQL_Lines-0-f29111?style=flat-square)
![SQL Statements](https://img.shields.io/badge/SQL_Statements-0-7c3aed?style=flat-square)
![SQL Selects](https://img.shields.io/badge/SQL_Selects-0-16a34a?style=flat-square)
![SQL Inserts](https://img.shields.io/badge/SQL_Inserts-0-22c55e?style=flat-square)
![SQL Updates](https://img.shields.io/badge/SQL_Updates-0-0ea5e9?style=flat-square)
![SQL Deletes](https://img.shields.io/badge/SQL_Deletes-0-dc2626?style=flat-square)
![SQL Creates](https://img.shields.io/badge/SQL_Creates-0-0284c7?style=flat-square)
![SQL Joins](https://img.shields.io/badge/SQL_Joins-0-8b5cf6?style=flat-square)
![SQL CTEs](https://img.shields.io/badge/SQL_CTEs-0-059669?style=flat-square)
![SQL Comments](https://img.shields.io/badge/SQL_Comments-0-64748b?style=flat-square)

### HCL

![HCL Files](https://img.shields.io/badge/HCL_Files-0-844fba?style=flat-square)
![HCL Lines](https://img.shields.io/badge/HCL_Lines-0-a78bfa?style=flat-square)
![HCL Blocks](https://img.shields.io/badge/HCL_Blocks-0-7c3aed?style=flat-square)
![HCL Resources](https://img.shields.io/badge/HCL_Resources-0-0284c7?style=flat-square)
![HCL Variables](https://img.shields.io/badge/HCL_Variables-0-16a34a?style=flat-square)
![HCL Outputs](https://img.shields.io/badge/HCL_Outputs-0-059669?style=flat-square)
![HCL Attributes](https://img.shields.io/badge/HCL_Attributes-0-0ea5e9?style=flat-square)
![HCL Interpolations](https://img.shields.io/badge/HCL_Interpolations-0-db2777?style=flat-square)
![HCL Comments](https://img.shields.io/badge/HCL_Comments-0-64748b?style=flat-square)

### CSS

![CSS Files](https://img.shields.io/badge/CSS_Files-1-264de4?style=flat-square)
![CSS Lines](https://img.shields.io/badge/CSS_Lines-136-2965f1?style=flat-square)
![CSS Rules](https://img.shields.io/badge/CSS_Rules-7-7c3aed?style=flat-square)
![CSS Selectors](https://img.shields.io/badge/CSS_Selectors-8-8b5cf6?style=flat-square)
![CSS Declarations](https://img.shields.io/badge/CSS_Declarations-72-0284c7?style=flat-square)
![CSS At Rules](https://img.shields.io/badge/CSS_At_Rules-10-f97316?style=flat-square)
![CSS Media Queries](https://img.shields.io/badge/CSS_Media_Queries-0-ea580c?style=flat-square)
![CSS Custom Properties](https://img.shields.io/badge/CSS_Custom_Properties-65-16a34a?style=flat-square)
![CSS Comments](https://img.shields.io/badge/CSS_Comments-12-64748b?style=flat-square)

### Conventions

![Module Files](https://img.shields.io/badge/Module_Files-0-7c3aed?style=flat-square)
![Service Files](https://img.shields.io/badge/Service_Files-0-0284c7?style=flat-square)
![Command Files](https://img.shields.io/badge/Command_Files-0-16a34a?style=flat-square)
![Constants Files](https://img.shields.io/badge/Constants_Files-0-ea580c?style=flat-square)
![Types Files](https://img.shields.io/badge/Types_Files-0-db2777?style=flat-square)
![Utilities Files](https://img.shields.io/badge/Utilities_Files-0-0ea5e9?style=flat-square)
![TypeORM Entities](https://img.shields.io/badge/TypeORM_Entities-0-059669?style=flat-square)
![Unit Tests](https://img.shields.io/badge/Unit_Tests-0-ca8a04?style=flat-square)
![Integration Tests](https://img.shields.io/badge/Integration_Tests-0-7c3aed?style=flat-square)
![End To End Tests](https://img.shields.io/badge/End_To_End_Tests-0-0284c7?style=flat-square)
![CSS Comment Budget](https://img.shields.io/badge/CSS_Comment_Budget-0-16a34a?style=flat-square)
![HCL Comment Budget](https://img.shields.io/badge/HCL_Comment_Budget-0-ea580c?style=flat-square)
![Python Comment Budget](https://img.shields.io/badge/Python_Comment_Budget-0-db2777?style=flat-square)
![SQL Comment Budget](https://img.shields.io/badge/SQL_Comment_Budget-0-0ea5e9?style=flat-square)
![TOML Comment Budget](https://img.shields.io/badge/TOML_Comment_Budget-0-059669?style=flat-square)
![TypeScript Comment Budget](https://img.shields.io/badge/TypeScript_Comment_Budget-0-ca8a04?style=flat-square)
![YAML Comment Budget](https://img.shields.io/badge/YAML_Comment_Budget-0-7c3aed?style=flat-square)
![Shell Comment Budget](https://img.shields.io/badge/Shell_Comment_Budget-0-0284c7?style=flat-square)

### Jupyter

![Notebooks](https://img.shields.io/badge/Notebooks-0-f37626?style=flat-square)
![Notebook Cells](https://img.shields.io/badge/Notebook_Cells-0-e8a33d?style=flat-square)
![Code Cells](https://img.shields.io/badge/Code_Cells-0-3776ab?style=flat-square)
![Markdown Cells](https://img.shields.io/badge/Markdown_Cells-0-083fa1?style=flat-square)
![Raw Cells](https://img.shields.io/badge/Raw_Cells-0-9ca3af?style=flat-square)
![Executed Cells](https://img.shields.io/badge/Executed_Cells-0-16a34a?style=flat-square)
![Cell Outputs](https://img.shields.io/badge/Cell_Outputs-0-059669?style=flat-square)
![Notebook Code Lines](https://img.shields.io/badge/Notebook_Code_Lines-0-4b8bbe?style=flat-square)
![Notebook Classes](https://img.shields.io/badge/Notebook_Classes-0-7c3aed?style=flat-square)
![Notebook Functions](https://img.shields.io/badge/Notebook_Functions-0-22c55e?style=flat-square)
![Notebook Imports](https://img.shields.io/badge/Notebook_Imports-0-0284c7?style=flat-square)
![Notebook Decorators](https://img.shields.io/badge/Notebook_Decorators-0-db2777?style=flat-square)
![Notebook Prose Lines](https://img.shields.io/badge/Notebook_Prose_Lines-0-1f6feb?style=flat-square)
![Notebook Headings](https://img.shields.io/badge/Notebook_Headings-0-a78bfa?style=flat-square)
![Notebook Links](https://img.shields.io/badge/Notebook_Links-0-10b981?style=flat-square)
![Notebook Images](https://img.shields.io/badge/Notebook_Images-0-34d399?style=flat-square)
![Notebook Code Blocks](https://img.shields.io/badge/Notebook_Code_Blocks-0-dc2626?style=flat-square)
![Notebook Properties](https://img.shields.io/badge/Notebook_Properties-0-ca8a04?style=flat-square)
![Notebook Nodes](https://img.shields.io/badge/Notebook_Nodes-0-a16207?style=flat-square)
![Notebook Max Depth](https://img.shields.io/badge/Notebook_Max_Depth-0-ea580c?style=flat-square)

### Markdown

![Markdown Files](https://img.shields.io/badge/Markdown_Files-1-083fa1?style=flat-square)
![Markdown Lines](https://img.shields.io/badge/Markdown_Lines-74-1f6feb?style=flat-square)
![H1](https://img.shields.io/badge/H1-1-7c3aed?style=flat-square)
![H2](https://img.shields.io/badge/H2-6-8b5cf6?style=flat-square)
![H3](https://img.shields.io/badge/H3-5-a78bfa?style=flat-square)
![H4](https://img.shields.io/badge/H4-0-c4b5fd?style=flat-square)
![H5](https://img.shields.io/badge/H5-0-ddd6fe?style=flat-square)
![H6](https://img.shields.io/badge/H6-0-ede9fe?style=flat-square)
![Paragraphs](https://img.shields.io/badge/Paragraphs-21-64748b?style=flat-square)
![Lists](https://img.shields.io/badge/Lists-4-16a34a?style=flat-square)
![List Items](https://img.shields.io/badge/List_Items-15-22c55e?style=flat-square)
![Task List Items](https://img.shields.io/badge/Task_List_Items-0-4ade80?style=flat-square)
![Tables](https://img.shields.io/badge/Tables-0-0284c7?style=flat-square)
![Table Rows](https://img.shields.io/badge/Table_Rows-0-0ea5e9?style=flat-square)
![Links](https://img.shields.io/badge/Links-10-059669?style=flat-square)
![Images](https://img.shields.io/badge/Images-0-10b981?style=flat-square)
![Code Blocks](https://img.shields.io/badge/Code_Blocks-4-dc2626?style=flat-square)
![Inline Code](https://img.shields.io/badge/Inline_Code-17-ef4444?style=flat-square)
![Block Quotes](https://img.shields.io/badge/Block_Quotes-0-ca8a04?style=flat-square)
![Thematic Breaks](https://img.shields.io/badge/Thematic_Breaks-0-a16207?style=flat-square)
<!-- codometer:end -->
