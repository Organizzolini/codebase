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
});
