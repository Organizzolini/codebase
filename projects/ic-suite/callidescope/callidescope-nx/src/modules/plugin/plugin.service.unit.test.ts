import { existsSync, readFileSync } from "node:fs";

import { CallidescopeService } from "@callidescope/cli";
import { ConfigurationService } from "@callidescope/configuration";
import { FileFilterService } from "@callidescope/graph";
import {
  MarkdownReportService,
  ProjectReportsService,
} from "@callidescope/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";
import { RunConfigurationService } from "../run-configuration/run-configuration.service";

import { EMPTY_TRACE_REPORT } from "./plugin.constants";
import { PluginService } from "./plugin.service";

import type { ResolvedTraceScope } from "./plugin.types";
import type { TraceOutcome } from "@callidescope/cli";
import type {
  ProjectLimits,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type {
  CallGraphResult,
  CallGraphSummary,
  DeepStackFinding,
  ProjectReport,
  WideCallableFinding,
} from "@callidescope/core";
import type { ProjectGraph } from "@nx/devkit";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<() => boolean>(() => true),
  readFileSync: vi.fn<() => string>(() => "{}"),
}));

/** The limits a stubbed run resolved, so a forwarded lookup can be pinned. */
const LIMITS: ProjectLimitsLookup = {
  byProject: new Map(),
  workspace: createMock<ProjectLimits>(),
};

/** The per-project reports a stubbed run produced, keyed by project. */
const REPORTS: ProjectReport[] = [
  createMock<ProjectReport>({ projectName: "packages/alpha" }),
  createMock<ProjectReport>({ projectName: "packages/beta" }),
];

/** A graph of two projects, one depending on the other. */
const GRAPH: ProjectGraph = {
  dependencies: {
    alpha: [{ source: "alpha", target: "beta", type: "static" }],
    beta: [],
  },
  nodes: {
    alpha: { data: { root: "packages/alpha" }, name: "alpha", type: "lib" },
    beta: { data: { root: "packages/beta" }, name: "beta", type: "lib" },
  },
};

