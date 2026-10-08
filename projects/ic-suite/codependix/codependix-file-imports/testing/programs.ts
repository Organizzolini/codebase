import ts from "typescript";

import type { TypescriptProjectProgram } from "../src/modules/typescript/typescript.types";

/** Root every in-memory fixture file is written under. */
export const FIXTURE_ROOT = "/workspace/packages/example";

/** The project an in-memory fixture belongs to. */
export const FIXTURE_PROJECT = {
  absoluteRoot: FIXTURE_ROOT,
  name: "example",
  tsconfigPath: `${FIXTURE_ROOT}/tsconfig.json`,
};

/**
 * Builds a real program over files that only exist in memory, resolved under
 * NodeNext module resolution.
 *
 * Mirrors `callidescope-cli`'s `buildFixtureProgram`: `noLib` keeps fixtures
 * fast and focused, and a hand-built compiler host stands in for the real
 * file system so `ts.resolveModuleName` still runs its real resolution
 * algorithm against files that were never written to disk. NodeNext is what
 * this workspace's own projects use, so a fixture importing `"./helper.js"`
 * exercises the same `.js`-to-`.ts` extension mapping `ImportGraphService`
 * has to get right against real projects.
 */
export function buildFixtureProgram(
  files: Record<string, string>,
): TypescriptProjectProgram {
  const rawFiles = new Map<string, string>();
  const sources = new Map<string, ts.SourceFile>();

  for (const [name, text] of Object.entries(files)) {
    const fileName = `${FIXTURE_ROOT}/${name}`;
    rawFiles.set(fileName, text);

    if (name.endsWith(".json")) continue;

    sources.set(
      fileName,
      ts.createSourceFile(
        fileName,
        text,
        ts.ScriptTarget.ES2022,
        true,
        name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      ),
    );
  }

  const host: ts.CompilerHost = {
    directoryExists: () => true,
    fileExists: (fileName) => rawFiles.has(fileName),
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => FIXTURE_ROOT,
    getDefaultLibFileName: () => "lib.d.ts",
    getDirectories: () => [],
    getNewLine: () => "\n",
    getSourceFile: (fileName) => sources.get(fileName),
    readFile: (fileName) => rawFiles.get(fileName),
    realpath: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => undefined,
  };
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noLib: true,
    target: ts.ScriptTarget.ES2022,
  };
  const program = ts.createProgram({
    host,
    options,
    // "node_modules/" fixture files stand in for an external package: present
    // on the fixture's host so resolution can find them, but never a root
    // file, the same way a real dependency is never part of the project's own
    // owned files.
    rootNames: [...sources.keys()].filter(
      (fileName) => !fileName.includes("/node_modules/"),
    ),
  });

  return { host, options, program, project: FIXTURE_PROJECT };
}
