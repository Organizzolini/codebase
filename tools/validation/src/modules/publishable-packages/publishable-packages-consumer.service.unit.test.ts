import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
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

import { LoggerService } from "@codebase/logging";

import { CONSUMER_ROOT_VARIABLE } from "./publishable-packages-consumer.constants";
import { PublishablePackagesConsumerService } from "./publishable-packages-consumer.service";
import { PublishablePackagesProcessService } from "./publishable-packages-process.service";

import type { ConsumerOptions } from "./publishable-packages.types";
import type { DeepMocked } from "@golevelup/ts-vitest";
import type { tmpdir } from "node:os";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<typeof existsSync>(),
  mkdirSync: vi.fn<typeof mkdirSync>(),
  mkdtempSync: vi.fn<typeof mkdtempSync>(),
  readFileSync: vi.fn<typeof readFileSync>(),
  realpathSync: vi.fn<typeof realpathSync>(),
  rmSync: vi.fn<typeof rmSync>(),
  writeFileSync: vi.fn<typeof writeFileSync>(),
}));

vi.mock("node:os", () => ({
  tmpdir: vi.fn<typeof tmpdir>(() => "/var/tmp"),
}));

const WORKSPACE_ROOT = "/work/codebase";
const CONSUMER = "/private/var/tmp/publishable-packages-consumer-abc";

const options: ConsumerOptions = {
  publishablePackages: [
    {
      binary: "codometer",
      name: "@codometer/cli",
      tarball: "codometer-cli",
      version: "0.0.7",
    },
    { name: "@codometer/core", tarball: "codometer-core", version: "0.0.7" },
  ],
  tarballsDirectory: `${WORKSPACE_ROOT}/dist/tarballs`,
  workspaceRoot: WORKSPACE_ROOT,
};

/** Paths `existsSync` reports as present. */
let existingPaths = new Set<string>();

/** What the mocked filesystem holds, by path. */
const manifests: Record<string, string> = {
  [`${WORKSPACE_ROOT}/node_modules/@types/node/package.json`]:
    '{ "version": "26.6.2" }',
  [`${WORKSPACE_ROOT}/node_modules/nx/package.json`]: '{ "version": "23.2.1" }',
  [`${WORKSPACE_ROOT}/node_modules/typescript/package.json`]:
    '{ "version": "6.0.3" }',
  [`${WORKSPACE_ROOT}/package.json`]: '{ "packageManager": "pnpm@12.6.0" }',
};

/** Returns what was written to one consumer file. */
const written = (relativePath: string): string => {
  const call = vi
    .mocked(writeFileSync)
    .mock.calls.find(
      ([target]) => target === path.join(CONSUMER, relativePath),
    );
  const content = call?.[1];
  if (typeof content !== "string") {
    throw new TypeError(`${relativePath} was not written as text`);
  }
  return content;
};

