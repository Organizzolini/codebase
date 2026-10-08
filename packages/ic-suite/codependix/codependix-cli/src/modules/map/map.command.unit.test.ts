import {
  type BoundaryCheckOutcome,
  BoundaryCheckService,
  BoundaryOutcomeReportService,
  BoundaryReportService,
  type BoundaryViolation,
  type GraphRunContext,
  type JudgedBoundaryFinding,
  RunContextService,
} from "@codependix/boundaries";
import {
  ConfigurationService,
  InputError,
  missingInputError,
  RUN_MODE_SUBJECT,
} from "@codependix/configuration";
import {
  CombinedOutputService,
  GraphRunService,
  ReportingService,
} from "@codependix/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { MapCommand } from "./map.command";

import type { MapCommandOptions } from "@codependix/configuration";
import type { GraphRunOutcome, RunMode } from "@codependix/core";
import type { CombinedGraphExports } from "@codependix/output";

/**
 * Builds the shape `GraphRunService.run` resolves — a `GraphRunOutcome` and every
 * active graph type's combined-output data, empty unless a test names one.
 */
function buildMapRun(
  outcome: GraphRunOutcome,
  combinedGraphs: CombinedGraphExports = {},
): { combinedGraphs: CombinedGraphExports; outcome: GraphRunOutcome } {
  return { combinedGraphs, outcome };
}

/** Builds a run mode, defaulting every flag a test does not name. */
function buildMode(overrides: Partial<RunMode> = {}): RunMode {
  return {
    checksBoundaries: false,
    checksReports: false,
    writes: true,
    ...overrides,
  };
}

const VIOLATION: JudgedBoundaryFinding<BoundaryViolation> = {
  cycle: undefined,
  level: "nxProjects",
  message: "layers: a must not depend on b.",
  projects: ["a"],
  rule: "layers",
  scope: "workspace",
  source: "a",
  target: "b",
  verdict: "fail",
};

