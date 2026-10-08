import { boundariesService, boundaryReportService } from "./builders";
import { fence } from "./document";

import type { ExampleDocument, ExampleSection } from "./types";
import type { BoundaryGraph } from "@codependix/boundaries";
import type { CodependixBoundaryRule } from "@codependix/configuration";

// ♟️ Constants

/**
 * A four-project Nx graph with one edge every seeded rule shape can judge.
 *
 * Written as a `BoundaryGraph` directly rather than built from a real Nx
 * workspace: the adapters that flatten the four real graphs into this shape
 * live in `@codependix/cli` and are exercised by the `graph-levels` example.
 * What this example is about is the judging, which starts here.
 */
const ATLAS_PROJECTS: BoundaryGraph = {
  edges: [
    { implicit: false, source: "atlas-application", target: "atlas-service" },
    { implicit: false, source: "atlas-service", target: "atlas-core" },
    { implicit: true, source: "atlas-service", target: "atlas-tooling" },
  ],
  level: "nxProjects",
  nodes: [
    { id: "atlas-application", tags: ["type:application"] },
    { id: "atlas-core", tags: ["type:package"] },
    { id: "atlas-service", tags: ["type:package"] },
    { id: "atlas-tooling", tags: ["type:application"] },
  ],
  scope: "workspace",
};

/** The same workspace after `atlas-core` grows a dependency back on the service. */
const ATLAS_WITH_A_CYCLE: BoundaryGraph = {
  ...ATLAS_PROJECTS,
  edges: [
    ...ATLAS_PROJECTS.edges,
    { implicit: false, source: "atlas-core", target: "atlas-service" },
  ],
};

/** One project's files, at the level the module-file suffixes are layered. */
const ATLAS_FILES: BoundaryGraph = {
  edges: [
    { source: "src/catalog.service.ts", target: "src/catalog.types.ts" },
    { source: "src/catalog.types.ts", target: "src/settings.service.ts" },
  ],
  level: "typescript",
  nodes: [
    "src/catalog.service.ts",
    "src/catalog.types.ts",
    "src/settings.service.ts",
  ].map((fileName) => ({
    id: fileName,
    path: fileName,
    project: "atlas-service",
  })),
  scope: "atlas-service",
};

// 🚧 Rules

/** Builds the boundary-rules example document. */
export function buildBoundaryDocuments(): ExampleDocument[] {
  return [
    {
      id: "boundary-rules",
      jsonExports: [],
      sections: [
        ...buildKindSections(),
        buildMessageSection(),
        buildSelectorSection(),
      ],
      summary:
        "The three rule kinds `--check boundaries` gates, judged by the real evaluator — and the two properties that decide what a report is allowed to leave out.",
      title: "The three boundary rule kinds",
    },
  ];
}

/** Builds the section for each of the three rule kinds. */
function buildKindSections(): ExampleSection[] {
  return [
    {
      body: judge({
        graph: ATLAS_PROJECTS,
        rules: [
          {
            from: { tags: ["type:application"] },
            kind: "forbid",
            message: "An application is a leaf.",
            name: "applications-are-leaves",
            to: { tags: ["type:application"] },
          },
        ],
      }),
      heading: "`forbid` — an edge that must not exist",
      note: "Nothing is reported: no application depends on another. A rule that matches nothing is not an error, and neither is one everything satisfies — a workspace that has not yet grown the code a rule was written for should not be failed for it.",
    },
    {
      body: judge({
        graph: ATLAS_PROJECTS,
        rules: [
          {
            from: { id: ["atlas-service"] },
            kind: "allow",
            message: "The service composes the core and nothing else.",
            name: "atlas-service-reaches-core-only",
            to: { id: ["atlas-core"] },
          },
        ],
      }),
      heading: "`allow` — the whole surface a node may reach",
      note: "The mirror image of `forbid`: every edge leaving `atlas-service` for anywhere outside `atlas-core` is reported. The one caught here is `atlas-tooling`, reached through an Nx `implicitDependencies` entry — a project-graph edge with no import statement, which is the fact `@nx/enforce-module-boundaries` structurally cannot see.",
    },
    {
      body: judge({
        graph: ATLAS_WITH_A_CYCLE,
        rules: [
          {
            kind: "acyclic",
            message:
              "Two projects that depend on each other cannot be built apart.",
            name: "no-project-cycles",
          },
        ],
      }),
      heading: "`acyclic` — a shape rather than an edge",
      note: "The whole path is named, not only the edge that closed it, and one tangle is reported once rather than once per node it passes through. This is the rule kind no per-file lint rule can express: a cycle is a statement about a graph.",
    },
  ];
}

/** Builds the section showing a rule's own message appended, not substituted. */
function buildMessageSection(): ExampleSection {
  return {
    body: judge({
      graph: ATLAS_FILES,
      rules: [
        {
          from: { path: ["**/*.types.ts"] },
          kind: "forbid",
          message: "Types are the leaf of a module.",
          name: "types-files-do-not-reach-services",
          to: { path: ["**/*.service.ts"] },
        },
      ],
    }),
    heading: "A rule's `message` is appended, never substituted",
    note: "The generated half names the rule and both endpoints; the configured half says why it matters. Appending rather than replacing is what stops any wording a configuration chooses from costing the report the two things it must always carry. Note also which edge is _not_ reported — a service importing its own types is the direction that works.",
  };
}

/** Builds the section showing a selector narrowing across its fields. */
function buildSelectorSection(): ExampleSection {
  return {
    body: judge({
      graph: ATLAS_FILES,
      rules: [
        {
          from: { path: ["**/*.types.ts"], project: ["other-project"] },
          kind: "forbid",
          name: "scoped-to-another-project",
          to: { path: ["**/*.service.ts"] },
        },
      ],
    }),
    heading: "A selector's fields narrow each other",
    note: "The same rule as above with a `project` field added reports nothing, because every field a selector states must match. Within one field, one glob matching is enough. A selector naming a field its level does not carry — `path` at the NestJS level, where a module is a class name and nothing else — matches nothing rather than everything.",
  };
}

// 📄 Documents

/** Renders whatever a rule reports against a graph, or says it reported nothing. */
function judge(args: {
  graph: BoundaryGraph;
  rules: CodependixBoundaryRule[];
}): string {
  const violations = boundariesService.evaluate(args);

  return fence(
    [
      boundaryReportService.renderSummary(violations),
      ...boundaryReportService.renderViolations(violations),
    ].join("\n"),
  );
}
