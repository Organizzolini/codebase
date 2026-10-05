import path from "node:path";

import {
  ConfigurationModule,
  ConfigurationService,
} from "@codometer/configuration";
import { MeasureService } from "@codometer/measurement";
import {
  DeliveryService,
  DestinationsService,
  ReportService,
} from "@codometer/output";
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

import { buildCodeStatistics, throwUnknown } from "../../../testing/mocks";

import { MeasureCommand } from "./measure.command";

import type {
  MeasureCommandOptions,
  ResolvedCodometerConfiguration,
  ResolvedCodometerInput,
} from "@codometer/configuration";
import type { EvaluatedLimit, MeasureArguments } from "@codometer/measurement";
import type {
  JsonService,
  MarkdownService,
  ResolvedMarkdownDestination,
} from "@codometer/output";
import type { MockInstance } from "vitest";

const statistics = buildCodeStatistics();

/** Builds a limit that came out over its value. */
function buildBreach(severity: EvaluatedLimit["severity"]): EvaluatedLimit {
  return {
    breached: true,
    label: "Bundle",
    limit: 4000,
    measured: 4529,
    metric: "size",
    severity,
    target: "compiled",
  };
}

/** Builds a resolved configuration with the given output destinations. */
function buildConfiguration(
  outputs: ResolvedCodometerConfiguration["outputs"] = [],
): ResolvedCodometerConfiguration {
  return {
    custom: [],
    defaultInput: undefined,
    exclude: ["**/node_modules/**"],
    excludeFrom: [],
    format: "markdown",
    inputs: [
      {
        analyses: ["language"],
        compression: "none",
        directory: ".",
        exclude: [],
        include: ["**/*"],
        name: "codebase",
      },
    ],
    limits: [],
    outputs,
    python: { command: "python3" },
  };
}

const markdownOutput = {
  custom: [],
  description: undefined,
  endMarker: "<!-- codometer:end -->",
  path: "README.md",
  startMarker: "<!-- codometer:start -->",
  type: "markdown" as const,
  write: undefined,
};

const jsonOutput = {
  custom: [],
  indentation: 2,
  path: "codometer-report.json",
  type: "json" as const,
};

const customStatistic = {
  color: "7c3aed",
  comment: undefined,
  group: "conventions" as const,
  label: "Comment Budget",
  patterns: [],
};

/**
 * Resolves the real configuration service, whose flag reading these tests
 * exercise rather than mock.
 *
 * `ConfigurationModule` is the only way in: the flag reader behind
 * `selectMode` and `resolveFormat` is a provider of that module rather than a
 * public export, because the configuration layer has exactly one public
 * service. Reading a file is still stubbed per test.
 */
async function buildConfigurationService(): Promise<ConfigurationService> {
  const module = await Test.createTestingModule({
    imports: [ConfigurationModule],
  }).compile();

  return module.resolve(ConfigurationService);
}

