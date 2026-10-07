import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    emptyOutDir: true,
    outDir: "dist",
    reportCompressedSize: true,
    rolldownOptions: {
      external: ["expo-sqlite"],
    },
  },
  cacheDir: "../../node_modules/.vite/applications/lexico",
  css: {
    devSourcemap: true,
  },
  plugins: [
    tailwindcss(),
    // The client entry and the generated route tree both live under `lib/`
    // rather than at the `src/` root, which `codebase-structure.json` restricts
    // to entry-point names — the route tree is a build artifact and the client
    // entry is framework boilerplate, and neither is this app's own entry
    // point. `router.tsx` still sits at the root because TanStack resolves that
    // one with `required: true`.

    // The client entry is kept rather than deleted even though TanStack would
    // supply an identical virtual one: it holds the only static
    // `react-dom/client` import in the workspace, and without it every
    // dependency check strips `react-dom` from this project's manifest and from
    // the catalog, leaving the app to resolve it by hoisting alone.

    // Both paths resolve relative to `srcDirectory`, not to the project root —
    // a leading `src/` here writes to `src/src/`.
    tanstackStart({
      client: {
        entry: "lib/client.tsx",
      },
      router: {
        generatedRouteTree: "lib/routeTree.gen.ts",
        // Route tests sit beside the routes they test, so the route
        // generator skips them rather than treating each one as a route.
        routeFileIgnorePattern: String.raw`\.test\.`,
      },
    }),
    // React plugin must come after TanStack Start plugin
    react(),
  ],
  preview: {
    host: "localhost",
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(
        import.meta.dirname,
        "../../packages/components-web/src",
      ),
    },
    tsconfigPaths: true,
  },
  root: import.meta.dirname,
  server: {
    host: "localhost",
    port: 3000,
  },
});