describe(MapCommand, () => {
  let command: MapCommand;
  let boundaryCheckService: BoundaryCheckService;
  let codependixService: GraphRunService;
  let combinedOutputService: CombinedOutputService;
  let configurationService: ConfigurationService;
  let loggerService: LoggerService;
  let reportingService: ReportingService;
  let runContextService: RunContextService;

  /**
   * Builds a command whose collaborators are freshly mocked.
   *
   * `reportingService` is a real instance built over the same mocked
   * `loggerService`/`BoundaryReportService` this file already asserts
   * against, so every existing assertion on `loggerService.error`/`.warn`/
   * `.info` still reads what the run actually logged — `ReportingService`'s
   * own unit tests cover its formatting in isolation.
   */
  function buildCommand(): MapCommand {
    return new MapCommand(
      codependixService,
      boundaryCheckService,
      combinedOutputService,
      configurationService,
      loggerService,
      reportingService,
      runContextService,
    );
  }

  /** Runs a freshly built command with the given options. */
  async function run(options: MapCommandOptions = {}): Promise<void> {
    await buildCommand().run([], options);
  }

  /** Hands the command a context, as `RunContextService.build` resolves one. */
  function buildContextWithInclude(include: string[]): GraphRunContext {
    return {
      buildProjects: [],
      configuration: {
        boundaries: {
          fileImports: { python: [], typescript: [] },
          nestjsModules: [],
          nxProjects: [],
        },
        exclude: [],
        include,
        projectGraph: undefined,
        selection: { dependencies: true, projects: [], tags: [] },
        workspace: {},
      },
      enabledGraphTypes: new Set([
        "fileImports",
        "nestjsModules",
        "nxProjects",
      ]),
      graph: { dependencies: {}, nodes: {} },
      mode: "write",
      projectConfigurations: new Map(),
      projects: [],
      selectedProjects: [],
      workingDirectory: "/workspace",
    };
  }

  /** Hands the command a mode, as the configuration service would resolve one. */
  function selectMode(overrides: Partial<RunMode> = {}): RunMode {
    const mode = buildMode(overrides);

    vi.mocked(configurationService.selectMode).mockResolvedValue({
      errors: [],
      mode,
    });
    vi.mocked(configurationService.touchesFiles).mockReturnValue(
      mode.checksReports || mode.writes,
    );

    return mode;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapCommand,
        {
          provide: BoundaryCheckService,
          useValue: createMock<BoundaryCheckService>(),
        },
        { provide: GraphRunService, useValue: createMock<GraphRunService>() },
        {
          provide: CombinedOutputService,
          useValue: createMock<CombinedOutputService>(),
        },
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: ReportingService,
          useValue: createMock<ReportingService>(),
        },
        {
          provide: RunContextService,
          useValue: createMock<RunContextService>(),
        },
      ],
    }).compile();

    command = await module.resolve(MapCommand);
  });

  beforeEach(() => {
    process.exitCode = 0;
    boundaryCheckService = createMock<BoundaryCheckService>();
    codependixService = createMock<GraphRunService>();
    combinedOutputService = createMock<CombinedOutputService>();
    configurationService = createMock<ConfigurationService>();
    loggerService = createMock<LoggerService>();
    const boundaryReportService = new BoundaryReportService();

    reportingService = new ReportingService(
      new BoundaryOutcomeReportService(boundaryReportService),
      boundaryReportService,
      loggerService,
    );
    runContextService = createMock<RunContextService>();
    vi.mocked(runContextService.build).mockResolvedValue(
      buildContextWithInclude(["**"]),
    );
    vi.mocked(runContextService.findUnmatchedSelection).mockReturnValue({
      projects: [],
      tags: [],
    });
    vi.mocked(codependixService.run).mockResolvedValue(
      buildMapRun({ failures: [], results: [] }),
    );
    vi.mocked(combinedOutputService.resolveFormat).mockReturnValue({
      errors: [],
      format: "markdown",
    });
    vi.mocked(boundaryCheckService.run).mockResolvedValue({
      failures: [],
      violations: [],
    });
    vi.mocked(configurationService.parseOptionalOption).mockImplementation(
      (value) => value,
    );
    vi.mocked(configurationService.parsePathOption).mockImplementation(
      (value) => value ?? process.cwd(),
    );
    vi.mocked(configurationService.parseFlagOption).mockImplementation(
      (value) => value ?? true,
    );
    selectMode();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  describe("an empty project selection", () => {
    // Nothing else catches it: --check boundaries judges every project
    // regardless of include, so the gate stays green while exports go silent.
    it("warns when no project was selected", async () => {
      vi.mocked(codependixService.run).mockResolvedValue(
        buildMapRun({ failures: [], results: [] }),
      );

      await run({ write: true });

      expect(loggerService.warn).toHaveBeenCalledWith(
        "🕸️ Selected no project to export",
        undefined,
        expect.objectContaining({ hint: expect.any(String) as unknown }),
      );
    });

    it("stays quiet when projects were selected", async () => {
      vi.mocked(codependixService.run).mockResolvedValue(
        buildMapRun({
          failures: [],
          results: [
            {
              isCurrent: true,
              projectName: "atlas-service",
              staleExports: [],
              stalePaths: [],
            },
          ],
        }),
      );

      await run({ write: true });

      expect(loggerService.warn).not.toHaveBeenCalled();
    });

    // The boundary gate reads no include, so an empty one says nothing there.
    it("stays quiet on a boundaries-only run", async () => {
      selectMode({
        checksBoundaries: true,
        checksReports: false,
        writes: false,
      });

      await run({ check: "boundaries" });

      expect(loggerService.warn).not.toHaveBeenCalled();
    });
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapCommand,
        {
          provide: BoundaryCheckService,
          useValue: createMock<BoundaryCheckService>(),
        },
        { provide: GraphRunService, useValue: createMock<GraphRunService>() },
        {
          provide: CombinedOutputService,
          useValue: createMock<CombinedOutputService>(),
        },
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: ReportingService,
          useValue: createMock<ReportingService>(),
        },
        {
          provide: RunContextService,
          useValue: createMock<RunContextService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("MapCommand");
  });

  it("reports a rejected command line without attempting anything", async () => {
    vi.mocked(configurationService.selectMode).mockResolvedValue({
      errors: ["--check needs a value."],
      mode: buildMode({ writes: false }),
    });

    await run({ check: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(boundaryCheckService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      { reasons: ["--check needs a value."] },
    );
  });

  it("reports an unanswerable prompt as a rejected command line", async () => {
    vi.mocked(configurationService.selectMode).mockRejectedValue(
      missingInputError(RUN_MODE_SUBJECT),
    );

    await run({});

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      {
        reason:
          "A run mode (--check or --write) is required, and stdin is not a terminal so it cannot be asked for.",
      },
    );
  });

  it("reports anything else the resolution threw as a failed run", async () => {
    vi.mocked(configurationService.selectMode).mockRejectedValue(
      new Error("boom"),
    );

    await run({});

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  it("builds the context once and hands it to both passes", async () => {
    selectMode({ checksBoundaries: true, writes: true });

    await run({ directory: "/workspace" });

    expect(runContextService.build).toHaveBeenCalledWith({
      mode: "write",
      options: { directory: "/workspace" },
      workingDirectory: "/workspace",
    });
    expect(codependixService.run).toHaveBeenCalledTimes(1);
    expect(boundaryCheckService.run).toHaveBeenCalledTimes(1);
  });

  it("builds a check-mode context when the run writes nothing", async () => {
    selectMode({ checksReports: true, writes: false });

    await run({});

    expect(runContextService.build).toHaveBeenCalledWith({
      mode: "check",
      options: {},
      workingDirectory: process.cwd(),
    });
  });

  it("delivers no export when only boundaries are checked", async () => {
    selectMode({ checksBoundaries: true, writes: false });

    await run({ check: "boundaries" });

    expect(codependixService.run).not.toHaveBeenCalled();
    expect(boundaryCheckService.run).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
    expect(loggerService.info).toHaveBeenCalledWith(
      "🕸️ Verified every declared codependix boundary holds",
    );
  });

  it("judges no boundary when only exports are checked", async () => {
    selectMode({ checksReports: true, writes: false });

    await run({ check: "reports" });

    expect(boundaryCheckService.run).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    expect(loggerService.info).toHaveBeenCalledWith(
      "🕸️ Verified every configured codependix export is current",
      undefined,
      { projects: 0 },
    );
  });

  it("succeeds when every result is current and nothing failed", async () => {
    await run({ write: true });

    expect(process.exitCode).toBe(0);
  });

  it("fails in check mode when a result is stale", async () => {
    selectMode({ checksReports: true, writes: false });
    const outcome: GraphRunOutcome = {
      failures: [],
      results: [
        {
          isCurrent: false,
          projectName: "codependix-nx",
          staleExports: [
            {
              anchor: undefined,
              difference: "graph",
              path: "codependix-nx.json",
            },
          ],
          stalePaths: ["codependix-nx.json"],
        },
      ],
    };
    vi.mocked(codependixService.run).mockResolvedValue(buildMapRun(outcome));

    await run({ check: "reports" });

    expect(process.exitCode).toBe(1);
  });

  it("fails and logs when a project fails, without a thrown error", async () => {
    const outcome: GraphRunOutcome = {
      failures: [{ error: "boom", projectName: "codependix-nestjs" }],
      results: [
        {
          isCurrent: true,
          projectName: "codependix-nx",
          staleExports: [],
          stalePaths: [],
        },
      ],
    };
    vi.mocked(codependixService.run).mockResolvedValue(buildMapRun(outcome));

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { failures: outcome.failures },
    );
  });

  it("reports both a failed project and a stale export together", async () => {
    selectMode({ checksReports: true, writes: false });
    const outcome: GraphRunOutcome = {
      failures: [{ error: "boom", projectName: "codependix-nestjs" }],
      results: [
        {
          isCurrent: false,
          projectName: "codependix-nx",
          staleExports: [
            {
              anchor: undefined,
              difference: "graph",
              path: "codependix-nx.json",
            },
          ],
          stalePaths: ["codependix-nx.json"],
        },
      ],
    };
    vi.mocked(codependixService.run).mockResolvedValue(buildMapRun(outcome));

    await run({ check: "reports" });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { failures: outcome.failures },
    );
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found stale codependix exports",
      undefined,
      {
        exports: [
          {
            anchor: undefined,
            difference: "graph",
            path: "codependix-nx.json",
            project: "codependix-nx",
          },
        ],
        projects: ["codependix-nx"],
      },
    );
  });

  it("fails and names every boundary violation it found", async () => {
    selectMode({ checksBoundaries: true, writes: false });
    const outcome: BoundaryCheckOutcome = {
      failures: [],
      violations: [VIOLATION],
    };
    vi.mocked(boundaryCheckService.run).mockResolvedValue(outcome);

    await run({ check: "boundaries" });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found codependix boundary violations",
      undefined,
      {
        summary: "1 boundary violation across 1 rule.",
        violations: ["nxProjects a: layers: a must not depend on b."],
      },
    );
  });

  it("fails and logs a project whose graph could not be judged", async () => {
    selectMode({ checksBoundaries: true, writes: false });
    vi.mocked(boundaryCheckService.run).mockResolvedValue({
      failures: [
        {
          error: "boom",
          level: "nestjsModules",
          projects: ["lexico"],
          verdict: "fail",
        },
      ],
      violations: [],
    });

    await run({ check: "boundaries" });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { failures: ["nestjsModules lexico: boom"] },
    );
  });

  it("reports a stale export and a broken boundary in the same run", async () => {
    selectMode({ checksBoundaries: true, writes: true });
    vi.mocked(codependixService.run).mockResolvedValue(
      buildMapRun({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-nx",
            staleExports: [
              {
                anchor: undefined,
                difference: "graph",
                path: "a",
              },
            ],
            stalePaths: ["a"],
          },
        ],
      }),
    );
    vi.mocked(boundaryCheckService.run).mockResolvedValue({
      failures: [],
      violations: [VIOLATION],
    });

    await run({ check: "boundaries", write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found stale codependix exports",
      undefined,
      {
        exports: [
          {
            anchor: undefined,
            difference: "graph",
            path: "a",
            project: "codependix-nx",
          },
        ],
        projects: ["codependix-nx"],
      },
    );
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found codependix boundary violations",
      undefined,
      expect.anything(),
    );
  });

  it("fails and logs when the run throws", async () => {
    vi.mocked(codependixService.run).mockRejectedValue(new Error("boom"));

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  it("fails and logs a non-Error rejection as its string form", async () => {
    vi.mocked(codependixService.run).mockRejectedValue("boom");

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  // Each of these asserts the hand-off, not the parsed value: the rules
  // themselves are the input service's, and are covered by its own tests.
  // Sentinels rather than realistic answers, so a parser reintroduced inline
  // here fails rather than coincidentally agreeing with the stub.

  it("hands --check through unparsed, for the configuration service to read", () => {
    expect(buildCommand().parseCheck("boundaries,reports")).toBe(
      "boundaries,reports",
    );
  });

  it("delegates --write to the configuration service", () => {
    vi.mocked(configurationService.parseFlagOption).mockReturnValue(false);

    expect(buildCommand().parseWrite(undefined)).toBe(false);
    expect(configurationService.parseFlagOption).toHaveBeenCalledWith(
      undefined,
    );
  });

  it("delegates --config to the configuration service", () => {
    vi.mocked(configurationService.parseOptionalOption).mockReturnValue(
      "parsed",
    );

    expect(buildCommand().parseConfig("  codependix.config.ts  ")).toBe(
      "parsed",
    );
    expect(configurationService.parseOptionalOption).toHaveBeenCalledWith(
      "  codependix.config.ts  ",
    );
  });

  it("delegates --projects to the configuration service", () => {
    vi.mocked(configurationService.parseOptionalOption).mockReturnValue(
      "parsed",
    );

    expect(buildCommand().parseProjects("  lexico,caelundas  ")).toBe("parsed");
    expect(configurationService.parseOptionalOption).toHaveBeenCalledWith(
      "  lexico,caelundas  ",
    );
  });

  it("delegates --tags to the configuration service", () => {
    vi.mocked(configurationService.parseOptionalOption).mockReturnValue(
      "parsed",
    );

    expect(buildCommand().parseTags("  type:package  ")).toBe("parsed");
    expect(configurationService.parseOptionalOption).toHaveBeenCalledWith(
      "  type:package  ",
    );
  });

  it("delegates --directory to the configuration service", () => {
    vi.mocked(configurationService.parsePathOption).mockReturnValue("parsed");

    expect(buildCommand().parseDirectory(undefined)).toBe("parsed");
    expect(configurationService.parsePathOption).toHaveBeenCalledWith(
      undefined,
    );
  });

  it("delegates mode resolution to the configuration service", async () => {
    await run({ directory: "packages/logging" });

    expect(configurationService.selectMode).toHaveBeenCalledWith({
      directory: "packages/logging",
    });
  });

  // 🚫 Strict override flags

  it("delegates --include to the shared comma-delimited parser", () => {
    vi.mocked(configurationService.parseCommaDelimitedOption).mockReturnValue([
      "applications/**",
    ]);

    expect(buildCommand().parseInclude("applications/**")).toStrictEqual([
      "applications/**",
    ]);
    expect(configurationService.parseCommaDelimitedOption).toHaveBeenCalledWith(
      "applications/**",
    );
  });

  it("delegates --exclude to the shared comma-delimited parser", () => {
    vi.mocked(configurationService.parseCommaDelimitedOption).mockReturnValue([
      "fixtures-*",
    ]);

    expect(buildCommand().parseExclude("fixtures-*")).toStrictEqual([
      "fixtures-*",
    ]);
    expect(configurationService.parseCommaDelimitedOption).toHaveBeenCalledWith(
      "fixtures-*",
    );
  });

  // `ConfigurationService.loadConfiguration` is where `--include`/`--exclude`
  // are actually refused for a target that never declared the field — see
  // its own unit tests. This only asserts the refusal reaches the reader
  // exactly the way every other rejected command line does, matching
  // callidescope's `depth.command.unit.test.ts` "reports a refused command
  // line instead of crashing".
  describe("a selection matching only in part", () => {
    beforeEach(() => {
      selectMode({ checksBoundaries: true });
      vi.mocked(runContextService.findUnmatchedSelection).mockReturnValue({
        projects: ["typo"],
        tags: ["scope:nothing"],
      });
    });

    // The names that did match were judged, so the run is no worse for it.
    it("warns naming each unmatched entry and leaves the exit code alone", async () => {
      await run({ check: "boundaries", projects: "widgets,typo" });

      expect(loggerService.warn).toHaveBeenCalledWith(
        "🕸️ Ignored selection entries that matched no project",
        undefined,
        {
          hint: "check the spelling — the run judged only the entries that matched",
          projects: ["typo"],
          tags: ["scope:nothing"],
        },
      );
      expect(process.exitCode).toBe(0);
    });
  });

  it("reports an --include/--exclude refusal as a rejected command line", async () => {
    const error = new InputError(
      "--include overrides a value the configuration does not declare. Add `include` to the configuration this run reads, then use --include to change it.",
    );

    vi.mocked(runContextService.build).mockRejectedValue(error);

    await run({ include: ["applications/**"], write: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      { reason: error.message },
    );
  });

  // 🧭 Dependency closure

  it("delegates --dependencies to an unconditional true", () => {
    expect(buildCommand().parseDependencies()).toBe(true);
  });

  it("delegates --no-dependencies to an unconditional false", () => {
    expect(buildCommand().parseNoDependencies()).toBe(false);
  });

  it("hands --no-dependencies to the run context builder", async () => {
    await run({ check: "boundaries", dependencies: false, projects: "a" });

    expect(runContextService.build).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ dependencies: false }) as unknown,
      }),
    );
  });

  // 🎛️ Graph-type toggles

  it("delegates --file-imports to an unconditional true", () => {
    expect(buildCommand().parseFileImports()).toBe(true);
  });

  it("delegates --no-file-imports to an unconditional false", () => {
    expect(buildCommand().parseNoFileImports()).toBe(false);
  });

  it("delegates --nestjs-modules to an unconditional true", () => {
    expect(buildCommand().parseNestjsModules()).toBe(true);
  });

  it("delegates --no-nestjs-modules to an unconditional false", () => {
    expect(buildCommand().parseNoNestjsModules()).toBe(false);
  });

  it("delegates --nx-projects to an unconditional true", () => {
    expect(buildCommand().parseNxProjects()).toBe(true);
  });

  it("delegates --no-nx-projects to an unconditional false", () => {
    expect(buildCommand().parseNoNxProjects()).toBe(false);
  });

  it("hands the graph-type toggles to the run context builder", async () => {
    await run({ fileImports: false, write: true });

    expect(runContextService.build).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ fileImports: false }) as unknown,
      }),
    );
  });

  // 🧾 Combined output and format flags

  it("delegates --json-output to the configuration service", () => {
    vi.mocked(configurationService.parseOptionalOption).mockReturnValue(
      "out.json",
    );

    expect(buildCommand().parseJsonOutput("out.json")).toBe("out.json");
    expect(configurationService.parseOptionalOption).toHaveBeenCalledWith(
      "out.json",
    );
  });

  it("delegates --markdown-output to the configuration service", () => {
    vi.mocked(configurationService.parseOptionalOption).mockReturnValue(
      "out.md",
    );

    expect(buildCommand().parseMarkdownOutput("out.md")).toBe("out.md");
    expect(configurationService.parseOptionalOption).toHaveBeenCalledWith(
      "out.md",
    );
  });

  it("delegates --format to the configuration service", () => {
    vi.mocked(configurationService.parseOptionalOption).mockReturnValue("json");

    expect(buildCommand().parseFormat("json")).toBe("json");
    expect(configurationService.parseOptionalOption).toHaveBeenCalledWith(
      "json",
    );
  });

  it("rejects the command line when --format names something CombinedOutputService refuses", async () => {
    vi.mocked(combinedOutputService.resolveFormat).mockReturnValue({
      errors: ['--format does not accept "yaml".'],
      format: "markdown",
    });

    await run({ format: "yaml", write: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      { reasons: ['--format does not accept "yaml".'] },
    );
  });

  it("combines a --format rejection with a --check rejection in the same report", async () => {
    vi.mocked(configurationService.selectMode).mockResolvedValue({
      errors: ["--check needs a value."],
      mode: buildMode({ writes: false }),
    });
    vi.mocked(combinedOutputService.resolveFormat).mockReturnValue({
      errors: ['--format does not accept "yaml".'],
      format: "markdown",
    });

    await run({ check: true, format: "yaml" });

    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      {
        reasons: ["--check needs a value.", '--format does not accept "yaml".'],
      },
    );
  });

  it("prints and writes the combined output whenever the export pass ran", async () => {
    vi.mocked(codependixService.run).mockResolvedValue(
      buildMapRun(
        { failures: [], results: [] },
        {
          nxProjects: {
            json: { projectNames: [] },
            markdown: "```mermaid\n```",
          },
        },
      ),
    );

    await run({
      directory: "/workspace",
      jsonOutput: "combined.json",
      markdownOutput: "combined.md",
      write: true,
    });

    expect(combinedOutputService.run).toHaveBeenCalledWith({
      format: "markdown",
      graphs: {
        nxProjects: { json: { projectNames: [] }, markdown: "```mermaid\n```" },
      },
      jsonOutputPath: "combined.json",
      markdownOutputPath: "combined.md",
      workingDirectory: "/workspace",
    });
  });

  it("never calls CombinedOutputService on a boundaries-only run, which built no export to combine", async () => {
    selectMode({ checksBoundaries: true, writes: false });

    await run({ check: "boundaries" });

    expect(combinedOutputService.run).not.toHaveBeenCalled();
  });

  describe("the boundary report", () => {
    const FAILING_OUTCOME: BoundaryCheckOutcome = {
      failures: [],
      violations: [VIOLATION],
    };

    /** Judges `b` and `a`, as a run narrowed to them would. */
    function judgeProjects(): GraphRunContext {
      const context = buildContextWithInclude(["**"]);
      const judged = {
        ...context,
        selectedProjects: ["b", "a"].map((name) => ({
          absoluteRoot: `/workspace/${name}`,
          name,
          tags: [],
        })),
      };

      vi.mocked(runContextService.build).mockResolvedValue(judged);

      return judged;
    }

    it("prints a boundaries-only run's findings when --format was given", async () => {
      judgeProjects();
      vi.mocked(combinedOutputService.resolveFormat).mockReturnValue({
        errors: [],
        format: "json",
      });
      selectMode({ checksBoundaries: true, writes: false });
      vi.mocked(boundaryCheckService.run).mockResolvedValue(FAILING_OUTCOME);

      await run({
        check: "boundaries",
        directory: "/workspace",
        format: "json",
      });

      expect(combinedOutputService.run).toHaveBeenCalledExactlyOnceWith({
        boundaries: { judgedProjects: ["b", "a"], outcome: FAILING_OUTCOME },
        format: "json",
        graphs: {},
        jsonOutputPath: undefined,
        markdownOutputPath: undefined,
        workingDirectory: "/workspace",
      });
    });

    it("still fails the run whose findings it printed", async () => {
      judgeProjects();
      selectMode({ checksBoundaries: true, writes: false });
      vi.mocked(boundaryCheckService.run).mockResolvedValue(FAILING_OUTCOME);

      await run({ check: "boundaries", format: "json" });

      expect(combinedOutputService.run).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(1);
    });

    it.each([
      ["--json-output", { jsonOutput: "boundaries.json" }],
      ["--markdown-output", { markdownOutput: "boundaries.md" }],
    ])(
      "prints a boundaries-only run's findings when %s was given",
      async (_flag, flag) => {
        judgeProjects();
        selectMode({ checksBoundaries: true, writes: false });

        await run({ check: "boundaries", ...flag });

        expect(combinedOutputService.run).toHaveBeenCalledTimes(1);
      },
    );

    it("carries the boundaries and the exports in one combined document", async () => {
      judgeProjects();
      selectMode({ checksBoundaries: true, writes: true });
      vi.mocked(boundaryCheckService.run).mockResolvedValue(FAILING_OUTCOME);
      vi.mocked(codependixService.run).mockResolvedValue(
        buildMapRun(
          { failures: [], results: [] },
          { nxProjects: { json: {}, markdown: "diagram" } },
        ),
      );

      await run({ check: "boundaries", format: "json", write: true });

      expect(combinedOutputService.run).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          boundaries: { judgedProjects: ["b", "a"], outcome: FAILING_OUTCOME },
          graphs: { nxProjects: { json: {}, markdown: "diagram" } },
        }),
      );
    });

    it("leaves the boundaries out of an export run that asked for no output", async () => {
      judgeProjects();
      selectMode({ checksBoundaries: true, writes: true });
      vi.mocked(codependixService.run).mockResolvedValue(
        buildMapRun(
          { failures: [], results: [] },
          { nxProjects: { json: {}, markdown: "diagram" } },
        ),
      );

      await run({ check: "boundaries", write: true });

      expect(combinedOutputService.run).toHaveBeenCalledExactlyOnceWith({
        format: "markdown",
        graphs: { nxProjects: { json: {}, markdown: "diagram" } },
        jsonOutputPath: undefined,
        markdownOutputPath: undefined,
        workingDirectory: "/workspace",
      });
    });

    it("prints nothing for a boundaries-only run that asked for no output", async () => {
      judgeProjects();
      selectMode({ checksBoundaries: true, writes: false });
      vi.mocked(boundaryCheckService.run).mockResolvedValue(FAILING_OUTCOME);

      await run({ check: "boundaries" });

      expect(combinedOutputService.run).not.toHaveBeenCalled();
    });
  });
});
