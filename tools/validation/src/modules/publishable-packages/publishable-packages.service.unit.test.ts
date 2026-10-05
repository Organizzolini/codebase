import { execFileSync, spawnSync } from "node:child_process";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { TARBALLS_DIRECTORY_MISSING_MESSAGE } from "./publishable-packages.constants";
import { PublishablePackagesService } from "./publishable-packages.service";

/** Paths the mocked filesystem says exist. */
const existingPaths = new Set<string>();

/** Readdir mock return values. */
let mockTarballFiles: string[] = [];

/** ExecFileSync mock error trigger. */
let typecheckShouldFail = false;
let tarShouldFail = false;

/** SpawnSync return status. */
let spawnStatus = 0;

/** Mock manifest JSON string. */
let mockManifestJson = JSON.stringify({
  bin: { conformetry: "bin/cli" },
  name: "@conformetry/cli",
  publishConfig: { access: "public" },
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(target: string) => boolean>((target: string) =>
    existingPaths.has(target),
  ),
  mkdirSync: vi.fn<(path: string, options?: unknown) => void>(),
  readdirSync: vi.fn<
    (
      targetPath: string,
      options?: unknown,
    ) => string[] | { isDirectory: () => boolean; name: string }[]
  >((targetPath: string, options?: unknown) => {
    if (typeof options === "object" && options && "withFileTypes" in options) {
      if (targetPath.endsWith("ic-suite")) {
        return [
          { isDirectory: () => true, name: "conformetry" },
          { isDirectory: () => false, name: "README.md" },
        ];
      }
      if (targetPath.endsWith("conformetry")) {
        return [
          { isDirectory: () => true, name: "conformetry-cli" },
          { isDirectory: () => true, name: "conformetry-core" },
          { isDirectory: () => false, name: "notes.txt" },
        ];
      }
      return [];
    }
    return mockTarballFiles;
  }),
  readFileSync: vi.fn<(targetPath: string) => string>((targetPath: string) => {
    if (targetPath.endsWith("project.json")) {
      const name = targetPath.includes("conformetry-core")
        ? "conformetry-core"
        : "conformetry-cli";
      return JSON.stringify({ name, tags: ["type:package"] });
    }
    if (targetPath.includes("conformetry-core")) {
      return JSON.stringify({
        name: "@conformetry/core",
        publishConfig: { access: "public" },
      });
    }
    return mockManifestJson;
  }),
  rmSync: vi.fn<(path: string, options?: unknown) => void>(),
  writeFileSync: vi.fn<() => void>(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn<(command: string, args?: string[]) => void>(
    (_command: string, args?: string[]) => {
      if (typecheckShouldFail && args?.includes("--noEmit")) {
        throw new Error("TSC compilation error");
      }
      if (
        tarShouldFail &&
        args?.some((argument) => argument.includes("cli-bin-verify"))
      ) {
        throw new Error("Tar extraction error");
      }
    },
  ),
  spawnSync: vi.fn<
    () => { output: unknown[]; status: number; stderr: string; stdout: string }
  >(() => ({
    output: [],
    status: spawnStatus,
    stderr: spawnStatus === 0 ? "" : "CLI execution error",
    stdout: "CLI output",
  })),
}));

