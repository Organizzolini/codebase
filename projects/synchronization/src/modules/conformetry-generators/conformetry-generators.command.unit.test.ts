import { writeFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { ConformetryGeneratorsCommand } from "./conformetry-generators.command";

const fileContents = new Map<string, string>();
type ConformetryTestConfiguration = {
  description?: string;
  name: string;
}[];

let currentConformetryConfiguration: ConformetryTestConfiguration = [];
let loadConformetryConfigurationError: Error | undefined;

vi.mock("@conformetry/configuration", () => {
  return {
    ConfigurationService: class {
      async loadConformetryConfiguration(): Promise<ConformetryTestConfiguration> {
        await Promise.resolve();
        if (loadConformetryConfigurationError !== undefined) {
          throw loadConformetryConfigurationError;
        }
        return currentConformetryConfiguration;
      }
    },
  };
});

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

describe(ConformetryGeneratorsCommand, () => {
  let command: ConformetryGeneratorsCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const agentsFile = path.join(workspaceRoot, "AGENTS.md");
  const readmeFile = path.join(workspaceRoot, "README.md");

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConformetryGeneratorsCommand,
        ConfigurationService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ConformetryGeneratorsCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
    currentConformetryConfiguration = [];
    loadConformetryConfigurationError = undefined;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConformetryGeneratorsCommand,
        ConfigurationService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "ConformetryGeneratorsCommand",
    );
  });

  it.each([
    {
      agentsContent: [
        "# Header",
        "<!-- conformetry:start -->",
        "| Template | Description |",
        "| -------- | ----------- |",
        "| `alpha` | first |",
        "| `beta` | second |",
        "<!-- conformetry:end -->",
      ].join("\n"),
      expectedLogMessage: "📇 Verified the conformetry generators table",
      generators: [
        { description: "first", name: "alpha" },
        { description: "second", name: "beta" },
      ],
      modeArguments: ["check"],
      readmeContent: [
        "# Header",
        "<!-- conformetry:start -->",
        "| Template | Description |",
        "| -------- | ----------- |",
        "| `alpha` | first |",
        "| `beta` | second |",
        "<!-- conformetry:end -->",
      ].join("\n"),
      scenarioName:
        "passes check mode when generated table matches every target file",
    },
    {
      agentsContent: [
        "# Header",
        "<!-- conformetry:start -->",
        "| Template | Description |",
        "| -------- | ----------- |",
        "| `alpha` | first |",
        "<!-- conformetry:end -->",
      ].join("\n"),
      expectedLogMessage: "📇 Verified the conformetry generators table",
      generators: [{ description: "first", name: "alpha" }],
      modeArguments: [],
      readmeContent: [
        "# Header",
        "<!-- conformetry:start -->",
        "| Template | Description |",
        "| -------- | ----------- |",
        "| `alpha` | first |",
        "<!-- conformetry:end -->",
      ].join("\n"),
      scenarioName: "defaults to check mode when no mode is provided",
    },
  ])(
    "$scenarioName",
    async ({
      agentsContent,
      expectedLogMessage,
      generators,
      modeArguments,
      readmeContent,
    }) => {
      currentConformetryConfiguration = generators;
      fileContents.set(agentsFile, agentsContent);
      fileContents.set(readmeFile, readmeContent);

      await command.run(modeArguments);

      expect(logger.info).toHaveBeenCalledWith(
        expectedLogMessage,
        undefined,
        expect.any(Object),
      );
      expect(writeFileSync).not.toHaveBeenCalled();
    },
  );

  it("writes generated table to every target file in write mode", async () => {
    currentConformetryConfiguration = [{ description: "first", name: "alpha" }];
    const staleContent = [
      "# Header",
      "<!-- conformetry:start -->",
      "stale",
      "<!-- conformetry:end -->",
    ].join("\n");
    fileContents.set(agentsFile, staleContent);
    fileContents.set(readmeFile, staleContent);

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(
      readmeFile,
      expect.stringContaining("| `alpha` | first |"),
      "utf8",
    );
    expect(writeFileSync).not.toHaveBeenCalledWith(
      agentsFile,
      expect.anything(),
      expect.anything(),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "🔄 Generating the conformetry generators table",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📇 Updated README.md",
      undefined,
      expect.any(Object),
    );
  });

  it("exits on invalid mode", async () => {
    fileContents.set(
      agentsFile,
      [
        "# Header",
        "<!-- conformetry:start -->",
        "",
        "<!-- conformetry:end -->",
      ].join("\n"),
    );

    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith(
      "🚦 Rejected an unusable mode",
      undefined,
      expect.any(Object),
    );
  });

  it.each([
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.error).toHaveBeenCalledWith(
          "💥 Failed synchronizing conformetry generators",
          expect.stringContaining("Markers not found in README.md"),
        );
      },
      modeArguments: ["check"],
      scenarioName: "exits when README markers are missing",
      setup: (): void => {
        fileContents.set(readmeFile, "# Header without markers");
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.info).toHaveBeenCalledWith(
          "📇 Detected an out-of-sync conformetry generators table",
          undefined,
          expect.objectContaining({ files: ["README.md"] }),
        );
      },
      modeArguments: ["check"],
      scenarioName:
        "reports drift when generated table differs from README content",
      setup: (): void => {
        currentConformetryConfiguration = [
          { description: "first", name: "alpha" },
        ];
        fileContents.set(
          readmeFile,
          [
            "# Header",
            "<!-- conformetry:start -->",
            "| Template | Description |",
            "| -------- | ----------- |",
            "| `stale` | mismatch |",
            "<!-- conformetry:end -->",
          ].join("\n"),
        );
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.error).toHaveBeenCalledWith(
          "💥 Failed synchronizing conformetry generators",
          expect.any(String),
        );
      },
      modeArguments: ["check"],
      scenarioName: "handles non-Error throw values in run catch block",
      setup: (): void => {
        loadConformetryConfigurationError = new Error("[object Object]");
      },
    },
  ])("$scenarioName", async ({ assertLogs, modeArguments, setup }) => {
    setup();
    const processExitSpy = mockProcessExit();

    await expect(command.run(modeArguments)).rejects.toThrow("process.exit:1");

    assertLogs(logger);

    processExitSpy.mockRestore();
  });
});
