import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { PublishablePackagesChecksService } from "./publishable-packages-checks.service";
import { PublishablePackagesConsumerService } from "./publishable-packages-consumer.service";
import {
  formatMissingTarballsMessage,
  TARBALLS_DIRECTORY_MISSING_MESSAGE,
} from "./publishable-packages.constants";
import { PublishablePackagesService } from "./publishable-packages.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

/** Paths the mocked filesystem says exist. */
const existingPaths = new Set<string>();

/** Mock manifest JSON string for `conformetry-cli`. */
let mockManifestJson = "";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(target: string) => boolean>((target: string) =>
    existingPaths.has(target),
  ),
  readdirSync: vi.fn<
    (targetPath: string) => { isDirectory: () => boolean; name: string }[]
  >((targetPath: string) => {
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
        { isDirectory: () => true, name: "conformetry-examples" },
        { isDirectory: () => false, name: "notes.txt" },
      ];
    }
    return [];
  }),
  readFileSync: vi.fn<(targetPath: string) => string>((targetPath: string) => {
    if (targetPath.endsWith("project.json")) {
      const name = path.basename(path.dirname(targetPath));
      const tags = name.endsWith("examples") ? [] : ["type:package"];
      return JSON.stringify({ name, tags });
    }
    if (targetPath.includes("conformetry-core")) {
      return JSON.stringify({
        name: "@conformetry/core",
        publishConfig: { access: "public" },
        version: "0.0.7",
      });
    }
    if (targetPath.includes("conformetry-examples")) {
      return JSON.stringify({ name: "@conformetry/examples", private: true });
    }
    return mockManifestJson;
  }),
}));

const WORKSPACE = "/mock-workspace";
const FAMILY = `${WORKSPACE}/packages/ic-suite/conformetry`;
const TARBALLS = `${WORKSPACE}/dist/tarballs`;
const CONSUMER = { directory: "/tmp/consumer", workspaceRoot: WORKSPACE };

