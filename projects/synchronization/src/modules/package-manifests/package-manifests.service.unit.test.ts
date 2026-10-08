import { writeFileSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BUGS_URL,
  GITHUB_TREE_BASE_URL,
  PUBLISHABLE_PACKAGE_PROJECTS,
  REPOSITORY_URL,
  ROOT_PACKAGE_JSON_PATH,
} from "./package-manifests.constants";
import { PackageManifestsService } from "./package-manifests.service";

import type { RootPackageManifest } from "./package-manifests.types";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
    writeFileSync: vi.fn<(filePath: string, content: string) => void>(
      (filePath: string, content: string) => {
        fileContents.set(filePath, content);
      },
    ),
  };
});

describe(PackageManifestsService, () => {
  let service: PackageManifestsService;
  const workspaceRoot = "/workspace";
  const rootManifestPath = path.join(workspaceRoot, ROOT_PACKAGE_JSON_PATH);

  const mockRootManifest: RootPackageManifest = {
    author: "Jimmy Paolini",
    license: "MIT",
    repository: "organizzolini/codebase.git",
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PackageManifestsService],
    }).compile();

    service = await module.resolve(PackageManifestsService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("deriveMetadata", () => {
    it("derives expected metadata for a project", () => {
      const projectPath = "projects/ic-suite/conformetry/conformetry-core";
      const derived = service.deriveMetadata({
        projectPath,
        rootManifest: mockRootManifest,
      });

      expect(derived.author).toBe("Jimmy Paolini");
      expect(derived.license).toBe("MIT");
      expect(derived.homepage).toBe(
        `${GITHUB_TREE_BASE_URL}/${projectPath}#readme`,
      );
      expect(derived.bugs.url).toBe(BUGS_URL);
      expect(derived.repository).toStrictEqual({
        directory: projectPath,
        type: "git",
        url: REPOSITORY_URL,
      });
    });

    // npm compares a provenance-attested package's `repository.url` with the
    // repository GitHub signed it from, case and all, and rejects a mismatch.
    it("spells the repository owner as GitHub reports it, in lowercase", () => {
      const derived = service.deriveMetadata({
        projectPath: "projects/ic-suite/codometer/codometer-cli",
        rootManifest: mockRootManifest,
      });

      expect(derived.repository.url).toBe(
        "git+https://github.com/organizzolini/codebase.git",
      );
      expect(derived.bugs.url).toBe(
        "https://github.com/organizzolini/codebase/issues",
      );
    });
  });

  describe("readRootManifest", () => {
    it("reads and parses valid root package.json", () => {
      fileContents.set(rootManifestPath, JSON.stringify(mockRootManifest));

      const manifest = service.readRootManifest(workspaceRoot);

      expect(manifest.author).toBe("Jimmy Paolini");
      expect(manifest.license).toBe("MIT");
      expect(manifest.repository).toBe("organizzolini/codebase.git");
    });

    it("throws when root package.json is missing required fields", () => {
      fileContents.set(rootManifestPath, JSON.stringify({ author: "Jimmy" }));

      expect(() => service.readRootManifest(workspaceRoot)).toThrow(
        "expected string, received undefined",
      );
    });
  });

  describe("readPackageManifest", () => {
    it("reads and parses valid project package.json", () => {
      const projectPath = PUBLISHABLE_PACKAGE_PROJECTS[0];
      const manifestPath = path.join(
        workspaceRoot,
        projectPath,
        "package.json",
      );
      fileContents.set(
        manifestPath,
        JSON.stringify({ name: "@conformetry/cli", version: "0.0.1" }),
      );

      const manifest = service.readPackageManifest({
        projectPath,
        workspaceRoot,
      });

      expect(manifest.name).toBe("@conformetry/cli");
      expect(manifest.version).toBe("0.0.1");
    });
  });

  describe("checkPackageManifest", () => {
    it("returns isSynchronized=true when metadata matches", () => {
      const projectPath = PUBLISHABLE_PACKAGE_PROJECTS[0];
      const manifestPath = path.join(
        workspaceRoot,
        projectPath,
        "package.json",
      );
      const expected = service.deriveMetadata({
        projectPath,
        rootManifest: mockRootManifest,
      });

      fileContents.set(
        manifestPath,
        JSON.stringify({
          ...expected,
          name: "@conformetry/cli",
          version: "0.0.1",
        }),
      );

      const result = service.checkPackageManifest({
        projectPath,
        rootManifest: mockRootManifest,
        workspaceRoot,
      });

      expect(result.isSynchronized).toBe(true);
      expect(result.differences).toStrictEqual([]);
    });

    it("returns isSynchronized=false and reports differences when metadata is missing", () => {
      const projectPath = PUBLISHABLE_PACKAGE_PROJECTS[0];
      const manifestPath = path.join(
        workspaceRoot,
        projectPath,
        "package.json",
      );

      fileContents.set(
        manifestPath,
        JSON.stringify({
          name: "@conformetry/cli",
          version: "0.0.1",
        }),
      );

      const result = service.checkPackageManifest({
        projectPath,
        rootManifest: mockRootManifest,
        workspaceRoot,
      });

      expect(result.isSynchronized).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
    });
  });

  describe("checkAll", () => {
    it("checks every publishable package", () => {
      fileContents.set(rootManifestPath, JSON.stringify(mockRootManifest));

      for (const projectPath of PUBLISHABLE_PACKAGE_PROJECTS) {
        const manifestPath = path.join(
          workspaceRoot,
          projectPath,
          "package.json",
        );
        const expected = service.deriveMetadata({
          projectPath,
          rootManifest: mockRootManifest,
        });
        fileContents.set(
          manifestPath,
          JSON.stringify({
            ...expected,
            name: path.basename(projectPath),
            version: "0.0.1",
          }),
        );
      }

      const summary = service.checkAll(workspaceRoot);

      expect(summary.checkedCount).toBe(28);
      expect(summary.isSynchronized).toBe(true);
      expect(summary.succeededProjects).toHaveLength(28);
      expect(summary.failedProjects).toHaveLength(0);
    });
  });

  describe("writePackageManifest", () => {
    it("updates package.json with derived metadata", () => {
      const projectPath = PUBLISHABLE_PACKAGE_PROJECTS[0];
      const manifestPath = path.join(
        workspaceRoot,
        projectPath,
        "package.json",
      );

      fileContents.set(
        manifestPath,
        JSON.stringify({
          name: "@conformetry/cli",
          version: "0.0.1",
        }),
      );

      service.writePackageManifest({
        projectPath,
        rootManifest: mockRootManifest,
        workspaceRoot,
      });

      expect(writeFileSync).toHaveBeenCalledWith(
        manifestPath,
        expect.stringContaining('"author": "Jimmy Paolini"'),
        "utf8",
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        manifestPath,
        expect.stringContaining('"license": "MIT"'),
        "utf8",
      );
    });
  });

  describe("writeAll", () => {
    it("writes metadata across all 28 packages", () => {
      fileContents.set(rootManifestPath, JSON.stringify(mockRootManifest));

      for (const projectPath of PUBLISHABLE_PACKAGE_PROJECTS) {
        const manifestPath = path.join(
          workspaceRoot,
          projectPath,
          "package.json",
        );
        fileContents.set(
          manifestPath,
          JSON.stringify({
            name: path.basename(projectPath),
            version: "0.0.1",
          }),
        );
      }

      service.writeAll(workspaceRoot);

      expect(writeFileSync).toHaveBeenCalledTimes(28);
    });
  });
});
