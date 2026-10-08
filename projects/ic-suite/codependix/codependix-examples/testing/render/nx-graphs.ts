import { neighborhoodService, workspaceGraphService } from "./builders";
import { fence } from "./document";

import type { ExampleDocument, ExampleSection } from "./types";
import type {
  Neighborhood,
  NxProject,
  NxProjectGraph,
  WorkspaceGraph,
} from "@codependix/nx-projects";

// 🏷️ Types

/**
 * A whole example workspace, as a description turned into a real project graph.
 *
 * Written as data rather than as a nested Nx workspace on disk because
 * `NeighborhoodService.readProjectGraph` resolves the project graph from the
 * process working directory unless a configuration names a `projectGraph`
 * file — and handing the builders a graph directly is what lets a guide be
 * rendered from the real ones. See this package's README.
 */
export interface ExampleWorkspace {
  readonly dependencies: ExampleDependency[];
  readonly projects: ExampleProject[];
}

/** One project depending on another inside an example workspace. */
interface ExampleDependency {
  readonly source: string;
  readonly target: string;
  /** Mirrors the Nx dependency type the renderer reads. */
  readonly type: "implicit" | "static";
}

/** A project inside an example workspace. */
interface ExampleProject {
  readonly name: string;
  /** Workspace-relative root. `"."` marks the workspace root project. */
  readonly root: string;
}

// ♟️ Constants

/** Root the example workspaces' project roots are resolved against. */
const WORKSPACE_ROOT = "/atlas";

/** The project every Neighborhood example is centered on. */
export const SUBJECT_PROJECT_NAME = "atlas-service";

/**
 * The example workspace's projects, including its root project.
 *
 * The root project is carried deliberately: `NeighborhoodService.readProjects`
 * drops every node whose root is `"."`, so its absence from every diagram is
 * something the examples show rather than assert.
 */
const ATLAS_PROJECTS: ExampleProject[] = [
  { name: "atlas-application", root: "applications/atlas-application" },
  { name: "atlas-core", root: "packages/atlas-core" },
  { name: "atlas-service", root: "packages/atlas-service" },
  { name: "atlas-workspace", root: "." },
];

/** A three-deep chain: application depends on service depends on core. */
export const ATLAS_CHAIN: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-service", type: "static" },
    { source: "atlas-service", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** The same chain, with the application's edge inferred from configuration. */
const ATLAS_INFERRED: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-service", type: "implicit" },
    { source: "atlas-service", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** One pair declared both statically and implicitly, in that order. */
const ATLAS_DOUBLE_DECLARED: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-service", type: "static" },
    { source: "atlas-application", target: "atlas-service", type: "implicit" },
  ],
  projects: ATLAS_PROJECTS,
};

