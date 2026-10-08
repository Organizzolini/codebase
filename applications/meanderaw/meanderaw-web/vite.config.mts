import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: "../../../node_modules/.vite/applications/meanderaw/meanderaw-web",
  plugins: [
    tailwindcss(),
    // The generated route tree lives under `lib/`, because
    // `codebase-structure.json` refuses its camel-cased name at the `src/`
    // root; the path resolves relative to `srcDirectory`, so a leading `src/`
    // would write to `src/src/`. Test files sit beside the routes they test, so
    // the route generator is told to skip them rather than treat them as routes.
    tanstackStart({
      router: {
        generatedRouteTree: "lib/routeTree.gen.ts",
        routeFileIgnorePattern: String.raw`\.test\.`,
      },
    }),
    // The React plugin must come after the TanStack Start plugin.
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  root: import.meta.dirname,
  server: {
    port: 3000,
  },
});
