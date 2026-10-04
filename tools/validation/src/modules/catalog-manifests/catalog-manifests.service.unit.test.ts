import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogManifestsService } from "./catalog-manifests.service";

import type { PackageManifest } from "./catalog-manifests.types";

/** Paths the mocked workspace says exist. */
const existingPaths = new Set<string>();

/** Directory names the mocked workspace returns for a read, by scope path. */
const scopeChildren = new Map<string, string[]>();

/** Names the mocked workspace treats as files rather than directories. */
const fileNames = new Set<string>();

/** What the mocked workspace hands back for a manifest read. */
let manifestDocument = "{}";

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
  readFileSync: vi.fn<(target: string) => string>(() => manifestDocument),
}));

describe(CatalogManifestsService, () => {
  let service: CatalogManifestsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CatalogManifestsService],
    }).compile();

    service = await module.resolve(CatalogManifestsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existingPaths.clear();
    scopeChildren.clear();
    fileNames.clear();
    manifestDocument = "{}";
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("resolveWorkspaceManifestPaths", () => {
    it("always names the root manifest first", () => {
      expect.hasAssertions();
      expect(service.resolveWorkspaceManifestPaths("/workspace")).toStrictEqual(
        ["/workspace/package.json"],
      );
    });

    it("names every project manifest under every workspace scope", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      existingPaths.add("/workspace/packages/logging/package.json");
      scopeChildren.set("/workspace/packages", ["logging", "notes"]);

      expect(service.resolveWorkspaceManifestPaths("/workspace")).toStrictEqual(
        ["/workspace/package.json", "/workspace/packages/logging/package.json"],
      );
    });

    it("skips a scope child that is not a directory", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/tools");
      existingPaths.add("/workspace/tools/README.md/package.json");
      scopeChildren.set("/workspace/tools", ["README.md"]);
      fileNames.add("README.md");

      expect(service.resolveWorkspaceManifestPaths("/workspace")).toStrictEqual(
        ["/workspace/package.json"],
      );
    });
  });

  describe("readManifest", () => {
    it("parses the manifest it read", () => {
      expect.hasAssertions();

      manifestDocument = '{"name":"logger"}';

      expect(service.readManifest("/workspace/package.json")).toStrictEqual({
        name: "logger",
      });
    });
  });

  describe("validateManifestDependencies", () => {
    /** Every violation one manifest produces, at the workspace root. */
    const validate = (manifest: PackageManifest): string[] =>
      service.validateManifestDependencies(
        `${process.cwd()}/packages/logging/package.json`,
        manifest,
      );

    it("passes a manifest that pins everything correctly", () => {
      expect.hasAssertions();
      expect(
        validate({
          dependencies: { "@codebase/logging": "workspace:*", zod: "catalog:" },
        }),
      ).toStrictEqual([]);
    });

    it("passes an external dependency pinned to a named catalog", () => {
      expect.hasAssertions();
      expect(
        validate({ dependencies: { "@nestjs/core": "catalog:ic-suite" } }),
      ).toStrictEqual([]);
    });

    it("names an external dependency pinned to a range after catalog:", () => {
      expect.hasAssertions();
      expect(
        validate({ dependencies: { zod: "catalog:^3.0.0" } }),
      ).toStrictEqual([
        "packages/logging/package.json -> dependencies.zod must use catalog: (found catalog:^3.0.0)",
      ]);
    });

    it("names an external dependency pinned to a range", () => {
      expect.hasAssertions();
      expect(validate({ dependencies: { zod: "^3.0.0" } })).toStrictEqual([
        "packages/logging/package.json -> dependencies.zod must use catalog: (found ^3.0.0)",
      ]);
    });

    it("names an internal dependency pinned to a range", () => {
      expect.hasAssertions();
      expect(
        validate({ devDependencies: { "@codebase/logging": "^1.0.0" } }),
      ).toStrictEqual([
        "packages/logging/package.json -> devDependencies.@codebase/logging must use workspace:* (found ^1.0.0)",
      ]);
    });

    it.each([
      "@callidescope/configuration",
      "@codebase/logging",
      "@codometer/configuration",
      "@conformetry/core",
      "@jimmypaolini/anything",
    ])("treats %s as internal", (dependencyName) => {
      expect.hasAssertions();
      expect(
        validate({ dependencies: { [dependencyName]: "workspace:*" } }),
      ).toStrictEqual([]);
    });

    it("checks all four dependency sections at once", () => {
      expect.hasAssertions();
      expect(
        validate({
          dependencies: { one: "1.0.0" },
          devDependencies: { two: "2.0.0" },
          optionalDependencies: { four: "4.0.0" },
          peerDependencies: { three: "3.0.0" },
        }),
      ).toStrictEqual([
        "packages/logging/package.json -> dependencies.one must use catalog: (found 1.0.0)",
        "packages/logging/package.json -> devDependencies.two must use catalog: (found 2.0.0)",
        "packages/logging/package.json -> peerDependencies.three must use catalog: (found 3.0.0)",
        "packages/logging/package.json -> optionalDependencies.four must use catalog: (found 4.0.0)",
      ]);
    });

    it("passes a manifest with no dependency sections at all", () => {
      expect.hasAssertions();
      expect(validate({ name: "logger" })).toStrictEqual([]);
    });
  });
});
