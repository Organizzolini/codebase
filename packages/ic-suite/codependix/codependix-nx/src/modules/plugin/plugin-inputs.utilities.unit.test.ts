import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { resolveToolInputs } from "./plugin-inputs.utilities";

import type * as FileSystemModule from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof FileSystemModule>();

  return {
    ...actual,
    readFileSync: vi.fn<typeof actual.readFileSync>(actual.readFileSync),
    realpathSync: vi.fn<typeof actual.realpathSync>(actual.realpathSync),
  };
});

/** This repository's root, which holds `@codependix/cli` as a workspace package. */
const WORKSPACE_ROOT = path.resolve(
  import.meta.dirname,
  "../../../../../../..",
);

describe(resolveToolInputs, () => {
  it("names the sources of the command line and every workspace package it reaches", () => {
    expect.hasAssertions();

    const inputs = resolveToolInputs(WORKSPACE_ROOT);

    // `{workspaceRoot}` file globs rather than `{ input, projects }`: Nx's
    // affected computation follows the former and ignores the latter.
    expect(inputs).toStrictEqual(
      expect.arrayContaining([
        "{workspaceRoot}/packages/ic-suite/codependix/codependix-cli/package.json",
        "{workspaceRoot}/packages/ic-suite/codependix/codependix-cli/src/**/*",
        "{workspaceRoot}/packages/ic-suite/codependix/codependix-boundaries/src/**/*",
        "{workspaceRoot}/packages/ic-suite/codependix/codependix-nestjs-modules/src/**/*",
        "{workspaceRoot}/packages/logging/src/**/*",
      ]),
    );
    expect(inputs).not.toContain(
      "{workspaceRoot}/packages/ic-suite/codependix/codependix-nx/src/**/*",
    );
  });

  it("names each package once, in a stable order", () => {
    expect.hasAssertions();

    const inputs = resolveToolInputs(WORKSPACE_ROOT);

    expect(inputs).toStrictEqual([...new Set(inputs)].toSorted());
    expect(inputs).toHaveLength(18);
  });

  it("names the installed command line and its codependix packages outside the workspace", () => {
    expect.hasAssertions();

    // A workspace that does not contain `@codependix/cli` installed it from
    // a registry, so its version — not its files — is what changes. Any
    // directory the command line sits outside of stands in for one.
    expect(
      resolveToolInputs(path.join(WORKSPACE_ROOT, "packages/logging")),
    ).toStrictEqual([
      {
        externalDependencies: [
          "@codependix/boundaries",
          "@codependix/cli",
          "@codependix/configuration",
          "@codependix/core",
          "@codependix/output",
        ],
      },
    ]);
  });

  it.each([
    ["has no dependency maps", "{}"],
    ["is not an object", "null"],
  ])(
    "names only the command line itself when its manifest %s",
    (_description, manifest) => {
      expect.hasAssertions();

      vi.mocked(readFileSync).mockReturnValueOnce(manifest);

      expect(resolveToolInputs(WORKSPACE_ROOT)).toStrictEqual([
        "{workspaceRoot}/packages/ic-suite/codependix/codependix-cli/package.json",
        "{workspaceRoot}/packages/ic-suite/codependix/codependix-cli/src/**/*",
      ]);
    },
  );

  it("names nothing rather than throwing when the command line cannot be found", () => {
    expect.hasAssertions();

    vi.mocked(realpathSync).mockImplementationOnce(() => {
      throw new Error("ENOENT");
    });

    // Inference runs while Nx builds the project graph, where a throw stops
    // every command in the workspace.
    expect(resolveToolInputs(WORKSPACE_ROOT)).toStrictEqual([]);
  });
});
