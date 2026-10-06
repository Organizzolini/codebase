import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/** This package's root, and the workspace root every command runs from. */
const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const workspaceRoot = path.resolve(packageDirectory, "..", "..", "..", "..");
const examplesDirectory = path.join(packageDirectory, "examples");

/** How the guides say to run the command-line host from the workspace root. */
const CONFORMETRY_COMMAND = [
  "--import",
  "@swc-node/register/esm-register",
  "packages/ic-suite/conformetry/conformetry-cli/src/main.ts",
];

/** The environment every documented command needs, and nothing more. */
const COMMAND_ENVIRONMENT = {
  SWC_NODE_PROJECT:
    "packages/ic-suite/conformetry/conformetry-cli/tsconfig.json",
};

/** What one example's documented commands are supposed to do. */
interface ExampleExpectation {
  /** Text the run must not print, for an example whose point is an absence. */
  readonly absent?: string[];
  /** Exit code of the run — non-zero wherever the drift is deliberate. */
  readonly exitCode: number;
  /** Text the run must print, quoted from the example's own guide. */
  readonly present: string[];
}

/**
 * Every example, and the outcome its guide promises.
 *
 * Keyed by directory name and checked against the directory listing below, so
 * an example added without an expectation fails rather than going unchecked. This
 * is what keeps the guides honest: each one quotes output this table asserts.
 */
const EXPECTATIONS: Record<string, ExampleExpectation> = {
  "ambiguous-attribution": {
    exitCode: 1,
    present: [
      "instances/guide 2/2 files 100%",
      "instances/guide 1/2 files 50%",
      "instances/atlas 1/2 files 50%",
      "Ambiguous instance: matches digest, overview equally well",
    ],
  },
  "case-variants": { exitCode: 0, present: ["All checked files conform."] },
  "drift-catalogue": {
    exitCode: 1,
    present: [
      "5 below threshold",
      "Missing file:",
      "Missing directory:",
      "Missing comment // 🎯 Service",
      "Missing FirstStatement",
      'Missing ClassDeclaration "RenamedClassService"',
    ],
  },
  embedding: {
    exitCode: 0,
    present: ["Generated 1 file(s) into", "All checked files conform."],
  },
  "failure-modes": {
    exitCode: 1,
    present: ["All checked files conform.", "Could not infer {{owner}}"],
  },
  "hello-template": { exitCode: 0, present: ["All checked files conform."] },
  "language-validators": {
    exitCode: 0,
    present: ["All checked files conform."],
  },
  "nx-host": {
    exitCode: 0,
    present: [
      "No instances were found.",
      "All checked files conform.",
      // A narrowed run names the host that can locate what this one cannot,
      // rather than rendering an empty findings list as a clean report.
      "locates instances by project tag, which this host cannot resolve",
    ],
  },
  "scoring-thresholds": {
    exitCode: 0,
    present: [
      "meets threshold 75.0%",
      "0 below threshold",
      'Missing markdown heading: "Contents"',
    ],
  },
  "structural-not-textual": {
    // The reformatted instance is the point: it must not appear as a finding.
    absent: ["reformatted.service.ts"],
    exitCode: 1,
    present: [
      "1 below threshold",
      "dropped-export.service.ts",
      "Missing comment /** Title the report carries when nobody sets one. */",
    ],
  },
  "two-directions": {
    exitCode: 0,
    present: [
      "card 2/2 files 100%",
      "panel 2/2 files 100%",
      "panel 1/2 files 50%",
    ],
  },
};

/**
 * The examples whose committed instance is exactly what the generator writes.
 *
 * Rendering happens twice — once to generate, once to compare — so an instance
 * a reader is told to copy has to be byte-identical to generated output, or the
 * example teaches a file that would fail the very check it demonstrates.
 */
const ROUND_TRIPS = [
  {
    directory: "hello-template",
    generator: "hello",
    inputs: ["--name", "world"],
    instance: "world",
  },
  {
    directory: "case-variants",
    generator: "case-variants",
    inputs: [
      "--name",
      "search bar",
      "--nameCamelCase",
      "spelledOutByHand",
      "--owner",
      "platform",
    ],
    instance: "search-bar",
  },
];

