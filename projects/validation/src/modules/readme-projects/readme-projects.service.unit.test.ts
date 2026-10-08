import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ReadmeProjectsService } from "./readme-projects.service";

/** Paths the mocked workspace says exist. */
const existingPaths = new Set<string>();

/** Directory names the mocked workspace returns for a read, by scope path. */
const scopeChildren = new Map<string, string[]>();

/** Names the mocked workspace treats as files rather than directories. */
const fileNames = new Set<string>();

/** What the mocked workspace hands back for a README read. */
let readmeDocument = "";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(target: string) => boolean>((target: string) =>
    existingPaths.has(target),
  ),
  readdirSync: vi.fn<
    (target: string) => { isDirectory: () => boolean; name: string }[]
  >((target: string) =>
    (scopeChildren.get(target) ?? []).map((name) => ({
      isDirectory: () => !fileNames.has(name),
      name,
    })),
  ),
  readFileSync: vi.fn<(target: string) => string>(() => readmeDocument),
}));

describe(ReadmeProjectsService, () => {
  let service: ReadmeProjectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReadmeProjectsService],
    }).compile();

    service = await module.resolve(ReadmeProjectsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existingPaths.clear();
    scopeChildren.clear();
    fileNames.clear();
    readmeDocument = "";
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("resolveWorkspaceProjectPaths", () => {
    it("finds no projects when no workspace scope exists", () => {
      expect.hasAssertions();
      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual(
        [],
      );
    });

    it("names every project under every grouping folder", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/projects");
      scopeChildren.set("/workspace/projects", ["lexico", "logging", "notes"]);

      existingPaths.add("/workspace/projects/logging/package.json");

      existingPaths.add("/workspace/projects/lexico/lexico-api/package.json");
      scopeChildren.set("/workspace/projects/lexico", ["lexico-api"]);

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual([
        "projects/lexico/lexico-api",
        "projects/logging",
      ]);
    });

    it("skips a scope child that is not a directory", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/projects");
      existingPaths.add("/workspace/projects/README.md/package.json");
      scopeChildren.set("/workspace/projects", ["README.md"]);
      fileNames.add("README.md");

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual(
        [],
      );
    });

    it("skips a scope child with no package.json", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/projects");
      scopeChildren.set("/workspace/projects", ["stale"]);

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual(
        [],
      );
    });

    it("finds a project nested under a grouping folder that has no package.json of its own", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/projects");
      scopeChildren.set("/workspace/projects", ["ic-suite"]);

      existingPaths.add("/workspace/projects/ic-suite");
      scopeChildren.set("/workspace/projects/ic-suite", ["callidescope"]);

      existingPaths.add("/workspace/projects/ic-suite/callidescope");
      scopeChildren.set("/workspace/projects/ic-suite/callidescope", [
        "callidescope-cli",
      ]);

      existingPaths.add(
        "/workspace/projects/ic-suite/callidescope/callidescope-cli/package.json",
      );

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual([
        "projects/ic-suite/callidescope/callidescope-cli",
      ]);
    });

    it("does not descend into a project's own subfolders looking for more projects", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/projects");
      scopeChildren.set("/workspace/projects", ["logging"]);

      existingPaths.add("/workspace/projects/logging/package.json");
      scopeChildren.set("/workspace/projects/logging", ["src"]);

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual([
        "projects/logging",
      ]);
    });
  });

  describe("readRootReadme", () => {
    it("reads the workspace root README", () => {
      expect.hasAssertions();

      readmeDocument = "# codebase";

      expect(service.readRootReadme("/workspace")).toBe("# codebase");
    });
  });

  describe("findUndocumentedProjectPaths", () => {
    it("finds nothing missing when every project is linked", () => {
      expect.hasAssertions();
      expect(
        service.findUndocumentedProjectPaths(
          ["projects/logging"],
          "- **[logger](projects/logging)** - Shared logger",
        ),
      ).toStrictEqual([]);
    });

    it("names a project with no matching link", () => {
      expect.hasAssertions();
      expect(
        service.findUndocumentedProjectPaths(
          ["projects/logging", "projects/orphan"],
          "- **[logger](projects/logging)** - Shared logger",
        ),
      ).toStrictEqual(["projects/orphan"]);
    });
  });
});