describe(PublishablePackagesService, () => {
  let service: PublishablePackagesService;
  let consumerService: DeepMocked<PublishablePackagesConsumerService>;
  let checksService: DeepMocked<PublishablePackagesChecksService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesService,
        {
          provide: PublishablePackagesChecksService,
          useValue: createMock<PublishablePackagesChecksService>(),
        },
        {
          provide: PublishablePackagesConsumerService,
          useValue: createMock<PublishablePackagesConsumerService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PublishablePackagesService);
    consumerService = module.get(PublishablePackagesConsumerService);
    checksService = module.get(PublishablePackagesChecksService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existingPaths.clear();
    for (const name of [
      "conformetry-cli",
      "conformetry-core",
      "conformetry-examples",
    ]) {
      existingPaths.add(`${FAMILY}/${name}/package.json`);
      existingPaths.add(`${FAMILY}/${name}/project.json`);
    }
    existingPaths.add(`${WORKSPACE}/packages/ic-suite`);
    mockManifestJson = JSON.stringify({
      bin: { conformetry: "dist/src/main.js" },
      name: "@conformetry/cli",
      publishConfig: { access: "public" },
      version: "0.0.7",
    });
    consumerService.createConsumer.mockReturnValue(CONSUMER);
    consumerService.installConsumer.mockReturnValue([]);
    checksService.verifyConsumer.mockReturnValue([]);
  });

  /** Marks `dist/tarballs` and every publishable package's tarball present. */
  const packAll = (): void => {
    existingPaths.add(TARBALLS);
    existingPaths.add(`${TARBALLS}/conformetry-cli-0.0.7.tgz`);
    existingPaths.add(`${TARBALLS}/conformetry-core-0.0.7.tgz`);
  };

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("resolvePublishablePackages", () => {
    it("returns no packages when packages/ic-suite does not exist", () => {
      expect.hasAssertions();
      expect(service.resolvePublishablePackages("/non-existent")).toStrictEqual(
        [],
      );
    });

    it("keeps only published packages, sorted by name", () => {
      expect.hasAssertions();
      expect(service.resolvePublishablePackages(WORKSPACE)).toStrictEqual([
        {
          binary: "conformetry",
          name: "@conformetry/cli",
          tarball: "conformetry-cli",
          version: "0.0.7",
        },
        {
          name: "@conformetry/core",
          tarball: "conformetry-core",
          version: "0.0.7",
        },
      ]);
    });

    it("names a binary after the manifest's bin field", () => {
      expect.hasAssertions();

      mockManifestJson = JSON.stringify({
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      expect(
        service.resolvePublishablePackages(WORKSPACE)[0]?.binary,
      ).toBeUndefined();

      mockManifestJson = JSON.stringify({
        bin: "dist/src/main.js",
        name: "@conformetry/cli",
        publishConfig: { access: "public" },
      });

      expect(service.resolvePublishablePackages(WORKSPACE)[0]?.binary).toBe(
        "conformetry-cli",
      );
    });
  });

  describe("verifyPublishablePackages", () => {
    it("fails when dist/tarballs does not exist", () => {
      expect.hasAssertions();
      expect(service.verifyPublishablePackages(WORKSPACE)).toStrictEqual({
        binaryCount: 1,
        messages: [TARBALLS_DIRECTORY_MISSING_MESSAGE],
        packageCount: 2,
        succeeded: false,
      });
      expect(consumerService.createConsumer).not.toHaveBeenCalled();
    });

    it("fails before installing when a package has no tarball", () => {
      expect.hasAssertions();

      existingPaths.add(TARBALLS);
      existingPaths.add(`${TARBALLS}/conformetry-cli-0.0.7.tgz`);

      expect(
        service.verifyPublishablePackages(WORKSPACE).messages,
      ).toStrictEqual([
        formatMissingTarballsMessage(["conformetry-core-0.0.7.tgz"]),
      ]);
      expect(consumerService.createConsumer).not.toHaveBeenCalled();
    });

    it("installs every package into a consumer and checks it", () => {
      expect.hasAssertions();

      packAll();
      const result = service.verifyPublishablePackages(WORKSPACE);

      expect(result).toStrictEqual({
        binaryCount: 1,
        messages: [],
        packageCount: 2,
        succeeded: true,
      });
      expect(consumerService.createConsumer).toHaveBeenCalledWith({
        publishablePackages: service.resolvePublishablePackages(WORKSPACE),
        tarballsDirectory: TARBALLS,
        workspaceRoot: WORKSPACE,
      });
      expect(checksService.verifyConsumer).toHaveBeenCalledWith(
        CONSUMER,
        service.resolvePublishablePackages(WORKSPACE),
      );
      expect(consumerService.removeConsumer).toHaveBeenCalledWith(CONSUMER);
    });

    it("reports a failed install without checking the consumer", () => {
      expect.hasAssertions();

      packAll();
      consumerService.installConsumer.mockReturnValue(["❌ install failed"]);

      expect(service.verifyPublishablePackages(WORKSPACE)).toMatchObject({
        messages: ["❌ install failed"],
        succeeded: false,
      });
      expect(checksService.verifyConsumer).not.toHaveBeenCalled();
      expect(consumerService.removeConsumer).toHaveBeenCalledWith(CONSUMER);
    });

    it("reports every failed check", () => {
      expect.hasAssertions();

      packAll();
      checksService.verifyConsumer.mockReturnValue(["❌ one", "❌ two"]);

      expect(service.verifyPublishablePackages(WORKSPACE)).toMatchObject({
        messages: ["❌ one", "❌ two"],
        succeeded: false,
      });
    });

    it("removes the consumer even when a check throws", () => {
      expect.hasAssertions();

      packAll();
      checksService.verifyConsumer.mockImplementation(() => {
        throw new Error("Refusing to run publish");
      });

      expect(() => service.verifyPublishablePackages(WORKSPACE)).toThrow(
        "Refusing to run publish",
      );
      expect(consumerService.removeConsumer).toHaveBeenCalledWith(CONSUMER);
    });
  });
});
