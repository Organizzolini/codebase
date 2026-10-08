import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ProjectReportsService } from "./project-reports.service";

import type { BuildProjectReportsArguments } from "./project-reports.types";
import type {
  ProjectLimits,
  ProjectLimitsLookup,
} from "@callidescope/configuration";
import type { CallableId, ProjectReport } from "@callidescope/core";
import type { DiscoveredCallable } from "@callidescope/graph";

/**
 * A two-project graph: `alpha` holds a chain of `depth` callables, `beta` one.
 *
 * The chain is what makes the stacks meaningful — a project whose callables
 * call nothing produces no stack at all, which is itself under test below.
 */
function buildArguments(depth: number): BuildProjectReportsArguments {
  const chain = Array.from({ length: depth }, (_, index) =>
    callable({ name: `alpha${String(index)}`, projectName: "alpha" }),
  );
  const [betaId, betaCallable] = callable({
    name: "beta0",
    projectName: "beta",
  });
  const chainIds = chain.map(([callableId]) => callableId);

  return {
    breadthMeasurement: { byCallable: new Map() },
    callablesById: new Map([...chain, [betaId, betaCallable]]),
    condensed: {
      componentIdByCallable: new Map(
        [...chainIds, betaId].map((callableId, index) => [callableId, index]),
      ),
      memberIdsByComponent: [...chainIds, betaId].map((callableId) => [
        callableId,
      ]),
      successorsByComponent: [
        ...chainIds.map((_, index) =>
          index === chainIds.length - 1
            ? new Set<number>()
            : new Set([index + 1]),
        ),
        new Set<number>(),
      ],
    },
    entryPoints: {
      entryPoints: [
        { callableId: chainIds[0] ?? "", kind: "decorated-method" },
        { callableId: betaId, kind: "exported-function" },
      ],
      unresolvedAddresses: [],
    },
    fileCountByProject: new Map([
      ["alpha", depth],
      ["beta", 1],
    ]),
    graph: {
      calleeIdsByCaller: new Map(),
      callerIdsByCallee: new Map(),
      edges: [],
      unresolvedCallerIds: new Set(),
      unresolvedCalls: [],
    },
    measurement: {
      byComponent: [
        ...chainIds.map((_, index) => ({
          deepestSuccessor:
            index === chainIds.length - 1 ? undefined : index + 1,
          depth: depth - index,
          moduleIds: new Set<string>(),
          reachesUnresolved: false,
        })),
        {
          deepestSuccessor: undefined,
          depth: 1,
          reachesUnresolved: false,
        },
      ],
    },
    projectNames: ["alpha", "beta"],
  };
}

/** One project's limits, carrying whichever provenance the case needs. */
function buildLimits(args: {
  breadth?: number | undefined;
  depth?: number | undefined;
  path?: string | undefined;
}): ProjectLimits {
  return {
    maximumBreadth: args.breadth,
    maximumDepth: args.depth ?? Infinity,
    path: args.path ?? "callidescope.config.ts",
  };
}

/** A lookup with a workspace default and whatever a project overrode. */
function buildLookup(args: {
  byProject?: Record<string, ProjectLimits> | undefined;
  workspace: ProjectLimits;
}): ProjectLimitsLookup {
  return {
    byProject: new Map(Object.entries(args.byProject ?? {})),
    workspace: args.workspace,
  };
}

/** A callable in a named project, at a file path derived from its name. */
function callable(args: {
  name: string;
  projectName: string;
}): [CallableId, DiscoveredCallable] {
  const location = buildSourceLocation({
    filePath: `packages/${args.projectName}/src/${args.name}.ts`,
  });

  return [
    `${location.filePath}#0`,
    buildDiscoveredCallable({
      displayName: args.name,
      id: `${location.filePath}#0`,
      location,
      projectName: args.projectName,
    }),
  ];
}

