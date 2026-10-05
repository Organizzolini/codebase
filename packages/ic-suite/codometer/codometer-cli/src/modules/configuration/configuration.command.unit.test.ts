import { ConfigurationModule as CodometerConfigurationModule } from "@codometer/configuration";
import {
  ConfigurationListingService,
  RenderConfigurationService,
} from "@codometer/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logging";

import { ConfigurationCommand } from "./configuration.command";

describe(ConfigurationCommand, () => {
  let command: ConfigurationCommand;
  let configurationService: ConfigurationListingService;
  let renderConfigurationService: RenderConfigurationService;
  let logger: LoggerService;
  let write: MockInstance<typeof process.stdout.write>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodometerConfigurationModule],
      providers: [
        ConfigurationCommand,
        {
          provide: ConfigurationListingService,
          useValue: createMock<ConfigurationListingService>(),
        },
        {
          provide: RenderConfigurationService,
          useValue: createMock<RenderConfigurationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ConfigurationCommand);
    configurationService = module.get(ConfigurationListingService);
    renderConfigurationService = module.get(RenderConfigurationService);
    logger = module.get(LoggerService);
  });

  beforeEach(() => {
    vi.mocked(configurationService.describeConfigurations).mockResolvedValue({
      described: [],
      rootError: undefined,
    });
    vi.mocked(configurationService.toLimitRows).mockReturnValue([]);
    vi.mocked(renderConfigurationService.render).mockReturnValue("rendered");
    write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      imports: [CodometerConfigurationModule],
      providers: [
        ConfigurationCommand,
        {
          provide: ConfigurationListingService,
          useValue: createMock<ConfigurationListingService>(),
        },
        {
          provide: RenderConfigurationService,
          useValue: createMock<RenderConfigurationService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ConfigurationCommand");
  });

  it("writes the rendered listing to standard output", async () => {
    await command.run([], {});

    expect(write).toHaveBeenCalledWith("rendered\n");
  });

  it("passes the limits flag through to the renderer", async () => {
    await command.run([], { limits: true });

    expect(renderConfigurationService.render).toHaveBeenCalledWith(
      expect.objectContaining({ limitsOnly: true }),
    );
  });

  it("reads the directory it is given, and falls back to the working directory", () => {
    expect(command.parseDirectory("packages/logging")).toBe("packages/logging");
    expect(command.parseDirectory("")).toBe(process.cwd());
    expect(command.parseDirectory(true)).toBe(process.cwd());
  });

  it("hands the configuration it was pointed at to the walk", async () => {
    await command.run([], { config: "configuration/codometer.config.ts" });

    expect(configurationService.describeConfigurations).toHaveBeenCalledWith({
      configurationPath: "configuration/codometer.config.ts",
      workingDirectory: process.cwd(),
    });
  });

  it("reads the configuration path it is given, and leaves it unset otherwise", () => {
    expect(command.parseConfig("configuration/codometer.config.ts")).toBe(
      "configuration/codometer.config.ts",
    );
    expect(command.parseConfig(undefined)).toBeUndefined();
  });

  it("reads the format it is given, and falls back to markdown", () => {
    expect(command.parseFormat("json")).toBe("json");
    expect(command.parseFormat("")).toBe("markdown");
    expect(command.parseFormat(undefined)).toBe("markdown");
  });

  it("reads the limits flag as set whenever it is present", () => {
    expect(command.parseLimits()).toBe(true);
  });

  it("counts the configurations it could not read when it logs", async () => {
    vi.mocked(configurationService.describeConfigurations).mockResolvedValue({
      described: [
        {
          configuration: undefined,
          directory: "packages/broken",
          error: "Cannot find module",
          path: "packages/broken/codometer.config.ts",
        },
      ],
      rootError: undefined,
    });

    await command.run([], {});

    expect(logger.info).toHaveBeenCalledWith(
      "🔧 Listed the codometer configuration",
      undefined,
      { configurationCount: 1, unreadableCount: 1 },
    );
  });

  it("fails the run when nothing answers for the walk root, and still writes the listing", async () => {
    const previousExitCode = process.exitCode;

    vi.mocked(configurationService.describeConfigurations).mockResolvedValue({
      described: [],
      rootError: "needs a format",
    });

    try {
      await command.run([], {});

      // The listing is what the command exists to produce, so it is still
      // written — but a zero exit code would claim the repository's own
      // exclusions were read when they never were.
      expect(write).toHaveBeenCalledWith("rendered\n");
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("refuses a format it does not know, naming the ones it takes", async () => {
    await expect(command.run([], { format: "yaml" })).rejects.toThrow(
      '--format does not accept "yaml". It takes one of json and markdown.',
    );
  });

  it("defaults the format to markdown", async () => {
    await command.run([], {});

    expect(renderConfigurationService.render).toHaveBeenCalledWith(
      expect.objectContaining({ format: "markdown" }),
    );
  });
});
