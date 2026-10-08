import { PythonService, TypescriptService } from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import {
  NeighborhoodService,
  WorkspaceGraphService,
} from "@codependix/nx-projects";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BoundariesService } from "../boundaries/boundaries.service";

import { BoundaryCheckService } from "./boundary-check.service";
import { BoundaryFailureService } from "./boundary-failure.service";
import { BoundaryGraphService } from "./boundary-graph.service";

import type {
  BoundaryGraph,
  BoundaryViolation,
} from "../boundaries/boundaries.types";
import type { BoundaryCheckContext } from "./boundary-check.types";
import type {
  CodependixBoundaryRule,
  CodependixGraphType,
  ResolvedCodependixBoundariesConfiguration,
} from "@codependix/configuration";

const RULE: CodependixBoundaryRule = {
  from: { id: ["a"] },
  kind: "forbid",
  name: "layers",
  to: { id: ["b"] },
};

const RULE_LIST: CodependixBoundaryRule[] = [RULE];

const VIOLATION: BoundaryViolation = {
  cycle: undefined,
  level: "nxProjects",
  message: "layers: a must not depend on b.",
  projects: ["a"],
  rule: "layers",
  scope: "workspace",
  source: "a",
  target: "b",
};

/** The one project every context in this suite knows about. */
const PROJECTS = [
  { absoluteRoot: "/workspace/packages/a", name: "a", tags: [] },
];

/** A dependency of `a`, built but never judged when only `a` is selected. */
const DEPENDENCY = {
  absoluteRoot: "/workspace/packages/b",
  name: "b",
  tags: [],
};

/** Boundaries overrides a test may pass, `fileImports` narrowed per language. */
type BoundariesOverrides = Omit<
  Partial<ResolvedCodependixBoundariesConfiguration>,
  "fileImports"
> & {
  fileImports?: Partial<
    ResolvedCodependixBoundariesConfiguration["fileImports"]
  >;
};

/** Builds a boundaries configuration, defaulting every level to empty. */
function buildBoundaries(
  overrides: BoundariesOverrides = {},
): ResolvedCodependixBoundariesConfiguration {
  const { fileImports, ...rest } = overrides;

  return {
    fileImports: { python: [], typescript: [], ...fileImports },
    nestjsModules: [],
    nxProjects: [],
    ...rest,
  };
}