describe(PublishablePackagesConsumerService, () => {
  let service: PublishablePackagesConsumerService;
  let processService: DeepMocked<PublishablePackagesProcessService>;
  const originalEnvironment = { ...process.env };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishablePackagesConsumerService,
        {
          provide: PublishablePackagesProcessService,
          useValue: createMock<PublishablePackagesProcessService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PublishablePackagesConsumerService);
    processService = module.get(PublishablePackagesProcessService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(process.env, CONSUMER_ROOT_VARIABLE);
    existingPaths = new Set();
    vi.mocked(existsSync).mockImplementation((target) =>
      existingPaths.has(String(target)),
    );
    vi.mocked(readFileSync).mockImplementation((target) => {
      const content = manifests[String(target)];
      if (content === undefined) {
        throw new Error(`ENOENT: ${String(target)}`);
      }
      return content;
    });
    vi.mocked(realpathSync).mockImplementation(
      (target) => `/private${String(target)}`,
    );
    vi.mocked(mkdtempSync).mockReturnValue(
      "/private/var/tmp/publishable-packages-consumer-abc",
    );
    processService.run.mockReturnValue({ output: "", status: 0 });
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("createConsumer", () => {
    it("creates the consumer beneath the system temporary directory", () => {
      expect.hasAssertions();

      expect(service.createConsumer(options)).toStrictEqual({
        directory: CONSUMER,
        workspaceRoot: WORKSPACE_ROOT,
      });
      expect(mkdtempSync).toHaveBeenCalledWith(
        "/private/var/tmp/publishable-packages-consumer-",
      );
    });

    it("creates the consumer beneath the configured directory", () => {
      expect.hasAssertions();

      process.env[CONSUMER_ROOT_VARIABLE] = "/runner/_temp";
      service.createConsumer(options);

      expect(mkdirSync).toHaveBeenCalledWith("/runner/_temp", {
        recursive: true,
      });
      expect(mkdtempSync).toHaveBeenCalledWith(
        "/private/runner/_temp/publishable-packages-consumer-",
      );
    });

    it("treats an empty configured directory as unset", () => {
      expect.hasAssertions();

      process.env[CONSUMER_ROOT_VARIABLE] = "";
      service.createConsumer(options);

      expect(mkdtempSync).toHaveBeenCalledWith(
        "/private/var/tmp/publishable-packages-consumer-",
      );
    });

    it("refuses to leave a tool the workspace has not installed unpinned", () => {
      expect.hasAssertions();

      vi.mocked(readFileSync).mockImplementation((target) =>
        String(target).endsWith("package.json") ? "{}" : "",
      );

      expect(() => service.createConsumer(options)).toThrow(
        "Cannot pin @types/node in the consumer",
      );
      expect(mkdtempSync).not.toHaveBeenCalled();
    });

    it("removes a consumer it could not finish writing", () => {
      expect.hasAssertions();

      vi.mocked(writeFileSync).mockImplementationOnce(() => {
        throw new Error("ENOSPC");
      });

      expect(() => service.createConsumer(options)).toThrow("ENOSPC");
      expect(rmSync).toHaveBeenCalledWith(CONSUMER, {
        force: true,
        recursive: true,
      });
    });

    it.each([["package.json"], ["node_modules"], ["pnpm-workspace.yaml"]])(
      "refuses a directory beneath a %s",
      (marker) => {
        expect.hasAssertions();

        existingPaths.add(`/private/var/${marker}`);

        expect(() => service.createConsumer(options)).toThrow(
          `/private/var/${marker}`,
        );
        expect(mkdtempSync).not.toHaveBeenCalled();
      },
    );

    it("installs every package from its tarball and overrides each", () => {
      expect.hasAssertions();

      service.createConsumer(options);
      const manifest = JSON.parse(written("package.json")) as {
        devDependencies: Record<string, string>;
        packageManager: string;
        private: boolean;
      };

      expect(manifest.private).toBe(true);
      expect(manifest.packageManager).toBe("pnpm@12.6.0");
      expect(manifest.devDependencies).toStrictEqual({
        "@codometer/cli": `file:${WORKSPACE_ROOT}/dist/tarballs/codometer-cli-0.0.7.tgz`,
        "@codometer/core": `file:${WORKSPACE_ROOT}/dist/tarballs/codometer-core-0.0.7.tgz`,
        "@types/node": "26.6.2",
        nx: "23.2.1",
        typescript: "6.0.3",
      });
      expect(written("pnpm-workspace.yaml")).toBe(
        [
          "allowBuilds:",
          '  "@swc/core": true',
          '  "nx": true',
          "minimumReleaseAge: 1440",
          "overrides:",
          `  "@codometer/cli": "file:${WORKSPACE_ROOT}/dist/tarballs/codometer-cli-0.0.7.tgz"`,
          `  "@codometer/core": "file:${WORKSPACE_ROOT}/dist/tarballs/codometer-core-0.0.7.tgz"`,
          "",
        ].join("\n"),
      );
    });

    it("writes one import per package and the fixture projects", () => {
      expect.hasAssertions();

      service.createConsumer(options);

      expect(written("typecheck/codometer-cli.ts")).toBe(
        'import * as item from "@codometer/cli";\nexport { item };\n',
      );
      expect(JSON.parse(written("tsconfig.typecheck.json"))).toMatchObject({
        include: ["typecheck/*.ts"],
      });
      expect(written("projects/healthy/project.json")).toContain(
        '"name": "healthy"',
      );
      expect(mkdirSync).toHaveBeenCalledWith(
        path.join(CONSUMER, "projects", "broken", "src"),
        { recursive: true },
      );
    });
  });

  describe("installConsumer", () => {
    const context = { directory: CONSUMER, workspaceRoot: WORKSPACE_ROOT };

    it("initializes a repository and installs from the tarballs", () => {
      expect.hasAssertions();

      expect(service.installConsumer(context)).toStrictEqual([]);
      expect(processService.run).toHaveBeenNthCalledWith(
        1,
        context,
        expect.objectContaining({
          args: ["init", "--quiet"],
          executable: "git",
        }),
      );
      expect(processService.run).toHaveBeenNthCalledWith(
        2,
        context,
        expect.objectContaining({
          args: ["install", "--reporter=append-only"],
          executable: "pnpm",
        }),
      );
    });

    it("stops at the first command that fails", () => {
      expect.hasAssertions();

      processService.run.mockReturnValueOnce({
        output: "fatal: not a git binary\n",
        status: 128,
      });

      expect(service.installConsumer(context)).toStrictEqual([
        "❌ Failed to run git init in the consumer (exit 128):\nfatal: not a git binary",
      ]);
      expect(processService.run).toHaveBeenCalledExactlyOnceWith(
        context,
        expect.objectContaining({ executable: "git" }),
      );
    });

    it("reports a failed install", () => {
      expect.hasAssertions();

      processService.run
        .mockReturnValueOnce({ output: "", status: 0 })
        .mockReturnValueOnce({ output: "ERR_PNPM_FETCH_404", status: 1 });

      expect(service.installConsumer(context)).toStrictEqual([
        "❌ Failed to install the packed packages into the consumer (exit 1):\nERR_PNPM_FETCH_404",
      ]);
    });
  });

  describe("removeConsumer", () => {
    it("deletes the consumer directory", () => {
      expect.hasAssertions();

      service.removeConsumer({
        directory: CONSUMER,
        workspaceRoot: WORKSPACE_ROOT,
      });

      expect(rmSync).toHaveBeenCalledWith(CONSUMER, {
        force: true,
        recursive: true,
      });
    });
  });
});
