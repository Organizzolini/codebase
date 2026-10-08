import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildEmptyCallGraphResult,
  buildProjectLimitsLookup,
  buildSourceLocation,
  buildStackFrame,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { MarkdownReportService } from "./markdown-report.service";
import {
  MARKDOWN_DEEP_STACKS_HEADING,
  MARKDOWN_PROJECT_LIMITS_HEADING,
  MARKDOWN_PROJECT_LIMITS_SUMMARY,
  MARKDOWN_WIDE_CALLABLES_HEADING,
  NO_LIMIT_LABEL,
} from "./report.constants";

import type {
  ProjectLimits,
  ProjectLimitsLookup,
} from "@callidescope/configuration";
import type {
  CallableBreadthReport,
  CallStack,
  ProjectReport,
} from "@callidescope/core";

/** A callable with the given breadth and no callees, named uniquely. */
function callableBreadth(args: {
  breadth?: number;
  name: string;
}): CallableBreadthReport {
  return {
    breadth: args.breadth ?? 1,
    callees: [],
    displayName: args.name,
    id: args.name,
    location: buildSourceLocation({ filePath: `${args.name}.ts` }),
    signature: undefined,
  };
}

/** A lookup whose only project is the one `report` names, holding `limits`. */
function limitsLookup(limits: ProjectLimits): ProjectLimitsLookup {
  return {
    byProject: new Map([["example", limits]]),
    workspace: limits,
  };
}

/** A project report carrying the given stacks and nothing else. */
function report(stacks: CallStack[]): ProjectReport {
  return {
    callableBreadths: [],
    projectName: "example",
    stacks,
    summary: {
      callableCount: 4,
      cyclicComponentCount: 0,
      edgeCount: 3,
      entryPointCount: stacks.length,
      fileCount: 2,
      maximumDepth: 2,
      projectCount: 1,
      unresolvedCallCount: 0,
    },
  };
}

/** A stack of `depth` frames rooted at a named entry point. */
function stack(args: { depth?: number; entry: string }): CallStack {
  const depth = args.depth ?? 2;

  return {
    depth,
    entryPointKind: "decorated-method",
    frames: Array.from({ length: depth }, (_, index) =>
      buildStackFrame({
        displayName: index === 0 ? args.entry : `Frame${String(index)}`,
        location: buildSourceLocation({ filePath: `${args.entry}.ts` }),
      }),
    ),
    isLowerBound: false,
  };
}

