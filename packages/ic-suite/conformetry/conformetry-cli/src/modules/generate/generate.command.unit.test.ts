import { ConfigurationService, InputError } from "@conformetry/configuration";
import { GenerationService } from "@conformetry/generation";
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

import { GenerateCommand } from "./generate.command";

import type { ConformetryConfiguration } from "@conformetry/configuration";

const CONFIGURATION: ConformetryConfiguration = [
  {
    inputs: { name: { type: "string" } },
    instances: [],
    name: "widget",
    templatePath: "configuration/templates/widget",
  },
];

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(GenerateCommand, () => {
  let command: GenerateCommand;
  let configurationService: ConfigurationService;
  let generationService: GenerationService;
  let commandLogger: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: GenerationService,
          useValue: createMock<GenerationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(GenerateCommand);
    configurationService = await module.resolve(ConfigurationService);
    generationService = await module.resolve(GenerationService);
    commandLogger = await module.resolve(LoggerService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    process.exitCode = undefined;
    vi.mocked(
      configurationService.loadConformetryConfiguration,
    ).mockResolvedValue(CONFIGURATION);
    vi.mocked(configurationService.resolveGeneratorInputs).mockResolvedValue({
      name: "my-widget",
    });
    vi.mocked(generationService.runGenerator).mockResolvedValue({
      generatedFilePaths: ["/w/generated/widget/my-widget.ts"],
      outputDirectoryPath: "/w/generated/widget",
    });
    vi.mocked(configurationService.isAtTerminal).mockReturnValue(false);
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    // Its own module: the shared setup clears mocks between tests, so a
    // constructor call recorded during `beforeAll` is no longer observable.
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: GenerationService,
          useValue: createMock<GenerationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("GenerateCommand");
  });

  describe("run", () => {
    it("renders the named template and reports what it wrote", async () => {
      await command.run([], { template: "widget" });

      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: {
            name: "widget",
            templateDirectoryPath: "configuration/templates/widget",
          },
        }),
      );
      expect(generationService.runGenerator).toHaveBeenCalledTimes(1);
    });

    it("writes into the directory the caller named", async () => {
      await command.run([], { directory: "/tmp/out", template: "widget" });

      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({ instancePath: "/tmp/out" }),
      );
    });

    it("falls back to a directory named after the template", async () => {
      await command.run([], { template: "widget" });

      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({ instancePath: "generated/widget" }),
      );
    });

    it("reads the configuration path the caller named", async () => {
      await command.run([], {
        config: "custom/conformetry.config.ts",
        template: "widget",
      });

      expect(
        configurationService.loadConformetryConfiguration,
      ).toHaveBeenCalledWith("custom/conformetry.config.ts");
    });

    it("names the available templates when asked for an unknown one", async () => {
      await expect(command.run([], { template: "nope" })).rejects.toThrow(
        'Unknown template "nope". Available: widget',
      );
    });

    it("logs a debug entry marker naming the template", async () => {
      await command.run([], { template: "widget" });

      expect(commandLogger.debug).toHaveBeenCalledWith(
        "🏗 Generating a conformetry instance",
        undefined,
        { template: "widget" },
      );
    });

    it("logs and rejects an unknown template", async () => {
      await expect(command.run([], { template: "nope" })).rejects.toThrow(
        'Unknown template "nope"',
      );

      expect(commandLogger.error).toHaveBeenCalledWith(
        "🚫 Rejected an unknown template",
        undefined,
        { template: "nope" },
      );
    });

    // The command decides nothing about prompting any more — no flag, no TTY
    // read, no CI check. It hands over the arguments and the schema, and the
    // input service refuses on its own where nobody can be asked.
    it("asks for the generator's inputs without deciding whether to prompt", async () => {
      await command.run([], { template: "widget" });

      // An exact object rather than `objectContaining`: the point is that
      // nothing else — no `promptWhenMissing` — is passed alongside these two.
      expect(configurationService.resolveGeneratorInputs).toHaveBeenCalledWith({
        rawArguments: expect.any(Array) as string[],
        schema: {
          properties: { name: { type: "string" } },
          required: ["name"],
        },
      });
    });

    it("reports a required input nobody could be asked for as a refused command line", async () => {
      vi.mocked(configurationService.resolveGeneratorInputs).mockRejectedValue(
        new InputError(
          "name is required, and stdin is not a terminal so it cannot be asked for. Pass --name.",
        ),
      );

      // Reported rather than thrown: nothing was generated, and the reader's
      // next move is to pass the flag it named.
      await expect(
        command.run([], { template: "widget" }),
      ).resolves.toBeUndefined();
      expect(process.exitCode).toBe(1);
      expect(commandLogger.error).toHaveBeenCalledWith(
        "🚫 Rejected the command line",
        undefined,
        { reason: expect.stringContaining("--name") as string },
      );
      expect(generationService.runGenerator).not.toHaveBeenCalled();
    });

    it("lets a failure that is not a refused command line propagate", async () => {
      vi.mocked(generationService.runGenerator).mockRejectedValue(
        new Error("Rendering failed."),
      );

      await expect(command.run([], { template: "widget" })).rejects.toThrow(
        "Rendering failed.",
      );
    });
  });

  describe("template selection", () => {
    // Supplying a value is itself how a caller opts out of being asked, so a
    // named template must not reach the picker even at a terminal.
    it("never prompts when the caller named a template", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);

      await command.run([], { template: "widget" });

      expect(configurationService.promptForTemplate).not.toHaveBeenCalled();
      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({ name: "widget" }) as unknown,
        }),
      );
    });

    it("offers the configured templates when none was named", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);
      vi.mocked(configurationService.promptForTemplate).mockResolvedValue(
        "widget",
      );

      await command.run([], {});

      // The loaded configuration itself, not a mapping of it: the picker can
      // then never disagree with what this command would actually run.
      expect(configurationService.promptForTemplate).toHaveBeenCalledWith(
        CONFIGURATION,
      );
      expect(generationService.runGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({ name: "widget" }) as unknown,
        }),
      );
    });

    // A prompt nobody can answer is what once let this command exit 0 having
    // generated nothing, so the names go in the message instead.
    it("names the available templates when nobody can be asked", async () => {
      await command.run([], {});

      expect(process.exitCode).toBe(1);
      expect(commandLogger.error).toHaveBeenCalledWith(
        "🚫 Rejected the command line",
        undefined,
        { reason: expect.stringContaining("Available: widget") as string },
      );
      expect(generationService.runGenerator).not.toHaveBeenCalled();
    });

    // `allowUnknownOptions` is on, so commander accepts `--generator` instead
    // of rejecting it. Left alone it would be read as an input nothing
    // declares and quietly dropped, which is exactly the "appears to work"
    // the rename set out to avoid.
    it.each(["--generator", "--generator=widget"])(
      "refuses %s rather than ignoring it",
      async (argument) => {
        await expect(command.run([argument], {})).rejects.toThrow(
          "--generator was removed. Pass --template instead",
        );
        expect(generationService.runGenerator).not.toHaveBeenCalled();
      },
    );

    it("logs the removed option it refused", async () => {
      await expect(command.run(["--generator"], {})).rejects.toThrow(
        "--generator was removed",
      );

      expect(commandLogger.error).toHaveBeenCalledWith(
        "🚫 Rejected a removed option",
        undefined,
        { option: "--generator" },
      );
    });

    it("refuses a cancelled picker rather than generating nothing", async () => {
      vi.mocked(configurationService.isAtTerminal).mockReturnValue(true);
      vi.mocked(configurationService.promptForTemplate).mockResolvedValue(
        undefined,
      );

      await command.run([], {});

      expect(process.exitCode).toBe(1);
      expect(generationService.runGenerator).not.toHaveBeenCalled();
    });
  });

  describe("option parsing", () => {
    it("parses each option through the input service", () => {
      expect(command.parseConfig("path")).toBeDefined();
      expect(command.parseDirectory("dir")).toBeDefined();
      expect(command.parseTemplate("widget")).toBeDefined();
    });
  });

  describe("required inputs", () => {
    // What `conformetry-nx` has always told Nx about the same generators: a
    // generator substitutes every placeholder it declares, and mustache
    // renders a missing one as empty, so an optional input is a silent hole.
    it("declares every configured input required", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {
            description: { type: "string" },
            name: { type: "string" },
          },
          instances: [],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      await command.run([], { template: "widget" });

      expect(configurationService.resolveGeneratorInputs).toHaveBeenCalledWith({
        rawArguments: expect.any(Array) as string[],
        schema: {
          properties: {
            description: { type: "string" },
            name: { type: "string" },
          },
          required: ["description", "name"],
        },
      });
    });

    it("declares nothing required for a generator taking no inputs", async () => {
      vi.mocked(
        configurationService.loadConformetryConfiguration,
      ).mockResolvedValue([
        {
          inputs: {},
          instances: [],
          name: "widget",
          templatePath: "configuration/templates/widget",
        },
      ]);

      await command.run([], { template: "widget" });

      expect(configurationService.resolveGeneratorInputs).toHaveBeenCalledWith({
        rawArguments: expect.any(Array) as string[],
        schema: { properties: {}, required: [] },
      });
    });
  });
});
