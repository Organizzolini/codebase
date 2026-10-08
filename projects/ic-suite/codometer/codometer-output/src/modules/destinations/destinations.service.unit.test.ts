import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DestinationsService } from "./destinations.service";

import type { ResolveDestinationsResult } from "./destinations.types";
import type {
  MeasureCommandOptions,
  ResolvedCodometerConfiguration,
} from "@codometer/configuration";

/** Builds a resolved configuration with the given output destinations. */
function buildConfiguration(
  outputs: ResolvedCodometerConfiguration["outputs"] = [],
): ResolvedCodometerConfiguration {
  return {
    custom: [],
    defaultInput: undefined,
    exclude: [],
    excludeFrom: [],
    format: "markdown",
    inputs: [],
    limits: [],
    outputs,
    python: { command: "python3" },
  };
}

const markdownOutput = {
  custom: [],
  description: "Repository statistics.",
  endMarker: "<!-- END -->",
  path: "README.md",
  startMarker: "<!-- START -->",
  type: "markdown" as const,
  write: undefined,
};

const jsonOutput = {
  custom: [],
  indentation: 4,
  path: "configured.json",
  type: "json" as const,
};

describe(DestinationsService, () => {
  let service: DestinationsService;

  /** Resolves the destinations for one command line at `/repo`. */
  function resolve(
    options: MeasureCommandOptions = {},
    configuration = buildConfiguration(),
  ): ResolveDestinationsResult {
    return service.resolveDestinations({
      configuration,
      options,
      workingDirectory: "/repo",
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DestinationsService],
    }).compile();

    service = await module.resolve(DestinationsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("where the output goes", () => {
    it("writes no file when nothing names a destination", () => {
      expect(resolve()).toStrictEqual({
        destinations: { json: undefined, markdown: undefined },
        errors: [],
      });
    });

    it("reads a configured markdown destination as the markdown destination", () => {
      const { destinations, errors } = resolve(
        { outputMarkdown: true },
        buildConfiguration([markdownOutput]),
      );

      expect(errors).toStrictEqual([]);
      expect(destinations).toStrictEqual({
        json: undefined,
        markdown: { ...markdownOutput, path: "/repo/README.md" },
      });
    });

    it("lets --output-markdown override the configured path", () => {
      const { destinations } = resolve(
        { outputMarkdown: "docs/statistics.md" },
        buildConfiguration([markdownOutput]),
      );

      expect(destinations.markdown?.path).toBe("/repo/docs/statistics.md");
      // The markers and the description travel with it.
      expect(destinations.markdown?.startMarker).toBe("<!-- START -->");
    });

    it("keeps a configured write function as a destination of its own", () => {
      const write = (): boolean => true;
      const { destinations, errors } = resolve(
        { outputMarkdown: true },
        buildConfiguration([{ ...markdownOutput, path: undefined, write }]),
      );

      expect(errors).toStrictEqual([]);
      expect(destinations.markdown?.path).toBeUndefined();
      expect(destinations.markdown?.write).toBe(write);
    });

    it("applies the default markers to an --output-markdown path with no configured markdown output", () => {
      expect(
        resolve({ outputMarkdown: "docs/statistics.md" }).destinations,
      ).toMatchObject({
        markdown: {
          custom: [],
          description: undefined,
          endMarker: "<!-- codometer:end -->",
          path: "/repo/docs/statistics.md",
          startMarker: "<!-- codometer:start -->",
          write: undefined,
        },
      });
    });

    // Nothing configured, and no path given either: there is nowhere to
    // write it, so this is refused before anything is measured.
    it("refuses a bare --output-markdown with no configured markdown output", () => {
      const { destinations, errors } = resolve({ outputMarkdown: true });

      expect(destinations.markdown).toBeUndefined();
      expect(errors).toStrictEqual([
        expect.stringContaining("--output-markdown needs a path") as string,
      ]);
    });

    it("resolves a report path against the measured directory", () => {
      const { destinations, errors } = resolve(
        { outputJson: "reports/statistics.json" },
        buildConfiguration([jsonOutput]),
      );

      expect(errors).toStrictEqual([]);
      expect(destinations.json).toStrictEqual({
        custom: [],
        indentation: 4,
        path: "/repo/reports/statistics.json",
      });
    });

    it("gives the report the default indentation when nothing configured one", () => {
      expect(
        resolve({ outputJson: "statistics.json" }).destinations.json
          ?.indentation,
      ).toBe(2);
    });

    // Nothing configured, and no path given either: there is nowhere to
    // write it, so this is refused before anything is measured.
    it("refuses a bare --output-json with no configured json output", () => {
      const { destinations, errors } = resolve({ outputJson: true });

      expect(destinations.json).toBeUndefined();
      expect(errors).toStrictEqual([
        expect.stringContaining("--output-json needs a path") as string,
      ]);
    });

    // A command line that names one destination names them all. Adding to the
    // configured set instead would write a file the command line never asked
    // for.
    it("lets a named destination stand for all of them", () => {
      const { destinations } = resolve(
        { outputJson: "statistics.json" },
        buildConfiguration([jsonOutput, markdownOutput]),
      );

      expect(destinations.json).toStrictEqual({
        custom: [],
        indentation: 4,
        path: "/repo/statistics.json",
      });
      expect(destinations.markdown).toBeUndefined();
    });

    it("drops a configured report when only --output-markdown names a destination", () => {
      const { destinations } = resolve(
        { outputMarkdown: "docs/statistics.md" },
        buildConfiguration([jsonOutput]),
      );

      expect(destinations.json).toBeUndefined();
      expect(destinations.markdown?.path).toBe("/repo/docs/statistics.md");
    });

    it("never fires a configured write function for a run that named --output-json", () => {
      const { destinations } = resolve(
        { outputJson: "statistics.json" },
        buildConfiguration([
          {
            ...markdownOutput,
            path: undefined,
            write: (): boolean => true,
          },
        ]),
      );

      expect(destinations.markdown).toBeUndefined();
    });
  });

  describe("what the console renders", () => {
    // The regression this exists for: `--output-json` alone used to make the
    // console fall back to the empty default, silently dropping every
    // configured custom counter even though a markdown output was declared.
    it("resolves the configured markdown destination even when only --output-json was passed", () => {
      const consoleMarkdown = service.resolveConsoleMarkdown({
        configuration: buildConfiguration([markdownOutput]),
        options: { outputJson: true },
        workingDirectory: "/repo",
      });

      expect(consoleMarkdown).toStrictEqual({
        ...markdownOutput,
        path: "/repo/README.md",
      });
    });

    it("resolves nothing when the configuration names no markdown output", () => {
      const consoleMarkdown = service.resolveConsoleMarkdown({
        configuration: buildConfiguration(),
        options: { outputJson: true },
        workingDirectory: "/repo",
      });

      expect(consoleMarkdown).toBeUndefined();
    });

    it("still honors an explicit --output-markdown path", () => {
      const consoleMarkdown = service.resolveConsoleMarkdown({
        configuration: buildConfiguration([markdownOutput]),
        options: { outputMarkdown: "docs/statistics.md" },
        workingDirectory: "/repo",
      });

      expect(consoleMarkdown?.path).toBe("/repo/docs/statistics.md");
    });
  });

  describe("what it excludes from measurement", () => {
    it("lists every file the run writes, relative to the directory", () => {
      const { destinations } = resolve(
        { outputJson: "reports/statistics.json", outputMarkdown: "README.md" },
        buildConfiguration([markdownOutput]),
      );

      expect(
        service.listOutputPaths({ destinations, workingDirectory: "/repo" }),
      ).toStrictEqual(["reports/statistics.json", "README.md"]);
    });

    it("lists nothing when the run names no file at all", () => {
      expect(
        service.listOutputPaths({
          destinations: resolve().destinations,
          workingDirectory: "/repo",
        }),
      ).toStrictEqual([]);
    });
  });

  describe("what the run is measuring", () => {
    // Real directories rather than a mocked filesystem: the whole question is
    // whether a marker is on disk beside the measured directory.
    const root = mkdtempSync(path.join(tmpdir(), "codometer-scope-"));

    it("calls a directory carrying a repository marker a repository", () => {
      mkdirSync(path.join(root, ".git"), { recursive: true });

      expect(service.selectScope(root)).toBe("repository");
    });

    it("calls a workspace file a repository marker too", () => {
      const workspace = mkdtempSync(path.join(tmpdir(), "codometer-scope-"));

      writeFileSync(
        path.join(workspace, "pnpm-workspace.yaml"),
        "packages: []\n",
        "utf8",
      );

      expect(service.selectScope(workspace)).toBe("repository");
    });

    it("calls a directory beneath one a project", () => {
      const project = path.join(root, "packages", "logger");

      mkdirSync(project, { recursive: true });

      expect(service.selectScope(project)).toBe("project");
    });
  });
});
