import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** This package's root, where both manifests sit. */
const PACKAGE_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Whether a parsed JSON value is an array, of entries not yet checked. */
function isList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Whether a parsed JSON value is an object rather than a scalar or array. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads one JSON manifest from this package's root. */
function readManifest(fileName: string): Record<string, unknown> {
  return readRecord(
    JSON.parse(
      readFileSync(path.join(PACKAGE_DIRECTORY, fileName), "utf8"),
    ) as unknown,
    fileName,
  );
}

/** One object-valued field of a parsed manifest, or a refusal naming it. */
function readRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${field} is not a JSON object`);
  }

  return value;
}

const { exports, files, name, publishConfig } = readManifest("package.json");
const packageExports = readRecord(exports, "exports");
const { exports: publishedExportsField } = readRecord(
  publishConfig,
  "publishConfig",
);
const publishedExports = readRecord(
  publishedExportsField,
  "publishConfig.exports",
);
const packageFiles = isList(files)
  ? files.filter((pattern): pattern is string => typeof pattern === "string")
  : [];
const { executors: executorsField } = readManifest("executors.json");
const executors = readRecord(executorsField, "executors");

/** One executor's entry in `executors.json`. */
function readExecutor(executorName: string): Record<string, unknown> {
  return readRecord(executors[executorName], executorName);
}

/**
 * Resolves one subpath through an `exports` map: the first string target whose
 * key matches exactly or as a single-wildcard pattern.
 *
 * Narrower than Node, which prefers the longest matching prefix and reads
 * conditional targets too — so it can only fail a map Node would accept,
 * never pass one Node would reject, for the maps this package declares.
 */
function resolveExport(
  exportsMap: Record<string, unknown>,
  subpath: string,
): string | undefined {
  for (const [key, target] of Object.entries(exportsMap)) {
    if (typeof target === "string") {
      if (key === subpath) {
        return target;
      }

      const [prefix = "", suffix] = key.split("*");

      if (
        suffix !== undefined &&
        subpath.startsWith(prefix) &&
        subpath.endsWith(suffix)
      ) {
        const wildcard = subpath.slice(
          prefix.length,
          subpath.length - suffix.length,
        );
        return target.split("*").join(wildcard);
      }
    }
  }

  return undefined;
}

// A consumer installs only what `files` lists, and Nx resolves an installed
// plugin's `implementation` and `schema` by joining them onto the package
// directory or by `require.resolve` from it — never through a relative path
// into sources the tarball does not carry.
describe("executors.json", () => {
  it("declares exactly the four executors the plugin infers", () => {
    expect.hasAssertions();
    expect(Object.keys(executors).toSorted()).toStrictEqual([
      "breadth",
      "depth",
      "gate",
      "trace",
    ]);
  });

  it.each(Object.keys(executors))(
    "names the %s implementation by package specifier, resolved to the build",
    (executorName) => {
      expect.hasAssertions();

      const subpath = `src/executors/${executorName}/executor`;
      const { implementation } = readExecutor(executorName);

      // `./src/...` resolves against the installed package directory, where
      // only `dist/` ships, so the specifier has to go through `exports`.
      expect(name).toBe("@callidescope/nx");
      expect(implementation).toBe(`${String(name)}/${subpath}`);
      expect(resolveExport(publishedExports, `./${subpath}`)).toBe(
        `./dist/${subpath}.js`,
      );
      expect(resolveExport(packageExports, `./${subpath}`)).toBe(
        `./${subpath}`,
      );
      expect(existsSync(path.join(PACKAGE_DIRECTORY, `${subpath}.ts`))).toBe(
        true,
      );
    },
  );

  it.each(Object.keys(executors))(
    "ships the %s schema in the tarball",
    (executorName) => {
      expect.hasAssertions();

      const { schema } = readExecutor(executorName);

      expect(schema).toBeTypeOf("string");

      const schemaPath = path.posix.normalize(String(schema));

      expect(existsSync(path.join(PACKAGE_DIRECTORY, schemaPath))).toBe(true);
      expect(
        packageFiles.some((pattern) => path.matchesGlob(schemaPath, pattern)),
      ).toBe(true);
    },
  );
});