/** The two guides that index the examples, and must keep naming all of them. */
const guides = ["README.md", "AGENTS.md"].map((name) => ({
  contents: fs.readFileSync(path.join(packageDirectory, name), "utf8"),
  name,
}));

/** Every example directory this package ships, read rather than listed. */
const exampleDirectories = fs
  .readdirSync(examplesDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted();

/** As much of `project.json` as this suite reads, and no more. */
interface ProjectManifest {
  readonly targets: Record<
    string,
    {
      readonly options?: {
        readonly command?: string;
        readonly commands?: string[];
      };
    }
  >;
}

/** The project's targets, which is where the documented commands live. */
const projectManifest = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, "project.json"), "utf8"),
) as ProjectManifest;

/** The shell commands one example's Nx target runs, in order. */
const readTargetCommands = (target: string): string[] => {
  const options = projectManifest.targets[target]?.options;

  if (options?.command !== undefined) {
    return [options.command];
  }

  return options?.commands ?? [];
};

/** One run of an example's documented commands, stopped at the first failure. */
const runExample = (target: string): { exitCode: number; output: string } => {
  const commands = readTargetCommands(target);
  let output = "";

  for (const command of commands) {
    const result = spawnSync(command, {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, ...COMMAND_ENVIRONMENT },
      shell: true,
    });

    output += `${result.stdout}${result.stderr}`;

    if (result.status !== 0) {
      return { exitCode: result.status ?? 1, output };
    }
  }

  return { exitCode: 0, output };
};

/** Every file under one directory, as paths relative to it. */
const readFileTree = (directory: string): Record<string, string> => {
  const entries = fs.readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  });

  return Object.fromEntries(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const absolutePath = path.join(entry.parentPath, entry.name);

        return [
          path.relative(directory, absolutePath),
          fs.readFileSync(absolutePath, "utf8"),
        ];
      }),
  );
};

describe("the examples this package ships", () => {
  it("expects an outcome from every example directory", () => {
    expect(Object.keys(EXPECTATIONS).toSorted()).toStrictEqual(
      exampleDirectories,
    );
  });

  describe.each(exampleDirectories)("%s", (directory) => {
    it("carries a guide and a configuration of its own", () => {
      expect(
        fs.existsSync(path.join(examplesDirectory, directory, "README.md")),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(examplesDirectory, directory, "conformetry.config.ts"),
        ),
      ).toBe(true);
    });

    it("is runnable as a target of the same name", () => {
      expect(readTargetCommands(directory).length).toBeGreaterThan(0);
    });

    it.each(guides)("is indexed by $name", ({ contents }) => {
      expect(contents).toContain(`examples/${directory}/README.md`);
    });

    it("behaves the way its guide says", () => {
      const expectation = EXPECTATIONS[directory];

      expect(expectation).toBeDefined();

      const { exitCode, output } = runExample(directory);

      for (const text of expectation?.present ?? []) {
        expect(output).toContain(text);
      }

      for (const text of expectation?.absent ?? []) {
        expect(output).not.toContain(text);
      }

      expect(exitCode).toBe(expectation?.exitCode);
    });
  });

  describe("the instances a reader is told to copy", () => {
    it.each(ROUND_TRIPS)(
      "$directory generates its committed instance byte for byte",
      ({ directory, generator, inputs, instance }) => {
        const outputDirectory = fs.mkdtempSync(
          path.join(os.tmpdir(), `conformetry-examples-${directory}-`),
        );
        const result = spawnSync(
          "node",
          [
            ...CONFORMETRY_COMMAND,
            "generate",
            "--template",
            generator,
            "--config",
            `packages/ic-suite/conformetry/conformetry-examples/examples/${directory}/conformetry.config.ts`,
            "--directory",
            outputDirectory,
            ...inputs,
          ],
          {
            cwd: workspaceRoot,
            encoding: "utf8",
            env: { ...process.env, ...COMMAND_ENVIRONMENT },
          },
        );

        expect(`${result.stdout}${result.stderr}`).toContain(outputDirectory);
        expect(result.status).toBe(0);
        expect(
          readFileTree(path.join(outputDirectory, instance)),
        ).toStrictEqual(
          readFileTree(
            path.join(examplesDirectory, directory, "instances", instance),
          ),
        );

        fs.rmSync(outputDirectory, { force: true, recursive: true });
      },
    );
  });
});