describe(ProjectReportsService, () => {
  let service: ProjectReportsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ProjectReportsService],
    }).compile();

    service = await module.resolve(ProjectReportsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports one project per traced project, in the order they were traced", () => {
    expect(
      service.build(buildArguments(3)).map((report) => report.projectName),
    ).toStrictEqual(["alpha", "beta"]);
  });

  it("puts a stack in the project its entry point belongs to", () => {
    const [alpha] = service.build(buildArguments(3));

    expect(alpha?.stacks).toHaveLength(1);
    expect(alpha?.stacks[0]?.frames[0]?.displayName).toBe("alpha0");
  });

  it("drops an entry point that calls nothing, which is not a stack", () => {
    const beta = service.build(buildArguments(3))[1];

    expect(beta?.stacks).toStrictEqual([]);
  });

  it("counts only the callables a project owns", () => {
    const [alpha, beta] = service.build(buildArguments(3));

    expect(alpha?.summary.callableCount).toBe(3);
    expect(beta?.summary.callableCount).toBe(1);
  });

  it("reports the project's own file count rather than the run's", () => {
    expect(service.build(buildArguments(3))[0]?.summary.fileCount).toBe(3);
  });

  // 📏 The depth gate

  it("fails only on the stacks past the limit", () => {
    const reports = service.build(buildArguments(3));

    expect(
      service.findDeepStacks({
        limits: buildLookup({ workspace: buildLimits({ depth: 2 }) }),
        reports,
      }),
    ).toHaveLength(1);
    expect(
      service.findDeepStacks({
        limits: buildLookup({ workspace: buildLimits({ depth: 3 }) }),
        reports,
      }),
    ).toStrictEqual([]);
  });

  it("stamps each finding with the limit it broke", () => {
    const reports = service.build(buildArguments(3));

    expect(
      service.findDeepStacks({
        limits: buildLookup({ workspace: buildLimits({ depth: 1 }) }),
        reports,
      })[0]?.limit,
    ).toBe(1);
  });

  it("reports the deepest stack first", () => {
    const reports: ProjectReport[] = service.build(buildArguments(4));
    const shallow = service.build(buildArguments(2));

    const findings = service.findDeepStacks({
      limits: buildLookup({ workspace: buildLimits({ depth: 1 }) }),
      reports: [...reports, ...shallow],
    });

    expect(findings.map((finding) => finding.depth)).toStrictEqual([4, 2]);
  });

  // 🏘 Every project judged against its own limits

  it("judges a stack against the limit of the project that roots it", () => {
    const reports = service.build(buildArguments(3));

    const findings = service.findDeepStacks({
      limits: buildLookup({
        byProject: { alpha: buildLimits({ depth: 2 }) },
        workspace: buildLimits({ depth: 9 }),
      }),
      reports,
    });

    expect(findings.map((finding) => finding.limit)).toStrictEqual([2]);
  });

  it("leaves a stack alone when only another project's limit would fail it", () => {
    const reports = service.build(buildArguments(3));

    expect(
      service.findDeepStacks({
        limits: buildLookup({
          byProject: {
            alpha: buildLimits({ depth: 3 }),
            beta: buildLimits({ depth: 1 }),
          },
          workspace: buildLimits({ depth: 3 }),
        }),
        reports,
      }),
    ).toStrictEqual([]);
  });

  it("judges a project declaring no limit against the workspace's", () => {
    const reports = service.build(buildArguments(3));

    const findings = service.findDeepStacks({
      limits: buildLookup({
        byProject: { alpha: buildLimits({ depth: 2 }) },
        workspace: buildLimits({ depth: 2 }),
      }),
      reports,
    });

    expect(findings.map((finding) => finding.limit)).toStrictEqual([2]);
  });

  it("does not clamp a project declaring a limit higher than the workspace's", () => {
    const reports = service.build(buildArguments(3));

    expect(
      service.findDeepStacks({
        limits: buildLookup({
          byProject: { alpha: buildLimits({ depth: 8 }) },
          workspace: buildLimits({ depth: 1 }),
        }),
        reports,
      }),
    ).toStrictEqual([]);
  });

  it("judges a project the lookup never named against the workspace's limit", () => {
    const reports = service.build(buildArguments(3));

    const findings = service.findDeepStacks({
      limits: buildLookup({ workspace: buildLimits({ depth: 2 }) }),
      reports,
    });

    expect(findings.map((finding) => finding.limit)).toStrictEqual([2]);
  });

  // 🌐 The breadth gate

  it("builds a callable's breadth report from its direct callees", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id, alpha2Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [
            alpha0Id ?? "",
            { breadth: 2, calleeIds: [alpha1Id ?? "", alpha2Id ?? ""] },
          ],
        ]),
      },
    });

    const [breadthReport] = reports[0]?.callableBreadths ?? [];

    expect(breadthReport).toStrictEqual({
      breadth: 2,
      callees: [
        { displayName: "alpha1", id: alpha1Id },
        { displayName: "alpha2", id: alpha2Id },
      ],
      displayName: "alpha0",
      id: alpha0Id,
      location: buildSourceLocation({
        filePath: "packages/alpha/src/alpha0.ts",
      }),
      signature: breadthReport?.signature,
    });
  });

  it("reads a breadth report's signature the same way a stack frame does", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
        ]),
      },
    });

    expect(reports[0]?.callableBreadths[0]?.signature).toBeDefined();
  });

  it("omits a callable with no direct callees from its breadth report", () => {
    const reports = service.build(buildArguments(3));

    expect(reports[1]?.callableBreadths).toStrictEqual([]);
  });

  it("skips a callee the run never collected", () => {
    const base = buildArguments(3);
    const [alpha0Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: ["nowhere.ts#0"] }],
        ]),
      },
    });

    expect(reports[0]?.callableBreadths[0]?.callees).toStrictEqual([]);
  });

  it("fails only on the callables past the breadth limit", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id, alpha2Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [
            alpha0Id ?? "",
            { breadth: 2, calleeIds: [alpha1Id ?? "", alpha2Id ?? ""] },
          ],
        ]),
      },
    });

    expect(
      service.findWideCallables({
        limits: buildLookup({ workspace: buildLimits({ breadth: 1 }) }),
        reports,
      }),
    ).toHaveLength(1);
    expect(
      service.findWideCallables({
        limits: buildLookup({ workspace: buildLimits({ breadth: 2 }) }),
        reports,
      }),
    ).toStrictEqual([]);
  });

  it("reports nothing when no configuration declared a breadth limit", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
        ]),
      },
    });

    expect(
      service.findWideCallables({
        limits: buildLookup({ workspace: buildLimits({}) }),
        reports,
      }),
    ).toStrictEqual([]);
  });

  it("judges a callable against the limit of the project declaring it", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
        ]),
      },
    });

    const findings = service.findWideCallables({
      limits: buildLookup({
        byProject: { alpha: buildLimits({ breadth: 0 }) },
        workspace: buildLimits({ breadth: 9 }),
      }),
      reports,
    });

    expect(findings.map((finding) => finding.limit)).toStrictEqual([0]);
  });

  it("stamps each wide-callable finding with the limit it broke", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
        ]),
      },
    });

    expect(
      service.findWideCallables({
        limits: buildLookup({ workspace: buildLimits({ breadth: 0 }) }),
        reports,
      })[0]?.limit,
    ).toBe(0);
  });

  it("reports the widest callable first", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id, alpha2Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
          [
            alpha1Id ?? "",
            { breadth: 2, calleeIds: [alpha0Id ?? "", alpha2Id ?? ""] },
          ],
        ]),
      },
    });

    const findings = service.findWideCallables({
      limits: buildLookup({ workspace: buildLimits({ breadth: 0 }) }),
      reports,
    });

    expect(findings.map((finding) => finding.breadth)).toStrictEqual([2, 1]);
  });

  // 🎯 Only the projects a verdict covers

  it("returns the findings the named projects own", () => {
    const findings = service.findOwnedFindings({
      limits: buildLookup({ workspace: buildLimits({ depth: 1 }) }),
      projectNames: ["alpha"],
      reports: service.build(buildArguments(3)),
    });

    expect(findings.deepStacks).toHaveLength(1);
    expect(findings.wideCallables).toStrictEqual([]);
  });

  it("drops a finding a project outside the named set owns", () => {
    // The same stacks, the same limit, and a different set of projects
    // entitled to fail on them — which is the whole of the narrowing.
    expect(
      service.findOwnedFindings({
        limits: buildLookup({ workspace: buildLimits({ depth: 1 }) }),
        projectNames: ["beta"],
        reports: service.build(buildArguments(3)),
      }).deepStacks,
    ).toStrictEqual([]);
  });

  it("narrows a breadth finding to the project declaring the callable", () => {
    const base = buildArguments(3);
    const callableIds = [...base.callablesById.keys()];
    const alpha0Id = callableIds[0] ?? "";
    const betaId = callableIds.at(-1) ?? "";
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id, { breadth: 1, calleeIds: [betaId] }],
          [betaId, { breadth: 1, calleeIds: [alpha0Id] }],
        ]),
      },
    });
    const limits = buildLookup({ workspace: buildLimits({ breadth: 0 }) });

    expect(
      service
        .findOwnedFindings({ limits, projectNames: ["beta"], reports })
        .wideCallables.map((finding) => finding.displayName),
    ).toStrictEqual(["beta0"]);
  });

  it("contributes nothing for a named project holding no report", () => {
    expect(
      service.findOwnedFindings({
        limits: buildLookup({ workspace: buildLimits({ depth: 1 }) }),
        projectNames: ["gamma"],
        reports: service.build(buildArguments(3)),
      }),
    ).toStrictEqual({ deepStacks: [], wideCallables: [] });
  });

  // 🙈 Projects the run never read

  it("reports nothing unread when a file of every named project was read", () => {
    expect(
      service.findUnreadProjects({
        projectNames: ["alpha", "beta"],
        reports: service.build(buildArguments(3)),
      }),
    ).toStrictEqual([]);
  });

  it("names a project whose own files were all filtered out", () => {
    // Owning no finding and being clean look identical from the outside: the
    // project's own `fileCount` is what tells them apart, and the rest of the
    // run stays fully measured either way.
    const base = buildArguments(3);

    expect(
      service.findUnreadProjects({
        projectNames: ["alpha", "beta"],
        reports: service.build({
          ...base,
          fileCountByProject: new Map([["beta", 1]]),
        }),
      }),
    ).toStrictEqual(["alpha"]);
  });

  it("counts a project holding files that declare no callable as read", () => {
    // The shape five projects in this repository have: a `tsconfig.json`
    // naming only their own configuration files and their tests. Those files
    // were read, so a verdict on them is a verdict on something — asking for a
    // callable would fail every one of them for holding no functions.
    const base = buildArguments(3);

    expect(
      service.findUnreadProjects({
        projectNames: ["alpha"],
        reports: service.build({
          ...base,
          callablesById: new Map(
            [...base.callablesById].filter(
              ([, discovered]) => discovered.node.projectName !== "alpha",
            ),
          ),
        }),
      }),
    ).toStrictEqual([]);
  });

  it("names a project the run holds no report for at all", () => {
    // What a project the workspace configuration excludes looks like: never
    // discovered, so never reported, so never judged unless this says so.
    expect(
      service.findUnreadProjects({
        projectNames: ["gamma"],
        reports: service.build(buildArguments(3)),
      }),
    ).toStrictEqual(["gamma"]);
  });

  // 🕳 Gaps in what the graph knows

  it("skips an entry point whose callable was never collected", () => {
    const base = buildArguments(3);
    const reports = service.build({
      ...base,
      entryPoints: {
        entryPoints: [
          ...base.entryPoints.entryPoints,
          { callableId: "nowhere.ts#0", kind: "orphan-root" },
        ],
        unresolvedAddresses: [],
      },
    });

    expect(reports[0]?.stacks).toHaveLength(1);
  });

  it("skips a callable no component was measured for", () => {
    const base = buildArguments(3);
    const reports = service.build({
      ...base,
      condensed: { ...base.condensed, componentIdByCallable: new Map() },
    });

    expect(reports[0]?.stacks).toStrictEqual([]);
  });

  it("skips a component the depth pass never measured", () => {
    const base = buildArguments(3);
    const reports = service.build({
      ...base,
      measurement: { byComponent: [] },
    });

    expect(reports[0]?.stacks).toStrictEqual([]);
  });

  it("reports no files rather than failing when a project traced none", () => {
    const base = buildArguments(3);

    expect(
      service.build({ ...base, fileCountByProject: new Map() })[0]?.summary
        .fileCount,
    ).toBe(0);
  });
});
