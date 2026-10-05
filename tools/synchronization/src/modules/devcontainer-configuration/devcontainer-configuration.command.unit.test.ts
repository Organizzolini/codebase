import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { DevcontainerConfigurationCommand } from "./devcontainer-configuration.command";

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

describe(DevcontainerConfigurationCommand, () => {
  let command: DevcontainerConfigurationCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const localConfigFile = path.join(
    workspaceRoot,
    ".devcontainer/local/devcontainer.json",
  );
  const cloudConfigFile = path.join(
    workspaceRoot,
    ".devcontainer/cloud/devcontainer.json",
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DevcontainerConfigurationCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(DevcontainerConfigurationCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        DevcontainerConfigurationCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "DevcontainerConfigurationCommand",
    );
  });

  it.each([
    {
      cloudConfig: {
        $schema: "schema",
        features: {
          "ghcr.io/devcontainers/features/node:1": {},
        },
        mounts: ["source=/cache,target=/cache,type=volume"],
        remoteEnv: {
          APP_ENVIRONMENT: "local",
        },
      },
      localConfig: {
        $schema: "schema",
        features: {
          "ghcr.io/devcontainers/features/node:1": {},
        },
        remoteEnv: {
          APP_ENVIRONMENT: "local",
        },
      },
      modeArguments: ["check"],
      scenarioName:
        "passes check mode when cloud config is already synchronized",
    },
    {
      cloudConfig: {
        $schema: "schema",
        features: {},
        mounts: ["different"],
      },
      localConfig: {
        $schema: "schema",
        features: {},
      },
      modeArguments: [],
      scenarioName:
        "ignores cloud-only key differences in check mode by defaulting to check",
    },
  ])("$scenarioName", async ({ cloudConfig, localConfig, modeArguments }) => {
    fileContents.set(localConfigFile, JSON.stringify(localConfig));
    fileContents.set(cloudConfigFile, JSON.stringify(cloudConfig));

    await command.run(modeArguments);

    expect(logger.info).toHaveBeenCalledWith(
      "📦 Verified the cloud devcontainer config against the local config",
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("writes synchronized cloud config in write mode", async () => {
    const localConfig = {
      $schema: "schema",
      customizations: { vscode: { settings: { "editor.tabSize": 2 } } },
      features: {
        "ghcr.io/devcontainers/features/common-utils:2": {},
      },
      remoteEnv: {
        APP_ENVIRONMENT: "local",
        CODEBASE_ENVIRONMENT: "local",
      },
    };
    const cloudConfig = {
      $schema: "old-schema",
      features: {
        "ghcr.io/devcontainers/features/docker-in-docker:2": {},
      },
      mounts: ["source=/cache,target=/cache,type=volume"],
      remoteEnv: {
        APP_ENVIRONMENT: "cloud",
        CODEBASE_ENVIRONMENT: "cloud",
      },
    };

    fileContents.set(localConfigFile, JSON.stringify(localConfig));
    fileContents.set(cloudConfigFile, JSON.stringify(cloudConfig));

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(
      cloudConfigFile,
      expect.stringContaining(
        '"ghcr.io/devcontainers/features/docker-in-docker:2"',
      ),
      "utf8",
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      cloudConfigFile,
      expect.stringContaining('"CODEBASE_ENVIRONMENT": "cloud"'),
      "utf8",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📦 Updated the cloud devcontainer config from the local config",
    );
  });

  it("rewrites nothing in write mode when the cloud config already agrees", async () => {
    // The formatter collapses a short array onto one line and JSON.stringify
    // expands it again, so a write that rewrote regardless of content produced
    // a diff on every run — one the check had already passed.
    const config = {
      $schema: "schema",
      features: {},
      forwardPorts: [3000, 3001],
    };

    fileContents.set(localConfigFile, JSON.stringify(config));
    fileContents.set(cloudConfigFile, JSON.stringify(config));

    await command.run(["write"]);

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "📦 Left the cloud devcontainer config as the local config already implies",
    );
  });

  it("skips docker features from local config during write sync", async () => {
    // The schemas differ so that there is something to write at all: with the
    // docker feature as the only difference the merge is the cloud config
    // already, and a write with nothing to change writes nothing.
    fileContents.set(
      localConfigFile,
      JSON.stringify({
        $schema: "new-schema",
        features: {
          "ghcr.io/devcontainers/features/docker-in-docker:2": {
            source: "local",
          },
        },
      }),
    );
    fileContents.set(
      cloudConfigFile,
      JSON.stringify({
        $schema: "old-schema",
        features: {
          "ghcr.io/devcontainers/features/docker-in-docker:2": {
            source: "cloud",
          },
        },
      }),
    );

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledWith(
      cloudConfigFile,
      expect.stringContaining('"source": "cloud"'),
      "utf8",
    );
  });

  it.each([
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.info).toHaveBeenCalledWith(
          "📦 Detected out-of-sync common fields",
          undefined,
          expect.objectContaining({
            relativeFilePath: path.join(
              ".devcontainer",
              "cloud",
              "devcontainer.json",
            ),
          }),
        );
      },
      scenarioName: "reports drift and exits in check mode when configs differ",
      setup: (): void => {
        fileContents.set(
          localConfigFile,
          JSON.stringify({
            $schema: "schema",
            remoteEnv: { APP_ENVIRONMENT: "local" },
          }),
        );
        fileContents.set(
          cloudConfigFile,
          JSON.stringify({
            $schema: "different-schema",
            remoteEnv: { APP_ENVIRONMENT: "cloud" },
          }),
        );
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.info).not.toHaveBeenCalledWith(
          "🔀 Differing field",
          undefined,
          expect.objectContaining({ key: "mounts" }),
        );
      },
      scenarioName:
        "skips reporting cloud-only keys when other fields are out of sync",
      setup: (): void => {
        fileContents.set(
          localConfigFile,
          JSON.stringify({
            $schema: "schema",
            remoteEnv: { APP_ENVIRONMENT: "local" },
          }),
        );
        fileContents.set(
          cloudConfigFile,
          JSON.stringify({
            $schema: "different-schema",
            mounts: ["source=/cache,target=/cache,type=volume"],
            remoteEnv: { APP_ENVIRONMENT: "cloud" },
          }),
        );
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.info).not.toHaveBeenCalledWith(
          "🔀 Differing field",
          undefined,
          expect.objectContaining({ key: "customizations" }),
        );
        expect(loggerService.info).toHaveBeenCalledWith(
          "🔀 Differing field",
          undefined,
          expect.objectContaining({ key: "$schema" }),
        );
      },
      scenarioName:
        "does not report equal non-cloud fields while reporting actual drift",
      setup: (): void => {
        fileContents.set(
          localConfigFile,
          JSON.stringify({
            $schema: "schema",
            customizations: { vscode: { settings: { "editor.tabSize": 2 } } },
            remoteEnv: { APP_ENVIRONMENT: "local" },
          }),
        );
        fileContents.set(
          cloudConfigFile,
          JSON.stringify({
            $schema: "different-schema",
            customizations: { vscode: { settings: { "editor.tabSize": 2 } } },
            remoteEnv: { APP_ENVIRONMENT: "cloud" },
          }),
        );
      },
    },
  ])("$scenarioName", async ({ assertLogs, setup }) => {
    setup();
    const processExitSpy = mockProcessExit();

    await expect(command.run(["check"])).rejects.toThrow("process.exit:1");

    assertLogs(logger);

    processExitSpy.mockRestore();
  });

  it("reports failure and exits when a config file cannot be read", async () => {
    await expectProcessExitOne(async () => command.run(["check"]));

    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing the devcontainer configuration",
      expect.stringContaining("File not found"),
    );
  });

  it("exits on invalid mode", async () => {
    fileContents.set(localConfigFile, JSON.stringify({}));
    fileContents.set(cloudConfigFile, JSON.stringify({}));

    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith(
      "🚦 Rejected an unusable mode",
      undefined,
      expect.any(Object),
    );
  });
});