/** A project the graph reports as depending on itself. */
const ATLAS_SELF_DEPENDENT: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-service", target: "atlas-core", type: "static" },
    { source: "atlas-service", target: "atlas-service", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** A dependency on a package outside the workspace. */
const ATLAS_EXTERNAL: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-service", target: "atlas-core", type: "static" },
    { source: "atlas-service", target: "npm:zod", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** A workspace whose subject project touches nothing at all. */
const ATLAS_UNCONNECTED: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/**
 * The chain after an edge is added somewhere else in the workspace.
 *
 * `atlas-core` is untouched by the change and its Neighborhood still moves,
 * which is why this repository gates no pull request on `codependix map --check`.
 */
const ATLAS_CHAIN_AFTER_DRIFT: ExampleWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-core", type: "static" },
    { source: "atlas-application", target: "atlas-service", type: "static" },
    { source: "atlas-service", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

// 🕸️ Graphs

/** Builds one project's Neighborhood from an example workspace. */
export function buildNeighborhood(
  workspace: ExampleWorkspace,
  projectName: string,
): Neighborhood | undefined {
  return neighborhoodService
    .buildNeighborhoods(buildProjectGraph(workspace), readProjects(workspace))
    .get(projectName);
}

/** Builds every Nx example document. */
export function buildNxDocuments(): ExampleDocument[] {
  return [buildScopeDocument(), buildDriftDocument()];
}

/** Turns an example workspace description into a real project graph. */
export function buildProjectGraph(workspace: ExampleWorkspace): NxProjectGraph {
  const dependencies: NxProjectGraph["dependencies"] = {};

  for (const dependency of workspace.dependencies) {
    dependencies[dependency.source] = [
      ...(dependencies[dependency.source] ?? []),
      dependency,
    ];
  }

  return {
    dependencies,
    nodes: Object.fromEntries(
      workspace.projects.map((project) => [
        project.name,
        { data: { root: project.root }, name: project.name, type: "lib" },
      ]),
    ),
  };
}

/** Builds an example workspace's whole-repository Workspace Graph. */
export function buildWorkspaceGraph(
  workspace: ExampleWorkspace,
): WorkspaceGraph {
  return workspaceGraphService.buildWorkspaceGraph(
    buildProjectGraph(workspace),
    readProjects(workspace),
  );
}

/** Lists the projects an example workspace's graph reports, root excluded. */
export function readProjects(workspace: ExampleWorkspace): NxProject[] {
  return neighborhoodService.readProjects(
    buildProjectGraph(workspace),
    WORKSPACE_ROOT,
  );
}

/** Renders one project's Neighborhood from an example workspace. */
export function renderNeighborhood(
  workspace: ExampleWorkspace,
  projectName: string,
): string {
  const neighborhood = buildNeighborhood(workspace, projectName);

  /* v8 ignore next -- every example names a project its own graph holds */
  if (neighborhood === undefined) return "";

  return neighborhoodService.renderMermaid(neighborhood);
}

// 📄 Documents

/** Renders an example workspace's whole-repository Workspace Graph. */
export function renderWorkspaceGraph(workspace: ExampleWorkspace): string {
  return workspaceGraphService.renderMermaid(buildWorkspaceGraph(workspace));
}

/** Builds the drift example, comparing one Neighborhood before and after. */
function buildDriftDocument(): ExampleDocument {
  return {
    id: "workspace-drift",
    jsonExports: [],
    sections: [
      {
        body: renderNeighborhood(ATLAS_CHAIN, "atlas-core"),
        heading: "Before the change",
        note: "`atlas-core` sits at the bottom of the chain, with one dependent.",
      },
      {
        body: renderNeighborhood(ATLAS_CHAIN_AFTER_DRIFT, "atlas-core"),
        heading: "After an edge is added elsewhere",
        note: "`atlas-application` gained a direct dependency on `atlas-core`. Nothing inside `atlas-core` changed, and its Neighborhood did.",
      },
      {
        body: "An export moves with the workspace it describes, not with the project it is written into. A `--check` run on a branch that changed any project graph therefore fails for projects the branch never touched — which is why `codebase:codependix` runs `write` on the default branch only, after `callidescope` and the module-graph synchronization, so every project's `## 🕸️ Codependix` anchor reflects one commit.",
        heading: "Why no pull request gates on this",
        note: "The failure above is real drift, and it is drift no reviewer of that branch can act on.",
      },
    ],
    summary:
      "Why this repository runs `codependix map --write` on the default branch and gates no pull request on `codependix map --check`.",
    title: "An export moves with the workspace, not with the project",
  };
}

/** Builds the sections covering the renderer's per-edge rules. */
function buildRuleSections(): ExampleSection[] {
  return [
    {
      body: renderNeighborhood(ATLAS_INFERRED, "atlas-application"),
      heading: "A dependency Nx inferred from configuration",
      note: "Drawn with a dashed arrow, and `NEIGHBORHOOD_IMPLICIT_LEGEND` is appended under the diagram to say so.",
    },
    {
      body: renderNeighborhood(ATLAS_DOUBLE_DECLARED, "atlas-application"),
      heading: "A pair declared both statically and implicitly",
      note: "The static edge wins, because it is the stronger statement — the arrow is solid and no legend appears.",
    },
    {
      body: renderNeighborhood(ATLAS_SELF_DEPENDENT, SUBJECT_PROJECT_NAME),
      heading: "A project depending on itself",
      note: "The self-edge is dropped. Only the edge to `atlas-core` survives.",
    },
    {
      body: renderNeighborhood(ATLAS_EXTERNAL, SUBJECT_PROJECT_NAME),
      heading: "A dependency on an external package",
      note: "`npm:zod` is not a known workspace project, so the edge is dropped rather than drawn as an external node.",
    },
    {
      body: renderNeighborhood(ATLAS_UNCONNECTED, SUBJECT_PROJECT_NAME),
      heading: "A project with no neighbors at all",
      note: "`NEIGHBORHOOD_UNCONNECTED` is rendered in place of a diagram.",
    },
    {
      body: fence(
        readProjects(ATLAS_CHAIN)
          .map((project) => project.name)
          .join("\n"),
      ),
      heading: "The workspace root project",
      note: "`atlas-workspace` is rooted at `.` and is absent from the projects list entirely: it contains every project rather than depending on them, so its Neighborhood would say nothing.",
    },
  ];
}

/** Builds the Neighborhood scope and renderer-rule example. */
function buildScopeDocument(): ExampleDocument {
  return {
    id: "neighborhood-scope",
    jsonExports: [],
    sections: [...buildScopeSections(), ...buildRuleSections()],
    summary:
      "A Neighborhood is one hop in each direction, and that is the point. Beside it, the Workspace Graph of the same workspace, and one example per rule the renderer applies.",
    title: "One hop, and every rule the renderer applies",
  };
}

/** Builds the two sections contrasting a Neighborhood with the Workspace Graph. */
function buildScopeSections(): ExampleSection[] {
  return [
    {
      body: renderNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME),
      heading: "The middle project's Neighborhood",
      note: "`atlas-service` holds only its immediate dependency and its immediate dependent. The highlighted node is the `classDef subject` style that marks which project the diagram is centered on.",
    },
    {
      body: renderWorkspaceGraph(ATLAS_CHAIN),
      heading: "The Workspace Graph of the same workspace",
      note: "The whole chain, exported once for the repository rather than once per project, and with no project highlighted.",
    },
  ];
}