describe(BoundaryCheckService, () => {
  let boundariesService: BoundariesService;
  let moduleGraphService: ModuleGraphService;
  let nestjsProjectService: NestjsProjectService;
  let pythonService: PythonService;
  let evaluatedGraphs: BoundaryGraph[];
  let evaluatedRules: (readonly CodependixBoundaryRule[])[];
  let reportedViolations: BoundaryViolation[];
  let service: BoundaryCheckService;
  let typescriptService: TypescriptService;
  let workspaceGraphService: WorkspaceGraphService;

  /** Builds a context whose configuration declares the given rules. */
  function buildContext(
    boundaries: BoundariesOverrides = {},
    enabledGraphTypes: ReadonlySet<CodependixGraphType> = new Set([
      "fileImports",
      "nestjsModules",
      "nxProjects",
    ]),
  ): BoundaryCheckContext {
    return {
      buildProjects: PROJECTS,
      configuration: {
        boundaries: buildBoundaries(boundaries),
        exclude: [],
        include: ["**"],
        projectGraph: undefined,
        selection: { dependencies: true, projects: [], tags: [] },
        workspace: {},
      },
      enabledGraphTypes,
      graph: { dependencies: {}, nodes: {} },
      projects: PROJECTS,
      selectedProjects: PROJECTS,
      workingDirectory: "/workspace",
    };
  }

  beforeAll(async () => {
    boundariesService = createMock<BoundariesService>();
    moduleGraphService = createMock<ModuleGraphService>();
    nestjsProjectService = createMock<NestjsProjectService>();
    pythonService = createMock<PythonService>();
    typescriptService = createMock<TypescriptService>();
    workspaceGraphService = createMock<WorkspaceGraphService>();

    const module = await Test.createTestingModule({
      providers: [
        BoundaryCheckService,
        BoundaryFailureService,
        BoundaryGraphService,
        NeighborhoodService,
        { provide: BoundariesService, useValue: boundariesService },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
        { provide: PythonService, useValue: pythonService },
        { provide: TypescriptService, useValue: typescriptService },
        { provide: WorkspaceGraphService, useValue: workspaceGraphService },
      ],
    }).compile();

    service = await module.resolve(BoundaryCheckService);
  });

  beforeEach(() => {
    evaluatedGraphs = [];
    evaluatedRules = [];
    reportedViolations = [];
    // Recorded through the implementation rather than read back off
    // `mock.calls`, so every assertion below stays typed as a `BoundaryGraph`
    // rather than as whatever a call-tuple index happens to hold.
    vi.mocked(boundariesService.evaluate).mockImplementation((args) => {
      evaluatedGraphs.push(args.graph);
      evaluatedRules.push(args.rules);

      return reportedViolations;
    });
    vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
      edges: [],
      projectNames: [],
    });
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([]);
    vi.mocked(pythonService.discoverProjects).mockReturnValue([]);
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([]);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // The judged projects' edges into their dependencies are part of what
  // they are, so the graph is drawn over the build set rather than the
  // judged set, which would drop every edge leaving it.
  it("builds the Nx graph over the build set, not only the judged projects", async () => {
    const context = buildContext({
      nxProjects: [{ kind: "acyclic", name: "no-cycles" }],
    });

    await service.run({
      ...context,
      buildProjects: [...PROJECTS, DEPENDENCY],
      projects: [...PROJECTS, DEPENDENCY],
      selectedProjects: PROJECTS,
    });

    expect(workspaceGraphService.buildWorkspaceGraph).toHaveBeenCalledWith(
      expect.anything(),
      [...PROJECTS, DEPENDENCY],
    );
  });

  it("builds no graph at all when no rule is declared", async () => {
    const outcome = await service.run(buildContext());

    expect(outcome).toStrictEqual({ failures: [], violations: [] });
    expect(workspaceGraphService.buildWorkspaceGraph).not.toHaveBeenCalled();
    expect(nestjsProjectService.discoverProjects).not.toHaveBeenCalled();
    expect(typescriptService.discoverProjects).not.toHaveBeenCalled();
    expect(pythonService.discoverProjects).not.toHaveBeenCalled();
  });

  it("judges the Nx level and reports what it found", async () => {
    reportedViolations.push(VIOLATION);

    const outcome = await service.run(buildContext({ nxProjects: RULE_LIST }));

    expect(outcome.violations).toStrictEqual([
      { ...VIOLATION, verdict: "fail" },
    ]);
    expect(evaluatedGraphs[0]?.level).toBe("nxProjects");
    expect(evaluatedGraphs[0]?.scope).toBe("workspace");
    expect(evaluatedRules[0]).toBe(RULE_LIST);
  });

  it("records a failed workspace graph against every judged project", async () => {
    vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockImplementation(
      () => {
        throw new Error("boom");
      },
    );

    const outcome = await service.run(buildContext({ nxProjects: RULE_LIST }));

    expect(outcome.failures).toStrictEqual([
      { error: "boom", level: "nxProjects", projects: ["a"], verdict: "fail" },
    ]);
  });

  it("judges every NestJS project's module graph", async () => {
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        rootModuleFile: "src/main.ts",
      },
    ]);
    vi.mocked(moduleGraphService.buildGraph).mockReturnValue({
      ambientModuleNames: [],
      edges: [],
      isolatedModuleNames: [],
      nodes: [{ declaringFile: "src/app.module.ts", name: "AppModule" }],
      projectName: "a",
    });

    await service.run(buildContext({ nestjsModules: RULE_LIST }));

    expect(evaluatedGraphs[0]?.level).toBe("nestjsModules");
    expect(evaluatedGraphs[0]?.scope).toBe("a");
  });

  it("records a container that would not boot and keeps going", async () => {
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        rootModuleFile: "src/main.ts",
      },
      {
        absoluteRoot: "/workspace/packages/b",
        name: "b",
        rootModuleFile: "src/main.ts",
      },
    ]);
    vi.mocked(nestjsProjectService.exploreProject).mockRejectedValueOnce(
      new Error("boom"),
    );
    vi.mocked(moduleGraphService.buildGraph).mockReturnValue({
      ambientModuleNames: [],
      edges: [],
      isolatedModuleNames: [],
      nodes: [],
      projectName: "b",
    });

    const outcome = await service.run(
      buildContext({ nestjsModules: RULE_LIST }),
    );

    expect(outcome.failures).toStrictEqual([
      {
        error: "boom",
        level: "nestjsModules",
        projects: ["a"],
        verdict: "fail",
      },
    ]);
    expect(evaluatedGraphs).toHaveLength(1);
  });

  it("records a non-Error rejection as its string form", async () => {
    // A rejection carrying a string rather than an `Error` is what a
    // third-party container can hand back, and the failure collector has to
    // name it rather than print "[object Object]".
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        rootModuleFile: "src/main.ts",
      },
    ]);
    vi.mocked(nestjsProjectService.exploreProject).mockRejectedValueOnce(
      "boom",
    );

    const outcome = await service.run(
      buildContext({ nestjsModules: RULE_LIST }),
    );

    expect(outcome.failures).toStrictEqual([
      {
        error: "boom",
        level: "nestjsModules",
        projects: ["a"],
        verdict: "fail",
      },
    ]);
  });

  it("judges every TypeScript project's file-level import graph", async () => {
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        tsconfigPath: "/workspace/packages/a/tsconfig.json",
      },
    ]);
    vi.mocked(typescriptService.buildGraph).mockReturnValue({
      edges: [],
      fileNames: ["src/index.ts"],
      isolatedFileNames: [],
      projectName: "a",
    });

    await service.run(buildContext({ fileImports: { typescript: RULE_LIST } }));

    expect(evaluatedGraphs[0]?.level).toBe("typescript");
    expect(evaluatedGraphs[0]?.scope).toBe("a");
  });

  it("records a TypeScript project whose program would not build", async () => {
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        tsconfigPath: "/workspace/packages/a/tsconfig.json",
      },
    ]);
    vi.mocked(typescriptService.buildProgram).mockImplementation(() => {
      throw new Error("boom");
    });

    const outcome = await service.run(
      buildContext({ fileImports: { typescript: RULE_LIST } }),
    );

    expect(outcome.failures).toStrictEqual([
      {
        error: "boom",
        level: "typescript",
        projects: ["a"],
        verdict: "fail",
      },
    ]);
  });

  it("judges every Python project's file-level import graph", async () => {
    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: "/workspace/applications/a", name: "a" },
    ]);
    vi.mocked(pythonService.buildGraph).mockReturnValue({
      edges: [],
      fileNames: ["main.py"],
      isolatedFileNames: ["main.py"],
      projectName: "a",
    });

    await service.run(buildContext({ fileImports: { python: RULE_LIST } }));

    expect(evaluatedGraphs[0]?.level).toBe("python");
    expect(evaluatedGraphs[0]?.scope).toBe("a");
  });

  it("records a Python project that could not be parsed", async () => {
    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: "/workspace/applications/a", name: "a" },
    ]);
    vi.mocked(pythonService.buildGraph).mockImplementation(() => {
      throw new Error("boom");
    });

    const outcome = await service.run(
      buildContext({ fileImports: { python: RULE_LIST } }),
    );

    expect(outcome.failures).toStrictEqual([
      {
        error: "boom",
        level: "python",
        projects: ["a"],
        verdict: "fail",
      },
    ]);
  });

  it("judges every level a rule was declared for, in one run", async () => {
    await service.run(
      buildContext({
        fileImports: { python: [RULE], typescript: [RULE] },
        nestjsModules: [RULE],
        nxProjects: [RULE],
      }),
    );

    expect(workspaceGraphService.buildWorkspaceGraph).toHaveBeenCalledTimes(1);
    expect(nestjsProjectService.discoverProjects).toHaveBeenCalledTimes(1);
    expect(typescriptService.discoverProjects).toHaveBeenCalledTimes(1);
    expect(pythonService.discoverProjects).toHaveBeenCalledTimes(1);
  });

  // boundaries.fileImports nests by language: a rule declared for one
  // language must not reach the other's builder at all.
  it("judges only the TypeScript level when fileImports declares no Python rules", async () => {
    await service.run(buildContext({ fileImports: { typescript: RULE_LIST } }));

    expect(typescriptService.discoverProjects).toHaveBeenCalledTimes(1);
    expect(pythonService.discoverProjects).not.toHaveBeenCalled();
  });

  it("judges only the Python level when fileImports declares no TypeScript rules", async () => {
    await service.run(buildContext({ fileImports: { python: RULE_LIST } }));

    expect(pythonService.discoverProjects).toHaveBeenCalledTimes(1);
    expect(typescriptService.discoverProjects).not.toHaveBeenCalled();
  });

  it("judges both fileImports languages independently in one run", async () => {
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        tsconfigPath: "/workspace/packages/a/tsconfig.json",
      },
    ]);
    // An earlier test permanently overrides `buildProgram` to throw; reset it
    // back to createMock's default rather than throwing here too.
    vi.mocked(typescriptService.buildProgram).mockReset();
    vi.mocked(typescriptService.buildGraph).mockReturnValue({
      edges: [],
      fileNames: ["src/index.ts"],
      isolatedFileNames: [],
      projectName: "a",
    });
    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: "/workspace/applications/a", name: "a" },
    ]);
    vi.mocked(pythonService.buildGraph).mockReturnValue({
      edges: [],
      fileNames: ["main.py"],
      isolatedFileNames: ["main.py"],
      projectName: "a",
    });

    await service.run(
      buildContext({
        fileImports: { python: RULE_LIST, typescript: RULE_LIST },
      }),
    );

    expect(evaluatedGraphs.map((graph) => graph.level)).toStrictEqual([
      "typescript",
      "python",
    ]);
  });

  // 🎛️ Graph-type toggles

  it("skips the nxProjects level when nxProjects is disabled, even with a declared rule", async () => {
    const outcome = await service.run(
      buildContext(
        { nxProjects: RULE_LIST },
        new Set(["fileImports", "nestjsModules"]),
      ),
    );

    expect(outcome).toStrictEqual({ failures: [], violations: [] });
    expect(evaluatedGraphs).toStrictEqual([]);
  });

  it("skips the nestjsModules level when nestjsModules is disabled", async () => {
    await service.run(
      buildContext(
        { nestjsModules: RULE_LIST },
        new Set(["fileImports", "nxProjects"]),
      ),
    );

    expect(nestjsProjectService.discoverProjects).not.toHaveBeenCalled();
    expect(evaluatedGraphs).toStrictEqual([]);
  });

  it("skips both fileImports levels when fileImports is disabled", async () => {
    await service.run(
      buildContext(
        { fileImports: { python: RULE_LIST, typescript: RULE_LIST } },
        new Set(["nestjsModules", "nxProjects"]),
      ),
    );

    expect(typescriptService.discoverProjects).not.toHaveBeenCalled();
    expect(pythonService.discoverProjects).not.toHaveBeenCalled();
    expect(evaluatedGraphs).toStrictEqual([]);
  });

  it("still judges every level enabled by default, with no toggle given", async () => {
    reportedViolations.push(VIOLATION);

    const outcome = await service.run(buildContext({ nxProjects: RULE_LIST }));

    expect(outcome.violations).toStrictEqual([
      { ...VIOLATION, verdict: "fail" },
    ]);
  });

  // ⚖️ Judging

  describe("judging", () => {
    /** A context judging `a` alone, built over `a` and its dependency `b`. */
    function buildNarrowedContext(
      boundaries: BoundariesOverrides,
    ): BoundaryCheckContext {
      return {
        ...buildContext(boundaries),
        buildProjects: [...PROJECTS, DEPENDENCY],
        graph: {
          dependencies: { a: [{ source: "a", target: "b", type: "static" }] },
          nodes: {
            a: { data: { root: "packages/a" }, name: "a", type: "lib" },
            b: { data: { root: "packages/b" }, name: "b", type: "lib" },
          },
        },
        projects: [...PROJECTS, DEPENDENCY],
        selectedProjects: PROJECTS,
      };
    }

    // D3: the judged project inherits the finding but cannot fix it, so it is
    // reported against the dependency it lives in without failing the run.
    it("notes a violation charged only to a dependency", async () => {
      reportedViolations.push({ ...VIOLATION, projects: ["b"] });

      const outcome = await service.run(
        buildNarrowedContext({ nxProjects: RULE_LIST }),
      );

      expect(outcome.violations.map((found) => found.verdict)).toStrictEqual([
        "note",
      ]);
    });

    // D5: a cycle through a judged project fails it, wherever else it runs.
    it("fails a violation charged to a judged project and a dependency alike", async () => {
      reportedViolations.push({ ...VIOLATION, projects: ["a", "b"] });

      const outcome = await service.run(
        buildNarrowedContext({ nxProjects: RULE_LIST }),
      );

      expect(outcome.violations.map((found) => found.verdict)).toStrictEqual([
        "fail",
      ]);
    });

    it("discovers every per-project level over the build set", async () => {
      await service.run(
        buildNarrowedContext({
          fileImports: { python: RULE_LIST, typescript: RULE_LIST },
          nestjsModules: RULE_LIST,
        }),
      );

      expect(nestjsProjectService.discoverProjects).toHaveBeenCalledWith([
        ...PROJECTS,
        DEPENDENCY,
      ]);
      expect(pythonService.discoverProjects).toHaveBeenCalledWith([
        ...PROJECTS,
        DEPENDENCY,
      ]);
      expect(typescriptService.discoverProjects).toHaveBeenCalledWith([
        ...PROJECTS,
        DEPENDENCY,
      ]);
    });

    it("notes a container failure in a dependency, charged to that dependency", async () => {
      vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
        { ...DEPENDENCY, rootModuleFile: "src/main.ts" },
      ]);
      vi.mocked(nestjsProjectService.exploreProject).mockRejectedValueOnce(
        new Error("boom"),
      );

      const outcome = await service.run(
        buildNarrowedContext({ nestjsModules: RULE_LIST }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: "boom",
          level: "nestjsModules",
          projects: ["b"],
          verdict: "note",
        },
      ]);
    });

    // D3: the judged container really cannot boot, so it fails — and the
    // failure names the dependency whose class it could not evaluate.
    it("fails a judged container, naming the dependency that broke it", async () => {
      const error = new ReferenceError(
        "Cannot access 'Word' before initialization",
      );

      error.stack = [
        "ReferenceError: Cannot access 'Word' before initialization",
        "    at file:///workspace/packages/b/src/word.entity.ts:12:3",
        "    at /workspace/packages/a/src/main.ts:1:1",
      ].join("\n");
      vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: "/workspace/packages/a",
          name: "a",
          rootModuleFile: "src/main.ts",
        },
      ]);
      vi.mocked(nestjsProjectService.exploreProject).mockRejectedValueOnce(
        error,
      );

      const outcome = await service.run(
        buildNarrowedContext({ nestjsModules: RULE_LIST }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: "Cannot access 'Word' before initialization",
          level: "nestjsModules",
          ownerProject: "b",
          projects: ["a"],
          verdict: "fail",
        },
      ]);
    });
  });
});