describe(MarkdownReportService, () => {
  let service: MarkdownReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [MarkdownReportService],
    }).compile();

    service = await module.resolve(MarkdownReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📚 Stacks

  it("numbers each stack and labels it with its entry point and depth", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [stack({ entry: "Resolver.read" })],
    });

    expect(rendered).toContain("**1. `Resolver.read`** — depth 2");
    expect(rendered).toContain("decorated-method");
  });

  it("labels a stack with no frames as unknown", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [{ ...stack({ entry: "Resolver.read" }), frames: [] }],
    });

    expect(rendered).toContain("**1. `unknown`**");
  });

  it("draws a mermaid diagram instead of a tree when asked to", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "diagram",
      report: report([stack({ entry: "Resolver.read" })]),
    });

    expect(rendered).toContain("flowchart LR");
  });

  it("marks an under-reported depth rather than stating it as fact", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [{ ...stack({ entry: "Resolver.read" }), isLowerBound: true }],
    });

    expect(rendered).toContain("depth ≥ 2");
  });

  it("puts each stack tree in a fence so indentation survives", () => {
    expect(
      service.renderStacks({
        previewCount: 3,
        stacks: [stack({ entry: "Resolver.read" })],
      }),
    ).toContain("```text");
  });

  it("says plainly when there is nothing to show", () => {
    expect(service.renderStacks({ previewCount: 3, stacks: [] })).toBe("None.");
  });

  // 🪗 The disclosure

  it("shows every stack openly while they fit in the preview", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [stack({ entry: "First" }), stack({ entry: "Second" })],
    });

    expect(rendered).not.toContain("<details>");
    expect(rendered).toContain("Second");
  });

  it("hides the stacks past the preview behind a disclosure", () => {
    const rendered = service.renderStacks({
      previewCount: 1,
      stacks: [
        stack({ entry: "First" }),
        stack({ entry: "Second" }),
        stack({ entry: "Third" }),
      ],
    });

    expect(rendered).toContain("<summary>2 more call stacks</summary>");
    expect(rendered).toContain("</details>");
  });

  it("still publishes the hidden stacks in full", () => {
    const rendered = service.renderStacks({
      previewCount: 1,
      stacks: [stack({ entry: "First" }), stack({ entry: "Second" })],
    });

    expect(rendered).toContain("**2. `Second`**");
  });

  // 📄 Sections and runs

  it("opens a project section with the configured heading", () => {
    expect(
      service.renderProjectSection({
        heading: "## 🔭 Callidescope",
        limits: buildProjectLimitsLookup(),
        previewCount: 3,
        rendering: "tree",
        report: report([stack({ entry: "Resolver.read" })]),
      }),
    ).toContain("## 🔭 Callidescope");
  });

  it("names the project a section describes", () => {
    expect(
      service.renderProjectSection({
        heading: "## 🔭 Callidescope",
        limits: buildProjectLimitsLookup(),
        previewCount: 3,
        rendering: "tree",
        report: report([]),
      }),
    ).toContain("`example`");
  });

  it("reports a project's counts and breadth", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      report: report([]),
    });

    expect(rendered).toContain("| Callables | 4 |");
    expect(rendered).toContain("### Breadth");
    expect(rendered).not.toContain("### Module spread");
    expect(rendered).not.toContain("### Possibly misplaced");
  });

  it("names the call-stacks section as depth, distinct from breadth", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      report: report([]),
    });

    expect(rendered).toContain("### Call stacks (depth)");
  });

  it("heads a whole run and counts the stacks over the depth limit", () => {
    const rendered = service.renderRun({
      description: undefined,
      heading: "# 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      result: buildEmptyCallGraphResult({
        deepStacks: [{ ...stack({ entry: "Resolver.read" }), limit: 1 }],
      }),
    });

    expect(rendered).toContain("# 🔭 Callidescope");
    expect(rendered).toContain("## Call stacks over the depth limit (1)");
  });

  it("heads a run's wide-callable section with its count", () => {
    const rendered = service.renderRun({
      description: undefined,
      heading: "# 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      result: buildEmptyCallGraphResult({
        wideCallables: [
          {
            breadth: 5,
            callees: [],
            displayName: "Orchestrator.run",
            id: "orchestrator",
            limit: 3,
            location: buildSourceLocation(),
            signature: undefined,
          },
        ],
      }),
    });

    expect(rendered).toContain("## Callables over the breadth limit (1)");
  });

  it("places a destination's description under the heading", () => {
    const rendered = service.renderRun({
      description: "Traced on every release.",
      heading: "# 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      result: buildEmptyCallGraphResult(),
    });

    expect(rendered).toContain("# 🔭 Callidescope\n\nTraced on every release.");
  });

  it("writes its subsections one level below the heading it was given", () => {
    const rendered = service.renderRun({
      description: undefined,
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      result: buildEmptyCallGraphResult(),
    });

    expect(rendered).toContain("\n### Projects\n");
    expect(rendered).not.toContain("\n## Projects\n");
  });

  it("falls back to second-level subsections for a heading with no hashes", () => {
    const rendered = service.renderRun({
      description: undefined,
      heading: "**Callidescope**",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      result: buildEmptyCallGraphResult(),
    });

    expect(rendered).toContain("\n## Projects\n");
  });

  it("renders a run that found nothing without failing", () => {
    expect(
      service.renderRun({
        description: undefined,
        heading: "# 🔭 Callidescope",
        limits: buildProjectLimitsLookup(),
        previewCount: 3,
        rendering: "tree",
        result: buildEmptyCallGraphResult(),
      }),
    ).toContain("None.");
  });

  // 🚦 Gate findings

  it("renders the two findings a gate weighs and nothing else", () => {
    const rendered = service.renderFindings({
      deepStacks: [],
      previewCount: 3,
      wideCallables: [],
    });

    expect(rendered).toBe(
      [
        "## Call stacks over the depth limit (0)",
        "",
        "None.",
        "",
        "## Callables over the breadth limit (0)",
        "",
        "None.",
      ].join("\n"),
    );
  });

  it("heads a gate's sections with the same headings a whole run uses", () => {
    const deepStacks = [{ ...stack({ entry: "Resolver.read" }), limit: 1 }];
    const run = service.renderRun({
      description: undefined,
      heading: "# 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      result: buildEmptyCallGraphResult({ deepStacks }),
    });

    // The headings live in one constant each, so a reader grepping a failed
    // pipeline for a run's heading finds a gate's, and vice versa.
    expect(run).toContain(`## ${MARKDOWN_DEEP_STACKS_HEADING} (1)`);
    expect(
      service.renderFindings({
        deepStacks,
        previewCount: 3,
        wideCallables: [],
      }),
    ).toContain(`## ${MARKDOWN_DEEP_STACKS_HEADING} (1)`);
  });

  it("names a wide callable with the limit it broke and where it lives", () => {
    const rendered = service.renderFindings({
      deepStacks: [],
      previewCount: 3,
      wideCallables: [
        {
          breadth: 12,
          callees: [],
          displayName: "AlphaService.orchestrate",
          id: "orchestrate",
          limit: 8,
          location: buildSourceLocation({ filePath: "alpha.service.ts" }),
          signature: undefined,
        },
      ],
    });

    // The limit is per project, so it cannot be inferred from the run and has
    // to be printed beside the breadth that broke it.
    expect(rendered).toContain(`## ${MARKDOWN_WIDE_CALLABLES_HEADING} (1)`);
    expect(rendered).toContain(
      "- `AlphaService.orchestrate` — 12 direct callees, limit 8 (alpha.service.ts)",
    );
  });

  it("prints a gate's deep stacks as trees rather than as a table", () => {
    const rendered = service.renderFindings({
      deepStacks: [{ ...stack({ entry: "Resolver.read" }), limit: 1 }],
      previewCount: 3,
      wideCallables: [],
    });

    expect(rendered).toContain("**1. `Resolver.read`** — depth 2");
  });

  // 🔭 A project's own limits

  it("states both limits a project declared for itself", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: limitsLookup({
        maximumBreadth: 7,
        maximumDepth: 4,
        path: "packages/example/callidescope.config.ts",
      }),
      previewCount: 3,
      rendering: "tree",
      report: report([]),
    });

    expect(rendered).toContain(`### ${MARKDOWN_PROJECT_LIMITS_HEADING}`);
    expect(rendered).toContain(MARKDOWN_PROJECT_LIMITS_SUMMARY);
    expect(rendered).toContain("| `maximumDepth` | 4 |");
    expect(rendered).toContain("| `maximumBreadth` | 7 |");
  });

  it("says a limit the project does not declare is none rather than a number", () => {
    // Breadth's usual case. Printing the workspace's number, or any number,
    // would claim a gate this project does not have.
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: limitsLookup({
        maximumBreadth: undefined,
        maximumDepth: 4,
        path: "packages/example/callidescope.config.ts",
      }),
      previewCount: 3,
      rendering: "tree",
      report: report([]),
    });

    expect(rendered).toContain(`| \`maximumBreadth\` | ${NO_LIMIT_LABEL} |`);
    expect(rendered).toContain("| `maximumDepth` | 4 |");
  });

  it("reads the row for the project the section is about", () => {
    // Through the same `limitsFor` the index and the gate read, so a project's
    // own block cannot disagree with the workspace's view of that project.
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup({
        byProject: { example: 3 },
        maximumDepth: 17,
      }),
      previewCount: 3,
      rendering: "tree",
      report: report([]),
    });

    expect(rendered).toContain("| `maximumDepth` | 3 |");
  });

  // 📊 Finding tables

  it("gives a wide callable a row naming its breadth and direct callees", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      report: {
        ...report([]),
        callableBreadths: [
          {
            breadth: 2,
            callees: [
              { displayName: "First.helper", id: "first" },
              { displayName: "Second.helper", id: "second" },
            ],
            displayName: "Orchestrator.run",
            id: "orchestrator",
            location: buildSourceLocation({
              filePath: "orchestrator.ts",
              line: 12,
            }),
            signature: undefined,
          },
        ],
      },
    });

    expect(rendered).toContain("| `Orchestrator.run` | 2 |");
    expect(rendered).toContain("`First.helper`");
    expect(rendered).toContain("`Second.helper`");
    expect(rendered).toContain("`orchestrator.ts:12`");
  });

  it("shows every breadth row openly while they fit in the preview", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 3,
      rendering: "tree",
      report: {
        ...report([]),
        callableBreadths: [
          callableBreadth({ name: "First" }),
          callableBreadth({ name: "Second" }),
        ],
      },
    });

    expect(rendered).not.toContain("<details>");
    expect(rendered).toContain("`Second`");
  });

  it("hides the breadth rows past the preview behind a disclosure", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 1,
      rendering: "tree",
      report: {
        ...report([]),
        callableBreadths: [
          callableBreadth({ name: "First" }),
          callableBreadth({ name: "Second" }),
          callableBreadth({ name: "Third" }),
        ],
      },
    });

    expect(rendered).toContain("<summary>2 more callables</summary>");
    expect(rendered).toContain("</details>");
  });

  it("still publishes the hidden breadth rows in full", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      limits: buildProjectLimitsLookup(),
      previewCount: 1,
      rendering: "tree",
      report: {
        ...report([]),
        callableBreadths: [
          callableBreadth({ name: "First" }),
          callableBreadth({ name: "Second" }),
        ],
      },
    });

    expect(rendered).toContain("| `Second` |");
  });
});
