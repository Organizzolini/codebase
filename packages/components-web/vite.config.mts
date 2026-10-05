/// <reference types='vitest' />
import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es" as const],
      name: "components-web",
    },
    outDir: "../../dist/packages/components-web",
    reportCompressedSize: true,
    rolldownOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", /^@radix-ui\/.*/],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  cacheDir: "../../node_modules/.vite/packages/components-web",
  plugins: [
    react(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [{ dest: ".", src: "*.md" }],
    }),
    dts({
      entryRoot: "src",
      pathsToAliases: false,
      tsconfigPath: path.join(import.meta.dirname, "tsconfig.json"),
    }),
  ],
  root: import.meta.dirname,
}));
