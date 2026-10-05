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

    it("names every project under every workspace scope", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      existingPaths.add("/workspace/packages/logging/package.json");
      scopeChildren.set("/workspace/packages", ["logging", "notes"]);

      existingPaths.add("/workspace/tools");
      existingPaths.add("/workspace/tools/validation/package.json");
      scopeChildren.set("/workspace/tools", ["validation"]);

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual([
        "packages/logging",
        "tools/validation",
      ]);
    });

    it("skips a scope child that is not a directory", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/tools");
      existingPaths.add("/workspace/tools/README.md/package.json");
      scopeChildren.set("/workspace/tools", ["README.md"]);
      fileNames.add("README.md");

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual(
        [],
      );
    });

    it("skips a scope child with no package.json", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      scopeChildren.set("/workspace/packages", ["stale"]);

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual(
        [],
      );
    });

    it("finds a project nested under a grouping folder that has no package.json of its own", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      scopeChildren.set("/workspace/packages", ["ic-suite"]);

      existingPaths.add("/workspace/packages/ic-suite");
      scopeChildren.set("/workspace/packages/ic-suite", ["callidescope"]);

      existingPaths.add("/workspace/packages/ic-suite/callidescope");
      scopeChildren.set("/workspace/packages/ic-suite/callidescope", [
        "callidescope-cli",
      ]);

      existingPaths.add(
        "/workspace/packages/ic-suite/callidescope/callidescope-cli/package.json",
      );

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual([
        "packages/ic-suite/callidescope/callidescope-cli",
      ]);
    });

    it("does not descend into a project's own subfolders looking for more projects", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      scopeChildren.set("/workspace/packages", ["logging"]);

      existingPaths.add("/workspace/packages/logging/package.json");
      scopeChildren.set("/workspace/packages/logging", ["src"]);

      expect(service.resolveWorkspaceProjectPaths("/workspace")).toStrictEqual([
        "packages/logging",
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
          ["packages/logging"],
          "- **[logger](packages/logging)** - Shared logger",
        ),
      ).toStrictEqual([]);
    });

    it("names a project with no matching link", () => {
      expect.hasAssertions();
      expect(
        service.findUndocumentedProjectPaths(
          ["packages/logging", "packages/orphan"],
          "- **[logger](packages/logging)** - Shared logger",
        ),
      ).toStrictEqual(["packages/orphan"]);
    });
  });
});
