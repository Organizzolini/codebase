import { execFile } from "node:child_process";
import { globSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const ENTITIES_DIRECTORY = import.meta.dirname;

const WORKSPACE_ROOT = path.resolve(ENTITIES_DIRECTORY, "../../../../../..");

const ENTITY_FILES = globSync("**/*.entity.ts", {
  cwd: ENTITIES_DIRECTORY,
}).toSorted();

const IMPORT_TIMEOUT_MILLISECONDS = 120_000;

/**
 * Imports one module in a fresh Node process under the SWC loader that
 * codependix, the TypeORM CLI, and the API use. Unlike Vitest's transform,
 * it emits decorator metadata, so an entity cycle whose `design:type` reads
 * a class before its module finishes evaluating throws here.
 */
async function importInFreshProcess(modulePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [
        "--import",
        "@swc-node/register/esm-register",
        "--input-type=module",
        "--eval",
        `await import(${JSON.stringify(pathToFileURL(modulePath).href)});`,
      ],
      { cwd: WORKSPACE_ROOT, timeout: IMPORT_TIMEOUT_MILLISECONDS },
      (error, _standardOutput, standardError) => {
        if (error) {
          reject(new Error(standardError || error.message));
          return;
        }
        resolve(standardError);
      },
    );
  });
}

describe("entities module graph", () => {
  it("finds the entity files", () => {
    expect.hasAssertions();
    expect(ENTITY_FILES.length).toBeGreaterThan(0);
  });

  it.concurrent.each(ENTITY_FILES)(
    "evaluates %s as an entry point with decorator metadata",
    async (entityFile) => {
      expect.hasAssertions();
      await expect(
        importInFreshProcess(path.join(ENTITIES_DIRECTORY, entityFile)),
      ).resolves.not.toContain("Error");
    },
    IMPORT_TIMEOUT_MILLISECONDS,
  );

  it(
    "evaluates the package entry point with decorator metadata",
    async () => {
      expect.hasAssertions();
      await expect(
        importInFreshProcess(
          path.resolve(ENTITIES_DIRECTORY, "../../index.ts"),
        ),
      ).resolves.not.toContain("Error");
    },
    IMPORT_TIMEOUT_MILLISECONDS,
  );
});
