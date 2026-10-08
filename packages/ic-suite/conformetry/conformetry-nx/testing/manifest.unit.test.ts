import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** This package's root, where every manifest sits. */
const PACKAGE_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
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
  const parsed: unknown = JSON.parse(
    readFileSync(path.join(PACKAGE_DIRECTORY, fileName), "utf8"),
  );

  return readRecord(parsed, fileName);
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

/**
 * Resolves one subpath through an `exports` map: the first string target whose
 * key matches exactly or as a single-wildcard pattern.
 *
 * Simpler than Node, which prefers the longest matching prefix, honours `null`
 * exclusions and reads conditional targets. That is enough for the flat maps
 * this package declares, where one string key matches each subpath; a map
 * with overlapping keys or `null` targets would need Node's full rules.
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
        return target.replace(
          "*",
          subpath.slice(prefix.length, subpath.length - suffix.length),
        );
      }
    }
  }

  return undefined;
}

/**
 * The two Nx manifests this package ships: the collection key inside each, the
 * field that names the code, the folder and module that code lives in, and the
 * entries the manifest must declare.
 */
const MANIFESTS = [
  {
    codeField: "implementation",
    collection: "executors",
    entries: ["validate"],
    fileName: "executors.json",
    folder: "src/executors",
    module: "executor",
  },
  {
    codeField: "factory",
    collection: "generators",
    entries: ["sync"],
    fileName: "generators.json",
    folder: "src/generators",
    module: "generator",
  },
];

// A consumer installs only what `files` lists, and Nx resolves an installed
// plugin's `implementation`, `factory` and `schema` by joining them onto the
// package directory or by `require.resolve` from it — never through a relative
// path into sources the tarball does not carry.
describe.each(MANIFESTS)(
  "$fileName",
  ({ codeField, collection, entries, fileName, folder, module }) => {
    const collectionEntries = readRecord(
      readManifest(fileName)[collection],
      collection,
    );

    /** One entry of this manifest's collection. */
    function readEntry(entryName: string): Record<string, unknown> {
      return readRecord(collectionEntries[entryName], entryName);
    }

    it(`declares exactly the ${collection} the plugin ships`, () => {
      expect.hasAssertions();
      expect(Object.keys(collectionEntries).toSorted()).toStrictEqual(entries);
    });

    it.each(Object.keys(collectionEntries))(
      `names the %s ${codeField} by package specifier, resolved to the build`,
      (entryName) => {
        expect.hasAssertions();

        const subpath = `${folder}/${entryName}/${module}`;

        // `./src/...` resolves against the installed package directory, where
        // only `dist/` ships, so the specifier has to go through `exports`.
        expect(name).toBe("@conformetry/nx");
        expect(readEntry(entryName)[codeField]).toBe(
          `${String(name)}/${subpath}`,
        );
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

    it.each(Object.keys(collectionEntries))(
      "ships the %s schema in the tarball",
      (entryName) => {
        expect.hasAssertions();

        const { schema } = readEntry(entryName);

        expect(schema).toBeTypeOf("string");

        const schemaPath = path.posix.normalize(String(schema));

        expect(existsSync(path.join(PACKAGE_DIRECTORY, schemaPath))).toBe(true);
        expect(
          packageFiles.some((pattern) => path.matchesGlob(schemaPath, pattern)),
        ).toBe(true);
      },
    );
  },
);
