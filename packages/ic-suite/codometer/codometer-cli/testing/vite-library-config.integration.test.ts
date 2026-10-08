import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import viteConfiguration from "../vite.config.ts";

import type { LibraryOptions, UserConfig } from "vite";

/**
 * Sources of a two-module library, keyed by path relative to its root.
 *
 * Both modules declare a class with the same name, so the bundler has to
 * rename one of them, and the minifier then mangles whatever is left. A NestJS
 * logger context is read from `.name`, which is exactly what both steps lose.
 */
const FIXTURE_FILES: Readonly<Record<string, string>> = {
  "src/index.ts": [
    'import { otherContext } from "./other";',
    "",
    "class ContextService {",
    "  context(): string {",
    "    return ContextService.name;",
    "  }",
    "}",
    "",
    "function namedFunction(): string {",
    "  return namedFunction.name;",
    "}",
    "",
    "export class ExportedService {}",
    "",
    "export function contexts(): string[] {",
    "  return [new ContextService().context(), namedFunction(), otherContext()];",
    "}",
    "",
  ].join("\n"),
  "src/other.ts": [
    "class ContextService {",
    "  context(): string {",
    "    return ContextService.name;",
    "  }",
    "}",
    "",
    "export function otherContext(): string {",
    "  return new ContextService().context();",
    "}",
    "",
  ].join("\n"),
};

/** The shape of the fixture's built entry, once imported. */
interface FixtureBundle {
  readonly contexts: () => readonly string[];
  readonly ExportedService: new () => object;
}

/**
 * Builds the fixture with this package's own Vite configuration, pointed at
 * the fixture instead of `src/`.
 *
 * Declaration bundling needs a tsconfig the fixture does not have and says
 * nothing about the JavaScript under test, so the plugins are left out.
 *
 * @param fixtureDirectory - Where the fixture's sources were written.
 * @returns The built entry, imported.
 */
async function buildFixture(fixtureDirectory: string): Promise<FixtureBundle> {
  const outputDirectory = path.join(fixtureDirectory, "dist");
  await build({
    ...viteConfiguration,
    build: {
      ...viteConfiguration.build,
      lib: {
        ...readLibraryOptions(viteConfiguration),
        entry: { "src/index": path.join(fixtureDirectory, "src", "index.ts") },
      },
      outDir: outputDirectory,
    },
    configFile: false,
    logLevel: "silent",
    plugins: [],
    root: fixtureDirectory,
  });
  const entryUrl = pathToFileURL(path.join(outputDirectory, "src", "index.js"));
  return (await import(entryUrl.href)) as FixtureBundle;
}

/**
 * Reads the library options this package publishes with.
 *
 * @param configuration - The package's Vite configuration.
 * @returns Its `build.lib` options.
 */
function readLibraryOptions(configuration: UserConfig): LibraryOptions {
  const libraryOptions = configuration.build?.lib;
  if (!libraryOptions) {
    throw new Error("vite.config.ts no longer builds a library");
  }
  return libraryOptions;
}

describe("the published library build", () => {
  let fixtureDirectory: string;
  let bundle: FixtureBundle;

  beforeAll(async () => {
    fixtureDirectory = mkdtempSync(path.join(tmpdir(), "vite-library-config-"));
    for (const [relativePath, contents] of Object.entries(FIXTURE_FILES)) {
      const absolutePath = path.join(fixtureDirectory, relativePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, contents);
    }
    bundle = await buildFixture(fixtureDirectory);
  }, 120_000);

  afterAll(() => {
    rmSync(fixtureDirectory, { force: true, recursive: true });
  });

  it("keeps the name of an exported class", () => {
    expect(bundle.ExportedService.name).toBe("ExportedService");
  });

  it("keeps class and function names a logger context is read from", () => {
    expect(bundle.contexts()).toStrictEqual([
      "ContextService",
      "namedFunction",
      "ContextService",
    ]);
  });
});