describe(PluginService, () => {
  let callidescopeService: ReturnType<typeof createMock<CallidescopeService>>;
  let configurationService: ReturnType<typeof createMock<ConfigurationService>>;
  let fileFilterService: ReturnType<typeof createMock<FileFilterService>>;
  let markdownReportService: ReturnType<
    typeof createMock<MarkdownReportService>
  >;
  let projectReportsService: ReturnType<
    typeof createMock<ProjectReportsService>
  >;
  let projectsService: ProjectsService;
  let service: PluginService;

  beforeAll(async () => {
    callidescopeService = createMock<CallidescopeService>();
    configurationService = createMock<ConfigurationService>();
    fileFilterService = createMock<FileFilterService>();
    markdownReportService = createMock<MarkdownReportService>();
    projectReportsService = createMock<ProjectReportsService>();
    projectsService = new ProjectsService();

    const module = await Test.createTestingModule({
      providers: [
        PluginService,
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: ConfigurationService, useValue: configurationService },
        { provide: FileFilterService, useValue: fileFilterService },
        { provide: MarkdownReportService, useValue: markdownReportService },
        OptionsService,
        { provide: ProjectReportsService, useValue: projectReportsService },
        { provide: ProjectsService, useValue: projectsService },
        // The real one, over the mocked `ConfigurationService` beside it: what
        // configuration a run resolves is the thing several cases below pin,
        // and a stub of it would pin the stub instead.
        RunConfigurationService,
      ],
    }).compile();

    service = await module.resolve(PluginService);
  });

  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("{}");
    vi.spyOn(projectsService, "readProjectGraph").mockResolvedValue(GRAPH);
    configurationService.loadConfigurationFile.mockResolvedValue({
      authored: {},
      configuration: createMock<ResolvedCallidescopeConfiguration>({
        exclude: [],
        excludeFrom: [],
      }),
      path: undefined,
    });
    fileFilterService.buildFileFilter.mockReturnValue({
      isExcluded: (): boolean => false,
    });
  });

  /**
   * Stubs one trace outcome, typed rather than cast.
   *
   * `createMock` builds a value of the real type from the fields under test,
   * so nothing here needs an `as unknown as` — which would take these stubs
   * out of type coverage and stop the compiler noticing when the shapes they
   * stand in for change.
   *
   * The findings are answered twice: as the whole run's, and as what the
   * projects in scope own. A verdict reads only the second, so a test can set
   * them apart and pin which one decided it.
   *
   * Every judged project is answered as read, so a case that means to fail on
   * something else is not failed by the unread rule first.
   */
  function stubOutcome(args: {
    callableCount: number;
    deepStacks: DeepStackFinding[];
    wideCallables: WideCallableFinding[];
  }): void {
    projectReportsService.findUnreadProjects.mockReturnValue([]);
    callidescopeService.trace.mockResolvedValue(
      createMock<TraceOutcome>({
        projectLimits: LIMITS,
        result: createMock<CallGraphResult>({
          deepStacks: args.deepStacks,
          projects: REPORTS,
          summary: createMock<CallGraphSummary>({
            callableCount: args.callableCount,
          }),
          wideCallables: args.wideCallables,
        }),
      }),
    );
    projectReportsService.findOwnedFindings.mockReturnValue({
      deepStacks: args.deepStacks,
      wideCallables: args.wideCallables,
    });
  }

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("inferTargets", () => {
    /** The three targets every covered project carries, plus the gate. */
    const INPUTS = [
      "default",
      "^default",
      "{workspaceRoot}/callidescope.config.ts",
    ];

    it("infers all four targets onto a project holding a tsconfig", async () => {
      expect.hasAssertions();

      const inferred = await service.inferTargets({
        options: { traceTargetName: "callidescope-trace" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect([...inferred.keys()]).toStrictEqual(["packages/alpha"]);
      // The registration renamed one of them; the other three keep their
      // defaults, so a workspace only overrides what it needs to.
      expect(Object.keys(inferred.get("packages/alpha") ?? {})).toStrictEqual([
        "breadth",
        "depth",
        "callidescope-trace",
        "gate",
      ]);
    });

    it("names the gate target from the registration", async () => {
      expect.hasAssertions();

      const inferred = await service.inferTargets({
        options: { gateTargetName: "callidescope-gate" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(Object.keys(inferred.get("packages/alpha") ?? {})).toStrictEqual([
        "breadth",
        "depth",
        "trace",
        "callidescope-gate",
      ]);
    });

    it("points each target at its own executor, cached on the configuration", async () => {
      expect.hasAssertions();

      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(targets.get("packages/alpha")).toStrictEqual({
        breadth: {
          cache: true,
          executor: "@callidescope/nx:breadth",
          inputs: INPUTS,
          options: {},
        },
        depth: {
          cache: true,
          executor: "@callidescope/nx:depth",
          inputs: INPUTS,
          options: {},
        },
        gate: {
          cache: true,
          executor: "@callidescope/nx:gate",
          // The project's own limits join the workspace's, and they join as a
          // `{projectRoot}` glob: a workspace-wide one would invalidate every
          // project's gate whenever any project changed a limit.
          inputs: [...INPUTS, "{projectRoot}/callidescope.config.*"],
          options: {},
        },
        trace: {
          cache: true,
          executor: "@callidescope/nx:trace",
          inputs: INPUTS,
          options: {},
        },
      });
    });

    it("gates a project that configures nothing of its own", async () => {
      expect.hasAssertions();

      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/beta/project.json"],
        workspaceRoot: "/workspace",
      });

      // Nothing is read from beside the project to decide this: the input
      // glob matches no file, so the target is there and the limits it
      // enforces are the ones the workspace declared.
      expect(targets.get("packages/beta")?.["gate"]).toBeDefined();
    });

    it("gives a project the configuration excludes no gate target", async () => {
      expect.hasAssertions();

      // Its own code is never traced, so a gate there would judge the
      // project's dependencies and report green for code it never read.
      fileFilterService.buildFileFilter.mockReturnValue({
        isExcluded: (candidatePath: string): boolean =>
          candidatePath ===
          "packages/ic-suite/callidescope/callidescope-examples/tsconfig.json",
      });

      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: [
          "packages/ic-suite/callidescope/callidescope-examples/project.json",
          "packages/alpha/project.json",
        ],
        workspaceRoot: "/workspace",
      });

      expect(
        Object.keys(
          targets.get("packages/ic-suite/callidescope/callidescope-examples") ??
            {},
        ),
      ).toStrictEqual(["breadth", "depth", "trace"]);
      // The exclusion is one project's, never the run's.
      expect(targets.get("packages/alpha")?.["gate"]).toBeDefined();
    });

    it("excludes nothing when the configuration cannot be loaded", async () => {
      expect.hasAssertions();

      configurationService.loadConfigurationFile.mockRejectedValue(
        new Error("Cannot find module"),
      );

      // Inference runs while Nx builds the project graph, where a throw stops
      // every command in the workspace rather than one task.
      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(targets.get("packages/alpha")?.["gate"]).toBeDefined();
    });

    it("reads the workspace configuration once rather than once per project", async () => {
      expect.hasAssertions();

      await service.inferTargets({
        options: {},
        projectConfigurationFiles: [
          "packages/alpha/project.json",
          "packages/beta/project.json",
        ],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledTimes(
        1,
      );
    });

    it("skips the workspace-root project", async () => {
      expect.hasAssertions();

      // Its target would trace every other project under one uncacheable task.
      await expect(
        service
          .inferTargets({
            options: {},
            projectConfigurationFiles: ["project.json"],
            workspaceRoot: "/workspace",
          })
          .then((targets) => targets.size),
      ).resolves.toBe(0);
    });

    it("skips a project with no TypeScript program of its own", async () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(
        service
          .inferTargets({
            options: {},
            projectConfigurationFiles: ["applications/affirmancy/project.json"],
            workspaceRoot: "/workspace",
          })
          .then((targets) => targets.size),
      ).resolves.toBe(0);
    });

    it("ignores a matched file that is not a project description", async () => {
      expect.hasAssertions();

      // The glob also matches the callidescope configuration, so that editing
      // it re-runs inference — but it describes no project.
      await expect(
        service
          .inferTargets({
            options: {},
            projectConfigurationFiles: ["configuration/callidescope.config.ts"],
            workspaceRoot: "/workspace",
          })
          .then((targets) => targets.size),
      ).resolves.toBe(0);
    });
  });

  describe("describeRefusedScope", () => {
    /** A scope with nothing refused, overridden per case. */
    function buildScope(
      overrides: Partial<ResolvedTraceScope> = {},
    ): ResolvedTraceScope {
      return {
        directories: [],
        knownNames: ["alpha", "beta"],
        knownTags: ["type:package"],
        projectNames: [],
        selectedDirectories: [],
        unknownNames: [],
        unmatchedTags: [],
        ...overrides,
      };
    }

    it("names an unknown project beside the names the workspace has", () => {
      expect.hasAssertions();

      expect(
        service.describeRefusedScope(buildScope({ unknownNames: ["absent"] })),
      ).toBe("Unknown Nx projects: absent. Known: alpha, beta.");
    });

    it("names an unmatched tag beside the tags the workspace carries", () => {
      expect.hasAssertions();

      expect(
        service.describeRefusedScope(
          buildScope({ unmatchedTags: ["typ:package"] }),
        ),
      ).toBe("Unmatched Nx tags: typ:package. Known: type:package.");
    });

    it("names both kinds of mistake at once", () => {
      expect.hasAssertions();

      // Two typos is two things to fix, not two runs.
      expect(
        service.describeRefusedScope(
          buildScope({
            unknownNames: ["absent"],
            unmatchedTags: ["typ:package"],
          }),
        ),
      ).toBe(
        "Unknown Nx projects: absent. Known: alpha, beta. Unmatched Nx tags: typ:package. Known: type:package.",
      );
    });
  });

  describe("resolveTraceScope", () => {
    it("widens the selection along the Nx dependency graph", async () => {
      expect.hasAssertions();

      await expect(
        service.resolveTraceScope({
          projectNames: ["alpha"],
          tags: [],
          withDependencies: true,
        }),
      ).resolves.toMatchObject({
        directories: ["packages/alpha", "packages/beta"],
        projectNames: ["alpha", "beta"],
        // The widening reaches the trace and not the verdict: a dependency
        // pulled in here is measured by this run and judged by its own. The
        // roots rather than the Nx names, because a report's `projectName` is
        // the directory holding the project's `tsconfig.json`.
        selectedDirectories: ["packages/alpha"],
      });
    });

    it("leaves the selection alone when asked not to widen it", async () => {
      expect.hasAssertions();

      await expect(
        service.resolveTraceScope({
          projectNames: ["alpha"],
          tags: [],
          withDependencies: false,
        }),
      ).resolves.toMatchObject({
        directories: ["packages/alpha"],
        projectNames: ["alpha"],
      });
    });

    it("reports a name the workspace does not have", async () => {
      expect.hasAssertions();

      await expect(
        service.resolveTraceScope({
          projectNames: ["absent"],
          tags: ["absent:tag"],
          withDependencies: true,
        }),
      ).resolves.toMatchObject({
        knownNames: ["alpha", "beta"],
        unknownNames: ["absent"],
        unmatchedTags: ["absent:tag"],
      });
    });
  });

  describe("runTrace", () => {
    /** Stubs one trace and the configuration it was judged against. */
    function stubTrace(
      args: {
        callableCount?: number;
        deepStacks?: DeepStackFinding[];
        wideCallables?: WideCallableFinding[];
      } = {},
    ): void {
      configurationService.loadConfigurationFile.mockResolvedValue({
        authored: {},
        configuration: createMock<ResolvedCallidescopeConfiguration>(),
        path: undefined,
      });
      stubOutcome({
        callableCount: args.callableCount ?? 143,
        deepStacks: args.deepStacks ?? [],
        wideCallables: args.wideCallables ?? [],
      });
      markdownReportService.renderRun.mockReturnValue("# Report");
    }

    it("traces the directories it was given and renders the report", async () => {
      expect.hasAssertions();

      stubTrace();

      await expect(
        service.runTrace({
          directories: ["packages/alpha"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Report" });
      // `judgedProjectNames` is deliberately absent: it decides the verdict
      // and never narrows what gets traced.
      expect(callidescopeService.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          directories: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      );
      expect(callidescopeService.trace).not.toHaveBeenCalledWith(
        expect.objectContaining({ judgedProjectNames: ["packages/alpha"] }),
      );
    });

    it("resolves the configuration path from the registration when given none", async () => {
      expect.hasAssertions();

      stubTrace();

      await service.runTrace({
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "callidescope.config.ts",
        searchDirectory: "/workspace",
      });
    });

    it("falls back to a conventional path when nx.json cannot be read", async () => {
      expect.hasAssertions();

      stubTrace();
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      // An unreadable nx.json is what a workspace with no registration looks
      // like, so it resolves the same way rather than failing the task.
      await service.runTrace({
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "callidescope.config.ts",
        searchDirectory: "/workspace",
      });
    });

    it("prefers a configuration path it was handed", async () => {
      expect.hasAssertions();

      stubTrace();

      await service.runTrace({
        configurationPath: "elsewhere.ts",
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "elsewhere.ts",
        searchDirectory: "/workspace",
      });
    });

    it("draws the stacks rather than printing them for the mermaid format", async () => {
      expect.hasAssertions();

      stubTrace();

      await service.runTrace({
        directories: ["packages/alpha"],
        format: "mermaid",
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(markdownReportService.renderRun).toHaveBeenCalledWith(
        expect.objectContaining({ rendering: "diagram" }),
      );
    });

    it.each([
      [
        "a stack ran too deep",
        { deepStacks: [createMock<DeepStackFinding>()] },
      ],
      [
        "a callable called too much",
        { wideCallables: [createMock<WideCallableFinding>()] },
      ],
      ["it read no code at all", { callableCount: 0 }],
    ])("fails when %s", async (_description, findings) => {
      expect.hasAssertions();

      stubTrace(findings);

      await expect(
        service.runTrace({
          directories: ["packages/alpha"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: false });
    });

    it("passes a trace whose only breach belongs to a dependency", async () => {
      expect.hasAssertions();

      stubTrace({ deepStacks: [createMock<DeepStackFinding>()] });
      projectReportsService.findOwnedFindings.mockReturnValue({
        deepStacks: [],
        wideCallables: [],
      });

      // Narrowed by the same predicate the gate is, so the two targets on one
      // project cannot come to disagree about whose regression it was. The
      // report still shows the whole closure: only the verdict narrows.
      await expect(
        service.runTrace({
          directories: ["packages/alpha", "packages/beta"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Report" });
    });

    it("names a judged project none of whose own files were read without failing on it", async () => {
      expect.hasAssertions();

      stubTrace();
      projectReportsService.findUnreadProjects.mockReturnValue([
        "packages/alpha",
      ]);

      // The one rule the two targets act on differently. Every project the
      // workspace configuration excludes reads nothing of its own and is
      // denied a gate for that reason, so failing its trace as well would
      // leave the one target it has permanently red — a red task a reader
      // learns to ignore. It still prints, because a reader must be able to
      // see that the project read nothing.
      const result = await service.runTrace({
        directories: ["packages/alpha", "packages/beta"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(result.ok).toBe(true);
      expect(result.report).toContain("# Report");
      expect(result.report).toContain("Read nothing of its own");
      expect(result.report).toContain("packages/alpha");
    });

    it("still fails a trace whose judged project broke a limit while reading nothing", async () => {
      expect.hasAssertions();

      // The exemption is from the unread rule alone: a finding the judged
      // project owns fails the trace whether or not that project also went
      // unread, so the exemption cannot become a way to pass a real breach.
      stubTrace({ deepStacks: [createMock<DeepStackFinding>()] });
      projectReportsService.findUnreadProjects.mockReturnValue([
        "packages/alpha",
      ]);

      const result = await service.runTrace({
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(result.ok).toBe(false);
    });

    it("says under the report why a run that read nothing failed", async () => {
      expect.hasAssertions();

      stubTrace({ callableCount: 0 });

      // The report is kept and the reason appended: a summary table of zeroes
      // says what happened, never why it counted as a failure. Judged by the
      // gate's own predicate, so the two targets cannot come to disagree.
      await expect(
        service.runTrace({
          directories: ["packages/alpha"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toStrictEqual({
        ok: false,
        report: `# Report\n${EMPTY_TRACE_REPORT}`,
      });
    });
  });

  describe("runGate", () => {
    /** Stubs one gated trace, typed rather than cast. */
    function stubGate(
      args: {
        callableCount?: number;
        deepStacks?: DeepStackFinding[];
        wideCallables?: WideCallableFinding[];
      } = {},
    ): void {
      stubOutcome({
        callableCount: args.callableCount ?? 143,
        deepStacks: args.deepStacks ?? [],
        wideCallables: args.wideCallables ?? [],
      });
      markdownReportService.renderFindings.mockReturnValue("## Findings");
    }

    it("passes a workspace with nothing over a limit", async () => {
      expect.hasAssertions();

      stubGate();

      await expect(
        service.runGate({
          directories: ["packages/alpha"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: true });
    });

    it("fails on a stack that ran deeper than the project allows", async () => {
      expect.hasAssertions();

      stubGate({ deepStacks: [createMock<DeepStackFinding>()] });

      await expect(
        service.runGate({
          directories: ["packages/alpha"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: false });
    });

    it("fails on a callable wider than the limit its project declared", async () => {
      expect.hasAssertions();

      // Breadth needs no mode of its own: no limit resolves to `Infinity`, so
      // a project that declared none produces no finding to fail on, and a
      // gate can never be refused for wanting to check it.
      stubGate({ wideCallables: [createMock<WideCallableFinding>()] });

      await expect(
        service.runGate({
          directories: ["packages/alpha"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: false });
    });

    it("fails a gate whose run read no code at all", async () => {
      expect.hasAssertions();

      // An `exclude` that over-matches is what reaches this, and a project's
      // own configuration may write one — so a gate that passed here would go
      // permanently and silently green.
      stubGate({ callableCount: 0 });

      const result = await service.runGate({
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(result.ok).toBe(false);
      // The reason rather than the findings: there are none to show, and a
      // bare red task leaves a reader guessing.
      expect(result.report).toBe(EMPTY_TRACE_REPORT);
      expect(result.report).toContain("Traced nothing (0 callables)");
      expect(markdownReportService.renderFindings).not.toHaveBeenCalled();
    });

    it("fails a gate that opened none of its own project's files", async () => {
      expect.hasAssertions();

      // The whole run is not empty — a project with dependencies always has
      // theirs to show — so the run-wide rule above cannot reach this. What
      // went missing is the judged project's own files, which is what leaves
      // it owning no finding and passing green over code nothing read.
      stubGate();
      projectReportsService.findUnreadProjects.mockReturnValue([
        "packages/alpha",
      ]);

      const result = await service.runGate({
        directories: ["packages/alpha", "packages/beta"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(result.ok).toBe(false);
      expect(result.report).toContain("Read nothing of its own");
      // Named rather than counted: `--projects` may judge several, and a
      // reader needs to know which of them the run never opened.
      expect(result.report).toContain("packages/alpha");
      expect(markdownReportService.renderFindings).not.toHaveBeenCalled();
    });

    it("asks whether the projects it judges were read, not whether the run was", async () => {
      expect.hasAssertions();

      stubGate();

      await service.runGate({
        directories: ["packages/alpha", "packages/beta"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      // The selection and the run's own reports: a project's own `fileCount`
      // is the only thing that separates a clean project from an unread one,
      // and it lives on that project's report.
      expect(projectReportsService.findUnreadProjects).toHaveBeenCalledWith({
        projectNames: ["packages/alpha"],
        reports: REPORTS,
      });
    });

    it("reports only the findings, never the whole run", async () => {
      expect.hasAssertions();

      stubGate();

      const result = await service.runGate({
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      // Rendering is the output package's job, so what is pinned here is that
      // the gate asks it for the findings and never for the whole run.
      expect(result.report).toBe("## Findings");
      expect(markdownReportService.renderFindings).toHaveBeenCalledTimes(1);
      expect(markdownReportService.renderRun).not.toHaveBeenCalled();
    });

    it("passes on a breach in a dependency it only measured", async () => {
      expect.hasAssertions();

      stubGate({ deepStacks: [createMock<DeepStackFinding>()] });
      // The run found a deep stack and no project this gate covers owns it.
      // Failing here would name `alpha` for a regression in `beta`, which is
      // the one thing a per-project gate exists to stop.
      projectReportsService.findOwnedFindings.mockReturnValue({
        deepStacks: [],
        wideCallables: [],
      });

      await expect(
        service.runGate({
          directories: ["packages/alpha", "packages/beta"],
          judgedProjectNames: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: true });
    });

    it("judges the projects it was scoped to, by the limits they resolved", async () => {
      expect.hasAssertions();

      stubGate();

      await service.runGate({
        directories: ["packages/alpha", "packages/beta"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      // The selection rather than the closure, and the run's own resolved
      // limits rather than the configuration's — a project's declared limit
      // reaches a verdict only through this lookup.
      expect(projectReportsService.findOwnedFindings).toHaveBeenCalledWith({
        limits: LIMITS,
        projectNames: ["packages/alpha"],
        reports: REPORTS,
      });
    });

    it("renders the findings it judged rather than the run's", async () => {
      expect.hasAssertions();

      stubGate({ deepStacks: [createMock<DeepStackFinding>()] });
      projectReportsService.findOwnedFindings.mockReturnValue({
        deepStacks: [],
        wideCallables: [],
      });

      await service.runGate({
        directories: ["packages/alpha", "packages/beta"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      // A gate that printed a finding it passed on would read as broken.
      expect(markdownReportService.renderFindings).toHaveBeenCalledWith(
        expect.objectContaining({ deepStacks: [], wideCallables: [] }),
      );
    });

    it("prefers a configuration path it was handed", async () => {
      expect.hasAssertions();

      stubGate();

      await service.runGate({
        configurationPath: "elsewhere.ts",
        directories: ["packages/alpha"],
        judgedProjectNames: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "elsewhere.ts",
        searchDirectory: "/workspace",
      });
    });
  });
});