describe(MeasureCommand, () => {
  let command: MeasureCommand;
  let configurationService: ConfigurationService;
  let measureService: MeasureService;
  let loggerService: LoggerService;
  let jsonService: JsonService;
  let markdownService: MarkdownService;
  let stdoutWriteSpy: MockInstance<typeof process.stdout.write>;

  /** Builds a command whose measurement and output are mocked. */
  function buildCommand(): MeasureCommand {
    return new MeasureCommand(
      configurationService,
      measureService,
      new DeliveryService(jsonService, markdownService),
      new ReportService(),
      new DestinationsService(),
      loggerService,
    );
  }

  /** Runs the command over the mocked configuration. */
  async function run(options: MeasureCommandOptions = {}): Promise<void> {
    await buildCommand().run([], options);
  }

  /** Reports the limits the measurement found breached. */
  function measured(limits: EvaluatedLimit[]): void {
    vi.mocked(measureService.measure).mockReturnValue({
      failures: [],
      indexes: new Map(),
      inputs: [],
      limits,
      statistics,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeasureCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: MeasureService, useValue: createMock<MeasureService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: DeliveryService, useValue: createMock<DeliveryService>() },
        { provide: ReportService, useValue: new ReportService() },
        { provide: DestinationsService, useValue: new DestinationsService() },
      ],
    }).compile();

    command = await module.resolve(MeasureCommand);
  });

  beforeEach(async () => {
    process.exitCode = 0;
    configurationService = await buildConfigurationService();
    measureService = createMock<MeasureService>();
    loggerService = createMock<LoggerService>();
    jsonService = createMock<JsonService>();
    markdownService = createMock<MarkdownService>();
    stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.spyOn(configurationService, "loadConfiguration").mockResolvedValue(
      buildConfiguration(),
    );
    measured([]);
    vi.mocked(jsonService.render).mockReturnValue("{}\n");
    vi.mocked(jsonService.sync).mockReturnValue(true);
    vi.mocked(markdownService.renderBlock).mockReturnValue("block");
    vi.mocked(markdownService.sync).mockReturnValue(true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    process.exitCode = 0;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeasureCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: MeasureService, useValue: createMock<MeasureService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: DeliveryService, useValue: createMock<DeliveryService>() },
        { provide: ReportService, useValue: new ReportService() },
        { provide: DestinationsService, useValue: new DestinationsService() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("MeasureCommand");
  });

  describe("the command line", () => {
    it("refuses an unknown --check value and never measures", async () => {
      await run({ check: "bogus" });

      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the command line",
        undefined,
        expect.objectContaining({
          reasons: [expect.stringContaining('does not accept "bogus"')],
        }),
      );
    });

    it("refuses --check reports together with --output-json", async () => {
      await run({ check: "reports", outputJson: true });

      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it("refuses a configuration nothing can read", async () => {
      vi.mocked(configurationService.loadConfiguration).mockRejectedValue(
        new Error("malformed configuration"),
      );

      await run();

      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the configuration",
        undefined,
        { reason: "malformed configuration" },
      );
    });

    it("reports a non-Error thrown value as a plain string", async () => {
      vi.mocked(configurationService.loadConfiguration).mockImplementation(
        () => {
          throwUnknown("not an Error");
        },
      );

      await run();

      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the configuration",
        undefined,
        { reason: "not an Error" },
      );
    });

    it("refuses a bare --output-json when the configuration names no json output", async () => {
      await run({ outputJson: true });

      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Rejected the command line",
        undefined,
        expect.objectContaining({
          reasons: [expect.stringContaining("--output-json needs a path")],
        }),
      );
    });

    it("refuses an unknown --format value", async () => {
      await run({ format: "yaml" });

      expect(measureService.measure).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });
  });

  describe("--inputs", () => {
    it("replaces every configured input with the given globs", async () => {
      await run({ inputs: ["dist/**/*.js", "!dist/**/*.map.js"] });

      expect(measureService.measure).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Partial<MeasureArguments>>({
          configuration: expect.objectContaining<
            Partial<ResolvedCodometerConfiguration>
          >({
            inputs: [
              expect.objectContaining<Partial<ResolvedCodometerInput>>({
                analyses: ["language"],
                include: ["dist/**/*.js", "!dist/**/*.map.js"],
              }),
            ],
          }),
        }),
      );
    });

    it("leaves the configured inputs alone when the flag is never passed", async () => {
      await run();

      expect(measureService.measure).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Partial<MeasureArguments>>({
          configuration: expect.objectContaining<
            Partial<ResolvedCodometerConfiguration>
          >({
            inputs: buildConfiguration().inputs,
          }),
        }),
      );
    });
  });

  describe("--format", () => {
    it("prints the badges when the run touches no file", async () => {
      await run();

      expect(stdoutWriteSpy).toHaveBeenCalledWith("block\n");
    });

    it("falls back to the resolved configuration's format when omitted", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
        ...buildConfiguration(),
        format: "json",
      });

      await run();

      expect(jsonService.render).toHaveBeenCalledWith({
        indentation: 2,
        report: { failures: [], targets: [] },
      });
    });

    it("prints what --format asked for over the configured value", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
        ...buildConfiguration(),
        format: "json",
      });

      await run({ format: "markdown" });

      expect(stdoutWriteSpy).toHaveBeenCalledWith("block\n");
      expect(jsonService.render).not.toHaveBeenCalled();
    });
  });

  describe("--output-json and --output-markdown", () => {
    it("writes the badge block where --output-markdown named", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([markdownOutput]),
      );

      await run({ outputMarkdown: true });

      expect(markdownService.sync).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<
          Partial<Parameters<MarkdownService["sync"]>[0]>
        >({
          destination: expect.objectContaining<
            Partial<ResolvedMarkdownDestination>
          >({
            path: path.resolve(process.cwd(), "README.md"),
          }),
        }),
      );
    });

    it("writes the report where --output-json named, without writing markdown too", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([jsonOutput, markdownOutput]),
      );

      await run({ outputJson: true });

      expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ indentation: 2 }),
      );
      expect(markdownService.sync).not.toHaveBeenCalled();
    });

    it("produces only the sink the command line named", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([jsonOutput, markdownOutput]),
      );

      await run({ format: "json", outputJson: true });

      expect(stdoutWriteSpy).toHaveBeenCalledWith("{}\n");
      expect(jsonService.sync).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ indentation: 2 }),
      );
      expect(markdownService.sync).not.toHaveBeenCalled();
    });

    // The regression this exists for: `--output-json` alone used to make the
    // console fall back to the empty default markdown destination, silently
    // dropping every configured custom counter's badge and instance section.
    it("keeps a configured custom counter in the console badges when only --output-json was passed", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([
          jsonOutput,
          { ...markdownOutput, custom: [customStatistic] },
        ]),
      );

      await run({ outputJson: true });

      expect(markdownService.renderBlock).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<
          Partial<Parameters<MarkdownService["renderBlock"]>[0]>
        >({
          destination: expect.objectContaining<
            Partial<ResolvedMarkdownDestination>
          >({ custom: [customStatistic] }),
        }),
      );
    });

    it("names a stale report the run was checking", async () => {
      vi.mocked(jsonService.sync).mockReturnValue(false);
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([jsonOutput]),
      );

      await run({ check: "reports" });

      expect(process.exitCode).toBe(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Found stale reports",
        undefined,
        expect.objectContaining({
          paths: [expect.stringContaining("codometer-report.json")],
        }),
      );
    });
  });

  describe("what it excludes from measurement", () => {
    it("keeps every file it writes out of what it measures", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([jsonOutput]),
      );

      await run({ outputJson: true });

      expect(measureService.measure).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ outputPaths: ["codometer-report.json"] }),
      );
    });

    it("says on the console which files it left out", async () => {
      vi.mocked(configurationService.loadConfiguration).mockResolvedValue(
        buildConfiguration([jsonOutput]),
      );

      await run({ outputJson: true });

      expect(loggerService.info).toHaveBeenCalledWith(
        "📊 Excluded the files codometer writes from what it measures",
        undefined,
        { paths: ["codometer-report.json"] },
      );
    });

    it("says nothing about excluded files when it writes nothing at all", async () => {
      await run();

      expect(loggerService.info).not.toHaveBeenCalledWith(
        "📊 Excluded the files codometer writes from what it measures",
        undefined,
        expect.anything(),
      );
    });
  });

  describe("what it reports", () => {
    it("reports a warn breach without touching the exit code", async () => {
      measured([buildBreach("warn")]);

      await run({ check: "limits" });

      expect(process.exitCode).toBe(0);
      expect(loggerService.warn).toHaveBeenCalledWith(
        "📊 Breached a warning limit",
        undefined,
        { limits: [buildBreach("warn")] },
      );
    });

    it("fails a run that gates limits on a failing breach", async () => {
      measured([buildBreach("fail")]);

      await run({ check: "limits" });

      expect(process.exitCode).toBe(1);
    });

    it("does not fail a run that gates nothing on a failing breach", async () => {
      measured([buildBreach("fail")]);

      await run();

      expect(process.exitCode).toBe(0);
    });

    it("reports what it could not measure and fails a gating run", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        failures: [{ kind: "input", reason: "gone", subject: "compiled" }],
        indexes: new Map(),
        inputs: [],
        limits: [],
        statistics,
      });

      await run({ check: "limits" });

      expect(process.exitCode).toBe(1);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Failed to measure part of the run",
        undefined,
        { failures: [{ kind: "input", reason: "gone", subject: "compiled" }] },
      );
    });

    it("reports what it could not measure without failing a bare run", async () => {
      vi.mocked(measureService.measure).mockReturnValue({
        failures: [{ kind: "input", reason: "gone", subject: "compiled" }],
        indexes: new Map(),
        inputs: [],
        limits: [],
        statistics,
      });

      await run();

      expect(process.exitCode).toBe(0);
    });

    it("logs completion with the input count and breach count", async () => {
      measured([buildBreach("warn")]);

      await run();

      expect(loggerService.info).toHaveBeenCalledWith(
        "✅ Finished the measurement run",
        undefined,
        { breachCount: 1, inputCount: 0 },
      );
    });
  });

  describe("parsers", () => {
    it("returns the parsed value for every path flag", () => {
      expect(command.parseCheck("limits")).toBe("limits");
      expect(command.parseConfig("codometer.config.ts")).toBe(
        "codometer.config.ts",
      );
      expect(command.parseFormat("json")).toBe("json");
      expect(command.parseOutputJson("report.json")).toBe("report.json");
      expect(command.parseOutputJson(true)).toBe(true);
      expect(command.parseOutputMarkdown("README.md")).toBe("README.md");
      expect(command.parseOutputMarkdown(true)).toBe(true);
    });

    it("accumulates every --inputs value into one array", () => {
      const first = command.parseInputs("src/**/*.ts", undefined);
      const second = command.parseInputs("!src/**/*.test.ts", first);

      expect(second).toStrictEqual(["src/**/*.ts", "!src/**/*.test.ts"]);
    });
  });
});
