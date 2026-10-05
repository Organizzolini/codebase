import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createFixtureTree, removeFixtureTree } from "../testing/fixture-tree";

import { environmentSchema } from "./constants";

import type { CodometerReport } from "@codometer/core";

const COMMAND_PATH = path.resolve(import.meta.dirname, "main.ts");

/**
 * Where a spawned run's own fixture tree is rooted, inside this project
 * rather than the system temporary directory.
 *
 * A spawned run no longer takes a `--directory` flag — it always measures the
 * process's own working directory — so a suite pointing one at a fixture tree
 * spawns with that tree as `cwd`. `@swc-node/register` resolves both its own
 * dependencies and this project's TypeScript path aliases from `cwd` upward
 * through each ancestor's `node_modules` and `tsconfig.json`, and a tree
 * outside the workspace entirely never reaches either. `tmp/` is gitignored
 * everywhere in this repository, so a fixture rooted here is never committed.
 */
const FIXTURE_ROOT = path.resolve(import.meta.dirname, "../tmp");

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({});
    });
  });

  // Run as a real process rather than through the testing module, because the
  // thing under test is which file descriptor each byte came out of — and a
  // logger writing through a transport worker cannot be observed any other way.
  describe("the streams the command writes to", () => {
    let standardOutput: string;
    let standardError: string;
    let workingDirectory: string;

    beforeAll(() => {
      mkdirSync(FIXTURE_ROOT, { recursive: true });
      workingDirectory = createFixtureTree(FIXTURE_ROOT);

      writeFileSync(
        path.join(workingDirectory, "codometer.config.json"),
        JSON.stringify({
          excludeFrom: [".codometerignore"],
          format: "json",
        }),
      );
      // `@swc-node/register` looks for a `tsconfig.json` at `cwd` exactly,
      // never climbing to an ancestor's — so the fixture tree needs its own,
      // extending this project's real one to resolve the workspace's
      // TypeScript path aliases the same way this project's own build does.
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
          "measure",
          "--config",
          path.join(workingDirectory, "codometer.config.json"),
          // The report goes to the console, and the badge block goes into a
          // file — so there is a written file to announce and nothing but the
          // report on standard output.
          "--format",
          "json",
          "--output-markdown",
          path.join(workingDirectory, "README.md"),
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
      removeFixtureTree(workingDirectory);
    });

    // `codometer --format json > report.json` has to produce a file something
    // can parse. A diagnostic sharing that stream is not a note beside the
    // data, it is a corruption of it.
    it("puts nothing but the report on standard output", () => {
      expect.hasAssertions();

      const report = JSON.parse(standardOutput) as CodometerReport;

      expect(report.targets[0]?.name).toBe("codebase");
      expect(report.targets[0]?.metrics.length).toBeGreaterThan(0);
    });

    it("still states plainly which files it left out, on standard error", () => {
      expect.hasAssertions();

      expect(standardError).toContain(
        "Excluded the files codometer writes from what it measures",
      );
      expect(standardError).toContain("README.md");
    });
  });

  // The listing this command exists to produce has to survive a tree whose
  // root carries no configuration file — which is every workspace that states
  // its required `format` once in a shared object each project spreads. Run as
  // a real process because the exit code is half of what is under test, and
  // nothing beneath the command line reports one.
  describe("the configuration command over a tree whose root configures nothing", () => {
    let standardOutput: string;
    let standardError: string;
    let exitCode: null | number;
    let workingDirectory: string;

    beforeAll(() => {
      workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-listing-"));

      mkdirSync(path.join(workingDirectory, "packages", "logging"), {
        recursive: true,
      });
      // One project configures itself. Nothing above it does, and the upward
      // search runs out at the filesystem root.
      writeFileSync(
        path.join(workingDirectory, "packages/logging/codometer.config.json"),
        JSON.stringify({
          format: "json",
          limits: [{ label: "Bundle", metric: "codebase.size", value: 6000 }],
        }),
      );

      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "@swc-node/register/esm-register",
          COMMAND_PATH,
          "configuration",
          "--directory",
          workingDirectory,
          "--limits",
        ],
        {
          encoding: "utf8",
          env: { ...process.env, FORCE_COLOR: "0" },
          timeout: 120_000,
        },
      );

      exitCode = result.status;
      standardError = result.stderr;
      standardOutput = result.stdout;
    }, 150_000);

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("still lists every limit the tree declares", () => {
      expect.hasAssertions();

      expect(standardOutput).toContain("Bundle");
      expect(standardOutput).toContain("`codebase.size`");
      expect(standardOutput).toContain(
        "`packages/logging/codometer.config.json`",
      );
    });

    it("says the walk root answered with nothing, rather than dying on it", () => {
      expect.hasAssertions();

      expect(standardOutput).toContain("Nothing answered for the walk root");
      expect(standardError).toContain(
        "Found no configuration answering for the walk root",
      );
    });

    it("fails the run rather than exiting clean", () => {
      expect.hasAssertions();
      expect(exitCode).toBe(1);
    });
  });

  describe("the changes command", () => {
    let workingDirectory: string;
    let outputPath: string;

    beforeAll(() => {
      workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-changes-"));
      outputPath = path.join(workingDirectory, "section.md");

      mkdirSync(path.join(workingDirectory, "packages", "logging"), {
        recursive: true,
      });
      mkdirSync(
        path.join(workingDirectory, ".baseline", "packages", "logging"),
        { recursive: true },
      );

      writeFileSync(
        path.join(
          workingDirectory,
          ".baseline/packages/logging/codometer-report.json",
        ),
        JSON.stringify({
          targets: [
            {
              empty: false,
              metrics: [
                {
                  limits: [],
                  name: "logging.size",
                  unit: "bytes",
                  value: 1000,
                },
              ],
              name: "logging",
            },
          ],
        }),
      );
      writeFileSync(
        path.join(workingDirectory, "packages/logging/codometer-report.json"),
        JSON.stringify({
          targets: [
            {
              empty: false,
              metrics: [
                {
                  limits: [],
                  name: "logging.size",
                  unit: "bytes",
                  value: 1200,
                },
              ],
              name: "logging",
            },
          ],
        }),
      );

      spawnSync(
        process.execPath,
        [
          "--import",
          "@swc-node/register/esm-register",
          COMMAND_PATH,
          "changes",
          "--directory",
          workingDirectory,
          "--baseline",
          ".baseline",
          "--output",
          outputPath,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, FORCE_COLOR: "0" },
          timeout: 120_000,
        },
      );
    }, 150_000);

    afterAll(() => {
      rmSync(workingDirectory, { force: true, recursive: true });
    });

    it("writes a report naming the project whose metric changed", () => {
      expect.hasAssertions();

      const written = readFileSync(outputPath, "utf8");

      expect(written).toContain("## ⏲️ Codometer");
      expect(written).toContain("`logging`");
      expect(written).toContain("1.20 kB");
      expect(written).toContain("1.00 kB");
    });
  });
});