describe(PublishablePackagesService, () => {
  let service: PublishablePackagesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesService,
        {
          provide: LoggerService,
          useValue: {
            log: vi.fn<(message: string) => void>(),
            setContext: vi.fn<(context: string) => void>(),
          },
        },
      ],
    }).compile();

    service = await module.resolve(PublishablePackagesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existingPaths.clear();
    existingPaths.add("/mock-workspace/packages/ic-suite");
    existingPaths.add("/mock-workspace/packages/ic-suite/conformetry");
    existingPaths.add(
      "/mock-workspace/packages/ic-suite/conformetry/conformetry-core/package.json",
    );
    existingPaths.add(
      "/mock-workspace/packages/ic-suite/conformetry/conformetry-core/project.json",
    );
    existingPaths.add("/mock-workspace/packages/ic-suite/conformetry");
    existingPaths.add(
      "/mock-workspace/packages/ic-suite/conformetry/conformetry-cli",
    );
    existingPaths.add(
      "/mock-workspace/packages/ic-suite/conformetry/conformetry-cli/package.json",
    );
    existingPaths.add(
      "/mock-workspace/packages/ic-suite/conformetry/conformetry-cli/project.json",
    );
    existingPaths.add(`${process.cwd()}/packages/ic-suite`);
    existingPaths.add(`${process.cwd()}/packages/ic-suite/conformetry`);
    existingPaths.add(
      `${process.cwd()}/packages/ic-suite/conformetry/conformetry-cli`,
    );
    existingPaths.add(
      `${process.cwd()}/packages/ic-suite/conformetry/conformetry-cli/package.json`,
    );
    existingPaths.add(
      `${process.cwd()}/packages/ic-suite/conformetry/conformetry-cli/project.json`,
    );
    mockTarballFiles = [
      "conformetry-cli-0.0.1.tgz",
      "codometer-cli-0.0.1.tgz",
      "callidescope-cli-0.0.1.tgz",
      "codependix-cli-0.0.1.tgz",
    ];
    mockManifestJson = JSON.stringify({
      bin: { conformetry: "bin/cli" },
      name: "@conformetry/cli",
      publishConfig: { access: "public" },
    });
    typecheckShouldFail = false;
    tarShouldFail = false;
    spawnStatus = 0;
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("resolvePublishablePackages", () => {
    it("returns empty array when packages/ic-suite directory does not exist", () => {
      expect.hasAssertions();

      const packages = service.resolvePublishablePackages("/non-existent");

      expect(packages).toStrictEqual([]);
    });

    it("discovers publishable packages with various bin structures", () => {
      expect.hasAssertions();

      mockManifestJson = JSON.stringify({
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      let packages = service.resolvePublishablePackages(process.cwd());

      expect(packages[0]?.binary).toBeUndefined();

      mockManifestJson = JSON.stringify({
        bin: "bin/cli",
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      packages = service.resolvePublishablePackages(process.cwd());

      expect(packages[0]?.binary).toBe("conformetry-cli");

      mockManifestJson = JSON.stringify({
        bin: { conformetry: "bin/cli" },
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      packages = service.resolvePublishablePackages(process.cwd());

      expect(packages[0]?.binary).toBe("conformetry");
    });
  });

  describe("verifyPublishablePackages", () => {
    it("fails with an error message when dist/tarballs directory is missing", () => {
      expect.hasAssertions();

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages).toStrictEqual([
        TARBALLS_DIRECTORY_MISSING_MESSAGE,
      ]);
    });

    it("verifies cleanly when dist/tarballs exists and child processes exit with 0", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      existingPaths.add(
        "/mock-workspace/dist/tarballs/conformetry-cli-0.0.1.tgz",
      );
      existingPaths.add(
        "/mock-workspace/dist/tarballs/codometer-cli-0.0.1.tgz",
      );
      existingPaths.add(
        "/mock-workspace/dist/tarballs/callidescope-cli-0.0.1.tgz",
      );
      existingPaths.add(
        "/mock-workspace/dist/tarballs/codependix-cli-0.0.1.tgz",
      );

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("unpacks a tarball of any version into its scoped package directory", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      mockTarballFiles = ["conformetry-cli-1.2.3.tgz"];

      service.verifyPublishablePackages("/mock-workspace");

      const extractionTargets = vi
        .mocked(execFileSync)
        .mock.calls.filter(([command]) => command === "tar")
        .map(([, args]) => args?.[args.indexOf("-C") + 1]);

      expect(extractionTargets).toContainEqual(
        expect.stringMatching(/\/node_modules\/@conformetry\/cli$/),
      );
    });

    it("runs each CLI binary from the tarball named for its manifest version", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      mockTarballFiles = ["conformetry-cli-1.2.3.tgz"];
      mockManifestJson = JSON.stringify({
        bin: { conformetry: "bin/cli" },
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
        version: "1.2.3",
      });

      service.verifyPublishablePackages("/mock-workspace");

      const cliTarballs = vi
        .mocked(execFileSync)
        .mock.calls.filter(([, args]) =>
          args?.some((argument) => argument.includes("cli-bin-verify")),
        )
        .map(([, args]) => args?.[args.indexOf("-xzf") + 1]);

      expect(cliTarballs).toStrictEqual([
        "/mock-workspace/dist/tarballs/conformetry-cli-1.2.3.tgz",
      ]);
    });

    it("uses process.cwd when workspaceRoot is passed", () => {
      expect.hasAssertions();

      existingPaths.add(`${process.cwd()}/dist/tarballs`);

      const result = service.verifyPublishablePackages(process.cwd());

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("verifies cleanly when bin is missing or an empty object in package.json", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      mockManifestJson = JSON.stringify({
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      let result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);

      mockManifestJson = JSON.stringify({
        bin: {},
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);

      mockManifestJson = JSON.stringify({
        bin: { otherBinary: "bin/cli" },
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("verifies cleanly when bin is a string in package.json during CLI binary check", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      mockManifestJson = JSON.stringify({
        bin: "bin/cli",
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("reports failure when CLI binary exits with non-zero status code and empty stderr", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      spawnStatus = 1;

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("reports failure when typecheck fails for a package", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      typecheckShouldFail = true;

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Failed to typecheck");
    });

    it("reports failure when CLI binary extraction fails", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      tarShouldFail = true;

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Failed to execute CLI binary");
    });

    it("reports failure when CLI binary execution throws an error", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      vi.mocked(spawnSync).mockImplementationOnce(() => {
        throw new Error("Spawn execution failed");
      });

      const result = service.verifyPublishablePackages("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Failed to execute CLI binary");
    });
  });
});
