import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AnchorsService } from "../anchors/anchors.service";

import { CombinedOutputService } from "./combined-output.service";

import type { CombinedGraphExports } from "../graph-run/graph-run.types";
import type { MockInstance } from "vitest";

describe(CombinedOutputService, () => {
  let service: CombinedOutputService;
  let workingDirectory: string;
  let writeSpy: MockInstance<typeof process.stdout.write>;

  const GRAPHS: CombinedGraphExports = {
    fileImports: {
      json: { edges: [], fileNames: [] },
      markdown: "```mermaid\nfile-imports\n```",
    },
    nxProjects: {
      json: { projectNames: [] },
      markdown: "```mermaid\nnx-projects\n```",
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AnchorsService, CombinedOutputService],
    }).compile();

    service = await module.resolve(CombinedOutputService);
  });

  beforeEach(async () => {
    workingDirectory = await mkdtemp(
      path.join(tmpdir(), "combined-output-service-"),
    );
    writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveFormat", () => {
    it("defaults to markdown when the flag was left off entirely", () => {
      expect(service.resolveFormat(undefined)).toStrictEqual({
        errors: [],
        format: "markdown",
      });
    });

    it("accepts json", () => {
      expect(service.resolveFormat("json")).toStrictEqual({
        errors: [],
        format: "json",
      });
    });

    it("accepts markdown", () => {
      expect(service.resolveFormat("markdown")).toStrictEqual({
        errors: [],
        format: "markdown",
      });
    });

    it("rejects an unknown value, falling back to markdown", () => {
      expect(service.resolveFormat("yaml")).toStrictEqual({
        errors: [
          '--format does not accept "yaml". It takes one of "json" and "markdown", as in "--format markdown".',
        ],
        format: "markdown",
      });
    });
  });

  describe("run", () => {
    it("prints the combined graphs as JSON to standard output when --format json", () => {
      service.run({
        format: "json",
        graphs: GRAPHS,
        jsonOutputPath: undefined,
        markdownOutputPath: undefined,
        workingDirectory,
      });

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('"fileImports"') as string,
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('"nxProjects"') as string,
      );
    });

    it("prints the combined graphs as an anchor-spliced Markdown document when --format markdown", () => {
      service.run({
        format: "markdown",
        graphs: GRAPHS,
        jsonOutputPath: undefined,
        markdownOutputPath: undefined,
        workingDirectory,
      });

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining("## 🕸️ Codependix") as string,
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining("file-imports") as string,
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining("nx-projects") as string,
      );
    });

    it("writes every active graph type's data to --json-output, keyed by graph type", async () => {
      service.run({
        format: "markdown",
        graphs: GRAPHS,
        jsonOutputPath: "combined.json",
        markdownOutputPath: undefined,
        workingDirectory,
      });

      const written = JSON.parse(
        await readFile(path.join(workingDirectory, "combined.json"), "utf8"),
      ) as unknown;

      expect(written).toStrictEqual({
        fileImports: { edges: [], fileNames: [] },
        nxProjects: { projectNames: [] },
      });
    });

    it("writes every active graph type's own anchor-spliced section to --markdown-output", async () => {
      service.run({
        format: "markdown",
        graphs: GRAPHS,
        jsonOutputPath: undefined,
        markdownOutputPath: "combined.md",
        workingDirectory,
      });

      const written = await readFile(
        path.join(workingDirectory, "combined.md"),
        "utf8",
      );

      expect(written).toContain("## 🕸️ Codependix");
      expect(written).toContain('name="fileImports"');
      expect(written).toContain('name="nxProjects"');
      expect(written).toContain("file-imports");
      expect(written).toContain("nx-projects");
    });

    it("writes nothing to a combined destination whose flag was not given", async () => {
      service.run({
        format: "markdown",
        graphs: GRAPHS,
        jsonOutputPath: undefined,
        markdownOutputPath: undefined,
        workingDirectory,
      });

      await expect(
        readFile(path.join(workingDirectory, "combined.json"), "utf8"),
      ).rejects.toThrow("ENOENT");
      await expect(
        readFile(path.join(workingDirectory, "combined.md"), "utf8"),
      ).rejects.toThrow("ENOENT");
    });

    it("still prints and writes an empty object or document when no graph type is active", async () => {
      service.run({
        format: "json",
        graphs: {},
        jsonOutputPath: "combined.json",
        markdownOutputPath: "combined.md",
        workingDirectory,
      });

      expect(writeSpy).toHaveBeenCalledWith("{}\n");

      const writtenJson = await readFile(
        path.join(workingDirectory, "combined.json"),
        "utf8",
      );
      const writtenMarkdown = await readFile(
        path.join(workingDirectory, "combined.md"),
        "utf8",
      );

      expect(writtenJson.trim()).toBe("{}");
      expect(writtenMarkdown.trim()).toBe("");
    });
  });
});
