import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { MainModule } from "../../main.module";

import { PathCommand } from "./path.command";

import type { PathCommandOptions } from "./path.types";
import type { MockInstance } from "vitest";

const PROJECT_GRAPH = {
  dependencies: {
    "project-a": [{ source: "project-a", target: "project-b", type: "static" }],
    "project-b": [{ source: "project-b", target: "project-c", type: "static" }],
    "project-c": [],
    "project-isolated": [],
  },
  nodes: {
    "project-a": {
      data: { root: "packages/project-a" },
      name: "project-a",
      type: "lib",
    },
    "project-b": {
      data: { root: "packages/project-b" },
      name: "project-b",
      type: "lib",
    },
    "project-c": {
      data: { root: "packages/project-c" },
      name: "project-c",
      type: "lib",
    },
    "project-isolated": {
      data: { root: "packages/project-isolated" },
      name: "project-isolated",
      type: "lib",
    },
  },
};

describe("path command", () => {
  describe("over a fixture tree", () => {
    let workingDirectory: string;
    let originalWorkingDirectory: string;
    let writeSpy: MockInstance<typeof process.stdout.write>;
    let capturedOutput: string;

    async function run(
      args: string[],
      options: PathCommandOptions = {},
    ): Promise<{ exitCode: number; output: string }> {
      process.chdir(workingDirectory);
      process.exitCode = 0;

      const module = await Test.createTestingModule({
        imports: [MainModule],
      }).compile();
      const command = module.get(PathCommand, { strict: false });

      await command.run(args, options);

      const exitCode =
        typeof process.exitCode === "number" ? process.exitCode : 0;

      process.exitCode = 0;
      process.chdir(originalWorkingDirectory);

      return {
        exitCode: typeof exitCode === "string" ? Number(exitCode) : exitCode,
        output: capturedOutput,
      };
    }

    beforeAll(() => {
      originalWorkingDirectory = process.cwd();
      workingDirectory = realpathSync(
        mkdtempSync(path.join(tmpdir(), "codependix-path-")),
      );

      mkdirSync(path.join(workingDirectory, "packages/project-a/src"), {
        recursive: true,
      });
      mkdirSync(path.join(workingDirectory, "packages/project-b/src"), {
        recursive: true,
      });
      mkdirSync(path.join(workingDirectory, "packages/project-c/src"), {
        recursive: true,
      });
      mkdirSync(path.join(workingDirectory, "packages/project-isolated/src"), {
        recursive: true,
      });

      writeFileSync(
        path.join(workingDirectory, "codependix-graph.json"),
        JSON.stringify(PROJECT_GRAPH),
      );

      writeFileSync(
        path.join(workingDirectory, "codependix.config.ts"),
        [
          "export default {",
          '  include: ["packages/*"],',
          '  projectGraph: "codependix-graph.json",',
          "};",
          "",
        ].join("\n"),
      );

      // TypeScript tsconfig and source files for project-a
      writeFileSync(
        path.join(workingDirectory, "packages/project-a/tsconfig.json"),
        JSON.stringify({
          compilerOptions: { module: "commonjs", target: "es2022" },
          include: ["src/**/*"],
        }),
      );
      writeFileSync(
        path.join(workingDirectory, "packages/project-a/src/index.ts"),
        'import "./helper";\nexport const a = 1;\n',
      );
      writeFileSync(
        path.join(workingDirectory, "packages/project-a/src/helper.ts"),
        'export const helper = "helper";\n',
      );
    });

    beforeEach(() => {
      capturedOutput = "";
      writeSpy = vi
        .spyOn(process.stdout, "write")
        .mockImplementation((chunk: string | Uint8Array) => {
          capturedOutput += chunk.toString();
          return true;
        });
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("reports a path between two Nx projects in markdown format", async () => {
      const { exitCode, output } = await run(["project-a", "project-c"], {
        directory: workingDirectory,
        format: "markdown",
      });

      expect(exitCode).toBe(0);
      expect(output).toContain("### Nx Neighborhood");
      expect(output).toContain("`project-a` → `project-b` → `project-c`");
    });

    it("reports no path connects disconnected Nx projects with exit code 0", async () => {
      const { exitCode, output } = await run(
        ["project-a", "project-isolated"],
        { directory: workingDirectory, format: "markdown" },
      );

      expect(exitCode).toBe(0);
      expect(output).toContain(
        '_No path connects "project-a" to "project-isolated"._',
      );
    });

    it("renders path output as JSON format", async () => {
      const { exitCode, output } = await run(["project-a", "project-b"], {
        directory: workingDirectory,
        format: "json",
      });

      expect(exitCode).toBe(0);

      const parsed = JSON.parse(output) as Record<string, unknown>;

      expect(parsed).toHaveProperty("nxProjects");
    });

    it("renders path output as Mermaid format", async () => {
      const { exitCode, output } = await run(["project-a", "project-b"], {
        directory: workingDirectory,
        format: "mermaid",
      });

      expect(exitCode).toBe(0);
      expect(output).toContain("```mermaid\ngraph LR");
      expect(output).toContain("project_a --> project_b");
    });

    it("reports a path at the file-import level", async () => {
      const { exitCode, output } = await run(
        ["project-a/src/index.ts", "project-a/src/helper.ts"],
        {
          directory: workingDirectory,
          fileImports: true,
          format: "markdown",
          nxProjects: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(output).toContain("### File Imports");
      expect(output).toContain(
        "`project-a/src/index.ts` → `project-a/src/helper.ts`",
      );
    });

    it("exits with code 1 when positional arguments are missing", async () => {
      const { exitCode } = await run(["project-a"], {
        directory: workingDirectory,
      });

      expect(exitCode).toBe(1);
    });
  });
});
