import path from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import type { UserConfig } from "vite";

/** Options for creating a shared Vite library build configuration. */
export interface ViteLibraryConfigOptions {
  /**
   * Additional packages to inline into the bundle instead of externalizing.
   * `@codebase/logging` is always inlined.
   */
  readonly bundledPackages?: readonly string[];
  /**
   * Entry points for the library. Defaults to `{ "src/index": "src/index.ts" }`.
   */
  readonly entry?: Record<string, string> | string;
  /**
   * Optional custom external filter or list of external package names.
   */
  readonly external?: ((id: string) => boolean) | readonly (RegExp | string)[];
  /**
   * The directory of the package being built.
   */
  readonly packageDirectory: string;
  /**
   * Path to the tsconfig file used for type generation.
   * Defaults to `tsconfig.build.json` in the package directory.
   */
  readonly tsconfigPath?: string;
}

/**
 * Creates a shared Vite library build configuration for publishable packages.
 *
 * Emits ESM output into each project's own `dist/` directory, bundles declaration
 * files using API Extractor, and bundles internal utilities like `@codebase/logging`.
 *
 * @param options - Configuration options for the library build.
 * @returns Vite user configuration object.
 */
export function createViteLibraryConfig(
  options: ViteLibraryConfigOptions,
): UserConfig {
  const {
    bundledPackages = [],
    entry = {
      "src/index": path.resolve(options.packageDirectory, "src/index.ts"),
    },
    external,
    packageDirectory,
    tsconfigPath = path.resolve(packageDirectory, "tsconfig.build.json"),
  } = options;

  const inlinedPackages = new Set([
    "@codebase/logging",
    "@oxc-project/runtime",
    ...bundledPackages,
  ]);

  const resolvedEntry =
    typeof entry === "string"
      ? { "src/index": path.resolve(packageDirectory, entry) }
      : entry;

  return defineConfig({
    build: {
      emptyOutDir: true,
      lib: {
        entry: resolvedEntry,
        fileName: (_format, entryName) => `${entryName}.js`,
        formats: ["es"],
      },
      outDir: "dist",
      reportCompressedSize: true,
      rollupOptions: {
        external: (id) => {
          if (typeof external === "function") {
            return external(id);
          }
          if (Array.isArray(external)) {
            return external.some((pattern: RegExp | string) =>
              typeof pattern === "string" ? pattern === id : pattern.test(id),
            );
          }
          if (id.startsWith(".") || id.startsWith("/") || path.isAbsolute(id)) {
            return false;
          }
          if (
            id.startsWith("@oxc-project/runtime") ||
            id.startsWith("@swc/helpers") ||
            id.startsWith("tslib")
          ) {
            return false;
          }
          for (const inlinedPackage of inlinedPackages) {
            if (id === inlinedPackage || id.startsWith(`${inlinedPackage}/`)) {
              return false;
            }
          }
          return true;
        },
      },
    },
    plugins: [
      dts({
        bundleTypes: {
          bundledPackages: [...inlinedPackages],
        },
        entryRoot: "src",
        tsconfigPath,
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    root: packageDirectory,
  });
}
