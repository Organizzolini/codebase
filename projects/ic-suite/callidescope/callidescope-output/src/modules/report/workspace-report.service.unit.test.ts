import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildProjectLimitsLookup,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import {
  HEADROOM_BUCKET_AT_LIMIT,
  HEADROOM_BUCKET_FOUR_PLUS,
  HEADROOM_BUCKET_OVER_LIMIT,
  HEADROOM_BUCKET_UNMEASURED,
} from "./report.constants";
import { WorkspaceReportService } from "./workspace-report.service";

import type { ProjectReport } from "@callidescope/core";

/** A project report carrying only the numbers the index and scoreboard read. */
function report(args: {
  deepest?: number;
  name: string;
  widest?: number;
}): ProjectReport {
  const widest = args.widest ?? 0;

  return {
    callableBreadths:
      widest === 0
        ? []
        : [
            {
              breadth: widest,
              callees: [],
              displayName: `${args.name}.widest`,
              id: `${args.name}-widest`,
              location: buildSourceLocation(),
              signature: undefined,
            },
          ],
    projectName: args.name,
    stacks: [],
    summary: {
      callableCount: 1,
      cyclicComponentCount: 0,
      edgeCount: 0,
      entryPointCount: 0,
      fileCount: 1,
      maximumDepth: args.deepest ?? 0,
      projectCount: 1,
      unresolvedCallCount: 0,
    },
  };
}

describe(WorkspaceReportService, () => {
  let service: WorkspaceReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [WorkspaceReportService],
    }).compile();

    service = await module.resolve(WorkspaceReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📇 The project index

  it("says nothing rather than an empty table when no project was traced", () => {
    expect(
      service.renderProjectIndex({
        limits: buildProjectLimitsLookup(),
        projects: [],
      }),
    ).toBe("None.");
  });

  it("gives a project a row carrying what it measured and what it is held to", () => {
    const rendered = service.renderProjectIndex({
      limits: buildProjectLimitsLookup({ byProject: { "packages/thing": 10 } }),
      projects: [report({ deepest: 7, name: "packages/thing", widest: 4 })],
    });

    expect(rendered).toContain("| `packages/thing` | 7 | 10 | 3 | 4 |");
  });

  it("orders the tightest project first, whatever its name", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({
        byProject: { "packages/alpha": 20, "packages/omega": 8 },
      }),
      projects: [
        report({ deepest: 2, name: "packages/alpha" }),
        report({ deepest: 8, name: "packages/omega" }),
      ],
    });

    expect(rows.map((row) => row.projectName)).toStrictEqual([
      "packages/omega",
      "packages/alpha",
    ]);
  });

  it("breaks a headroom tie by project name, so the order is stable", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({ maximumDepth: 6 }),
      projects: [
        report({ deepest: 4, name: "packages/beta" }),
        report({ deepest: 4, name: "packages/alpha" }),
      ],
    });

    expect(rows.map((row) => row.projectName)).toStrictEqual([
      "packages/alpha",
      "packages/beta",
    ]);
  });

  it("labels the workspace root rather than printing an empty name", () => {
    const rendered = service.renderProjectIndex({
      limits: buildProjectLimitsLookup(),
      projects: [report({ deepest: 3, name: "" })],
    });

    expect(rendered).toContain("| `.` |");
  });

  // 📊 The headroom scoreboard

  it("prints every bucket, including the ones nothing fell into", () => {
    const rendered = service.renderHeadroom([]);

    expect(rendered).toContain(`| ${HEADROOM_BUCKET_OVER_LIMIT} | 0 |`);
    expect(rendered).toContain(`| ${HEADROOM_BUCKET_FOUR_PLUS} | 0 |`);
  });

  it("counts a project deeper than its own limit as over it", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({ byProject: { "packages/deep": 5 } }),
      projects: [report({ deepest: 9, name: "packages/deep" })],
    });

    expect(service.renderHeadroom(rows)).toContain(
      `| ${HEADROOM_BUCKET_OVER_LIMIT} | 1 |`,
    );
  });

  it("counts a project sitting exactly on its limit as at it", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({ byProject: { "packages/pinned": 6 } }),
      projects: [report({ deepest: 6, name: "packages/pinned" })],
    });

    expect(service.renderHeadroom(rows)).toContain(
      `| ${HEADROOM_BUCKET_AT_LIMIT} | 1 |`,
    );
  });

  it("counts a project one frame short of its limit in the single-frame bucket", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({ byProject: { "packages/near": 6 } }),
      projects: [report({ deepest: 5, name: "packages/near" })],
    });

    expect(service.renderHeadroom(rows)).toContain("| 1 | 1 |");
  });

  it("groups two and three frames of headroom together", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({ maximumDepth: 6 }),
      projects: [
        report({ deepest: 4, name: "packages/two" }),
        report({ deepest: 3, name: "packages/three" }),
      ],
    });

    expect(service.renderHeadroom(rows)).toContain("| 2–3 | 2 |");
  });

  it("separates a project that measured nothing from one with room to spare", () => {
    const rows = service.buildRows({
      limits: buildProjectLimitsLookup({ maximumDepth: 17 }),
      projects: [
        report({ deepest: 0, name: "packages/silent" }),
        report({ deepest: 2, name: "packages/roomy" }),
      ],
    });
    const rendered = service.renderHeadroom(rows);

    expect(rendered).toContain(`| ${HEADROOM_BUCKET_UNMEASURED} | 1 |`);
    expect(rendered).toContain(`| ${HEADROOM_BUCKET_FOUR_PLUS} | 1 |`);
  });

  // 🎚️ Limit resolution

  it("falls back to the workspace limits for a project that declared none", () => {
    const limits = buildProjectLimitsLookup({ maximumDepth: 17 });

    expect(
      service.limitsFor({ limits, projectName: "packages/unlisted" }),
    ).toBe(limits.workspace);
  });

  it("prefers a project's own limits over the workspace's", () => {
    const limits = buildProjectLimitsLookup({
      byProject: { "packages/own": 3 },
      maximumDepth: 17,
    });

    expect(
      service.limitsFor({ limits, projectName: "packages/own" }).maximumDepth,
    ).toBe(3);
  });
});
