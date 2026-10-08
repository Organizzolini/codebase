import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

const COMMAND_PATH = path.resolve(import.meta.dirname, "main.ts");

const FIXTURE_ROOT = path.resolve(import.meta.dirname, "../tmp");

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({});
    });
  });

  describe("the streams the command writes to", () => {
    let standardOutput: string;
    let standardError: string;
    let workingDirectory: string;

    beforeAll(() => {
      mkdirSync(FIXTURE_ROOT, { recursive: true });
      workingDirectory = mkdtempSync(
        path.join(FIXTURE_ROOT, "codependix-cli-stream-test-"),
      );

      writeFileSync(
        path.join(workingDirectory, "codependix.config.json"),
        JSON.stringify({
          include: [],
          workspace: {
            nxProjects: {
              json: {
                path: "codependix-nx-projects.json",
              },
              target: "json",
            },
          },
        }),
      );

      writeFileSync(
        path.join(workingDirectory, "tsconfig.json"),
        JSON.stringify({
          extends: path.relative(
            workingDirectory,
            path.resolve(import.meta.dirname, "../tsconfig.json"),
          ),
        }),
      );

      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "@swc-node/register/esm-register",
          COMMAND_PATH,
          "map",
          "--config",
          path.join(workingDirectory, "codependix.config.json"),
          "--format",
          "json",
          "--write",
        ],
        {
          cwd: workingDirectory,
          encoding: "utf8",
          env: { ...process.env, FORCE_COLOR: "0" },
          timeout: 120_000,
        },
      );

      standardError = result.stderr;
      standardOutput = result.stdout;
    }, 150_000);

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("puts nothing but valid combined JSON on standard output", () => {
      expect.hasAssertions();

      expect(() => {
        JSON.parse(standardOutput);
      }).not.toThrow();
    });

    it("puts diagnostic log messages on standard error", () => {
      expect.hasAssertions();

      expect(standardError).toContain("ReportingService");
    });
  });

  describe("a boundaries-only run printing its report", () => {
    let workingDirectory: string;

    /** Runs `--check boundaries` over the fixture with the given extra flags. */
    function runBoundaries(flags: string[]): {
      exitCode: null | number;
      standardError: string;
      standardOutput: string;
    } {
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "@swc-node/register/esm-register",
          COMMAND_PATH,
          "map",
          "--config",
          path.join(workingDirectory, "codependix.config.json"),
          "--check",
          "boundaries",
          "--projects",
          "a",
          ...flags,
        ],
        {
          cwd: workingDirectory,
          encoding: "utf8",
          env: { ...process.env, FORCE_COLOR: "0" },
          timeout: 120_000,
        },
      );

      return {
        exitCode: result.status,
        standardError: result.stderr,
        standardOutput: result.stdout,
      };
    }

    beforeAll(() => {
      mkdirSync(FIXTURE_ROOT, { recursive: true });
      workingDirectory = mkdtempSync(
        path.join(FIXTURE_ROOT, "codependix-cli-boundaries-test-"),
      );

      // a ⇄ b is a cycle, and c depends on a.
      writeFileSync(
        path.join(workingDirectory, "codependix-graph.json"),
        JSON.stringify({
          dependencies: {
            a: [{ source: "a", target: "b", type: "static" }],
            b: [{ source: "b", target: "a", type: "static" }],
            c: [{ source: "c", target: "a", type: "static" }],
          },
          nodes: Object.fromEntries(
            ["a", "b", "c"].map((name) => [
              name,
              { data: { root: `packages/${name}` }, name, type: "lib" },
            ]),
          ),
        }),
      );
      writeFileSync(
        path.join(workingDirectory, "codependix.config.json"),
        JSON.stringify({
          boundaries: {
            nxProjects: [{ kind: "acyclic", name: "no-cycles" }],
          },
          include: [],
          projectGraph: "codependix-graph.json",
        }),
      );
      writeFileSync(
        path.join(workingDirectory, "tsconfig.json"),
        JSON.stringify({
          extends: path.relative(
            workingDirectory,
            path.resolve(import.meta.dirname, "../tsconfig.json"),
          ),
        }),
      );
    });

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("puts nothing but a parseable report with a boundaries key on standard output", () => {
      expect.hasAssertions();

      const { exitCode, standardOutput } = runBoundaries(["--format", "json"]);
      const report = JSON.parse(standardOutput) as {
        boundaries: {
          judgedProjects: string[];
          violations: { projects: string[]; verdict: string }[];
        };
      };

      expect(exitCode).toBe(1);
      expect(report.boundaries.judgedProjects).toStrictEqual(["a"]);
      expect(report.boundaries.violations).toHaveLength(1);
      expect(report.boundaries.violations[0]).toMatchObject({
        projects: ["a", "b"],
        verdict: "fail",
      });
    });

    it("logs on standard error and prints nothing without a format flag", () => {
      expect.hasAssertions();

      const { exitCode, standardError, standardOutput } = runBoundaries([]);

      expect(exitCode).toBe(1);
      expect(standardOutput).toBe("");
      expect(standardError).toContain("boundary violations");
    });
  });
});
