import {
  ConfigurationModule,
  InputError,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "@callidescope/configuration";
import { ProgramConfigurationError } from "@callidescope/graph";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logging";

import { LimitsCommand } from "./limits.command";
import { LimitsService } from "./limits.service";
import { RenderLimitsService } from "./render-limits.service";

describe(LimitsCommand, () => {
  let command: LimitsCommand;
  let limitsService: LimitsService;
  let logger: LoggerService;
  let renderLimitsService: RenderLimitsService;
  let write: MockInstance<typeof process.stdout.write>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        LimitsCommand,
        { provide: LimitsService, useValue: createMock<LimitsService>() },
        {
          provide: RenderLimitsService,
          useValue: createMock<RenderLimitsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(LimitsCommand);
    limitsService = module.get(LimitsService);
    logger = module.get(LoggerService);
    renderLimitsService = module.get(RenderLimitsService);
  });

  beforeEach(() => {
    vi.mocked(limitsService.list).mockResolvedValue([]);
    vi.mocked(renderLimitsService.render).mockReturnValue("rendered");
    vi.mocked(logger.error).mockClear();
    write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        LimitsCommand,
        { provide: LimitsService, useValue: createMock<LimitsService>() },
        {
          provide: RenderLimitsService,
          useValue: createMock<RenderLimitsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    await module.resolve(LimitsCommand);

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("LimitsCommand");
  });

  it("writes the rendered listing to standard output", async () => {
    await command.run([], {});

    expect(write).toHaveBeenCalledWith("rendered\n");
  });

  it("renders the rows the service resolved", async () => {
    const rows = [
      {
        limit: "maximumDepth" as const,
        origin: "declared" as const,
        path: "configuration/callidescope.config.ts",
        project: undefined,
        value: 17,
      },
    ];

    vi.mocked(limitsService.list).mockResolvedValue(rows);

    await command.run([], {});

    expect(renderLimitsService.render).toHaveBeenCalledWith(rows);
  });

  it("passes the configuration path it was given to the service", async () => {
    await command.run([], { config: "configuration/callidescope.config.ts" });

    expect(limitsService.list).toHaveBeenCalledWith({
      config: "configuration/callidescope.config.ts",
    });
  });

  it("leaves the exit code alone, because it gates nothing", async () => {
    await command.run([], {});

    expect(process.exitCode).toBeUndefined();
  });

  it("reads the configuration path it is given, and treats blank as absent", () => {
    expect(command.parseConfig("callidescope.config.ts")).toBe(
      "callidescope.config.ts",
    );
    expect(command.parseConfig(" ")).toBeUndefined();
    expect(command.parseConfig(undefined)).toBeUndefined();
  });

  // The headline is per refusal class rather than one word for all three, so a
  // listing says which kind of file it could not read — the same headlines a
  // trace, a depth, and a breadth print, because all four read one classifier.
  it.each([
    [
      "a project configuration that could not be read",
      new ProjectConfigurationError({
        cause: new Error("Unexpected token"),
        configurationPath: "packages/alpha/callidescope.config.ts",
        project: "packages/alpha",
      }),
      "🔭 Rejected a project configuration",
    ],
    [
      "a project configuration setting a workspace-only field",
      new ProjectConfigurationFieldNotPermittedError({
        field: "output",
        project: "packages/alpha",
      }),
      "🔭 Rejected a project configuration",
    ],
    [
      "a project directory holding no tsconfig",
      new ProgramConfigurationError({
        configurationPath: "packages/alpha/tsconfig.json",
        messages: ["missing"],
      }),
      "🔭 Rejected a project it could not read",
    ],
    [
      "a command line the input service refused",
      new InputError("not a format"),
      "🔭 Rejected the command line",
    ],
  ])(
    "fails the run and prints nothing for %s",
    async (_name, error, headline) => {
      vi.mocked(limitsService.list).mockRejectedValue(error);

      await command.run([], {});

      expect(write).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalledWith(headline, undefined, {
        reason: error.message,
      });
    },
  );

  it("lets an unexpected failure through rather than reporting it as a refusal", async () => {
    vi.mocked(limitsService.list).mockRejectedValue(new Error("boom"));

    await expect(command.run([], {})).rejects.toThrow("boom");
  });
});
