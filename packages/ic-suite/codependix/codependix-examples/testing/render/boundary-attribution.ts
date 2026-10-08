import { renderBoundaryRun, runBoundaryCheck } from "./boundary-run";
import { boundaryReportService } from "./builders";
import { fence, fenceJson } from "./document";
import { renderWorkspaceGraph } from "./nx-graphs";

import type { BoundaryRun } from "./boundary-run";
import type { ExampleWorkspace } from "./nx-graphs";
import type { ExampleDocument, ExampleSection } from "./types";
import type { CodependixBoundaryRule } from "@codependix/configuration";

// 🏷️ Types

/** What a scenario's run is pointed at, beyond the workspace it is fixed to. */
interface ScenarioArguments {
  /** `false` for `--no-dependencies`. */
  readonly dependencies?: boolean;
  /** The projects `--projects` named. */
  readonly judged: readonly string[];
}

// ♟️ Constants

/**
 * Two projects that depend on each other, and an application that depends on
 * one of them.
 *
 * `shop-checkout` and `shop-pricing` are the cross-project cycle; `shop-web`
 * is only a dependent of it.
 */
const SHOP_CYCLE: ExampleWorkspace = {
  dependencies: [
    { source: "shop-web", target: "shop-checkout", type: "static" },
    { source: "shop-checkout", target: "shop-pricing", type: "static" },
    { source: "shop-pricing", target: "shop-checkout", type: "static" },
  ],
  projects: [
    { name: "shop-checkout", root: "packages/shop-checkout" },
    { name: "shop-pricing", root: "packages/shop-pricing" },
    { name: "shop-web", root: "applications/shop-web" },
  ],
};

/** A three-project cycle with an application hanging off it. */
const SHOP_RING: ExampleWorkspace = {
  dependencies: [
    { source: "shop-admin", target: "shop-ledger", type: "static" },
    { source: "shop-ledger", target: "shop-invoices", type: "static" },
    { source: "shop-invoices", target: "shop-payments", type: "static" },
    { source: "shop-payments", target: "shop-ledger", type: "static" },
  ],
  projects: [
    { name: "shop-admin", root: "applications/shop-admin" },
    { name: "shop-invoices", root: "packages/shop-invoices" },
    { name: "shop-ledger", root: "packages/shop-ledger" },
    { name: "shop-payments", root: "packages/shop-payments" },
  ],
};

/**
 * A workspace where the web application reaches past the api to the database,
 * and the api reaches a project the `allow` rule does not list.
 */
const SHOP_ACCESS: ExampleWorkspace = {
  dependencies: [
    { source: "shop-e2e", target: "shop-web", type: "static" },
    { source: "shop-web", target: "shop-api", type: "static" },
    { source: "shop-web", target: "shop-database", type: "static" },
    { source: "shop-api", target: "shop-database", type: "static" },
    { source: "shop-api", target: "shop-pricing", type: "static" },
  ],
  projects: [
    { name: "shop-api", root: "packages/shop-api" },
    { name: "shop-database", root: "packages/shop-database" },
    { name: "shop-e2e", root: "applications/shop-e2e" },
    { name: "shop-pricing", root: "packages/shop-pricing" },
    { name: "shop-web", root: "applications/shop-web" },
  ],
};

/** The one rule the two cycle workspaces are judged by. */
const NO_PROJECT_CYCLES: CodependixBoundaryRule[] = [
  {
    kind: "acyclic",
    message: "Projects that depend on each other cannot be built apart.",
    name: "no-project-cycles",
  },
];

/** A `forbid` rule: the web application goes through the api. */
const WEB_NEVER_REACHES_THE_DATABASE: CodependixBoundaryRule[] = [
  {
    from: { id: ["shop-web"] },
    kind: "forbid",
    message: "The web application goes through the api.",
    name: "web-never-reaches-the-database",
    to: { id: ["shop-database"] },
  },
];

/** An `allow` rule: the api reaches the database and nothing else. */
const API_REACHES_DATABASE_ONLY: CodependixBoundaryRule[] = [
  {
    from: { id: ["shop-api"] },
    kind: "allow",
    message: "The api owns the database and nothing else.",
    name: "api-reaches-database-only",
    to: { id: ["shop-database"] },
  },
];

// 🏃 Scenarios

/** Builds the three in-memory attribution examples. */
export async function buildAttributionDocuments(): Promise<ExampleDocument[]> {
  return [
    await buildCycleDocument(),
    await buildForbiddenEdgeDocument(),
    await buildDependencyNoteDocument(),
  ];
}

/** Runs the access-rule workspace under the chosen rule kind. */
export async function runAccessCheck(
  args: Pick<ScenarioArguments, "judged"> & { kind: "allow" | "forbid" },
): Promise<BoundaryRun> {
  return runScenario({
    ...args,
    rules:
      args.kind === "forbid"
        ? WEB_NEVER_REACHES_THE_DATABASE
        : API_REACHES_DATABASE_ONLY,
    workspace: SHOP_ACCESS,
  });
}

/** Runs the cross-project cycle workspace. */
export async function runCycleCheck(
  args: ScenarioArguments,
): Promise<BoundaryRun> {
  return runScenario({
    ...args,
    rules: NO_PROJECT_CYCLES,
    workspace: SHOP_CYCLE,
  });
}

// 📄 Documents

/** Runs the three-project cycle workspace. */
export async function runRingCheck(
  args: ScenarioArguments,
): Promise<BoundaryRun> {
  return runScenario({
    ...args,
    rules: NO_PROJECT_CYCLES,
    workspace: SHOP_RING,
  });
}

/** Builds the example showing a cycle charged to every project on it. */
async function buildCycleDocument(): Promise<ExampleDocument> {
  const everything = await runCycleCheck({
    judged: ["shop-checkout", "shop-pricing", "shop-web"],
  });

  return {
    id: "boundary-cycles",
    jsonExports: [],
    sections: [
      {
        body: renderWorkspaceGraph(SHOP_CYCLE),
        heading: "A workspace with a cycle between two projects",
        note: "`shop-checkout` and `shop-pricing` depend on each other, and `shop-web` depends on `shop-checkout`. The one rule is `acyclic`.",
      },
      {
        body: renderBoundaryRun(everything),
        heading: "The cycle is charged to every project on it",
        note: "Both projects own a node on the cycle and neither one is more to blame, so the finding is charged to both and fails both. It is listed once under each. `shop-web` owns no node on the cycle and is charged nothing.",
      },
      {
        body: renderBoundaryRun(
          await runCycleCheck({ judged: ["shop-pricing"] }),
        ),
        heading: "Judging one project on the cycle still finds it",
        note: "`--projects shop-pricing` builds `shop-pricing` and everything it depends on, which is `shop-checkout` — so the other half of the cycle is in the graph and the finding is the same, charged to both. `shop-pricing` is judged, so the run fails.",
      },
      {
        body: renderBoundaryRun(
          await runRingCheck({ judged: ["shop-admin", "shop-ledger"] }),
        ),
        heading:
          "A longer cycle is charged to every project on it, and no other",
        note: "`shop-ledger`, `shop-invoices`, and `shop-payments` form a ring. All three are charged, though only `shop-ledger` was named. `shop-admin` was named too and depends on the ring without being part of it, so it is charged nothing.",
      },
      {
        body: fenceJson(everything.report),
        heading: "The same finding as `--format json` prints it",
        note: "Under the `boundaries` key. `projects` is who the finding is charged to, `verdict` is `fail` because a charged project is judged, and `cycle` is the whole path. See [The boundary report](../../../codependix-cli/README.md#the-boundary-report).",
      },
    ],
    summary:
      "A cycle is charged to every project that owns a node on it, so a cross-project cycle between `a` and `b` fails both, and naming either one is enough to find it.",
    title: "A cycle is charged to every project on it",
  };
}

/** Builds the example showing a dependent being noted rather than failed. */
async function buildDependencyNoteDocument(): Promise<ExampleDocument> {
  const noted = await runCycleCheck({ judged: ["shop-web"] });
  const sections: ExampleSection[] = [
    {
      body: renderBoundaryRun(noted),
      heading: "A dependent of a cycle is told, not failed",
      note: "The workspace is the one in [`boundary-cycles`](../boundary-cycles/README.md). `shop-web` depends on `shop-checkout`, so both halves of the cycle are built — but neither is judged. The finding is reported under the dependency it lives in, marked `note`, and the exit code is `0`. `shop-web` cannot fix it, and it did not break `shop-web`.",
    },
    {
      body: renderBoundaryRun(
        await runCycleCheck({ judged: ["shop-pricing", "shop-web"] }),
      ),
      heading: "Naming a project on the cycle makes it a failure",
      note: "The same finding with `shop-pricing` named as well. A finding fails the run when any project it is charged to is judged, and this one is charged to `shop-pricing`.",
    },
    {
      body: renderBoundaryRun(
        await runCycleCheck({ dependencies: false, judged: ["shop-web"] }),
      ),
      heading: "`--no-dependencies` never builds the dependencies at all",
      note: "Only `shop-web` is built, so the cycle behind it is not in the graph and there is nothing to note. Charging still works as before — a finding in a project that is built is charged to the projects that own it — but a dependency left out of the build cannot have a finding.",
    },
    {
      body: fence(
        boundaryReportService.renderNotes(noted.outcome.violations).join("\n"),
      ),
      heading: "How a note reads in the log",
      note: "The line is the one the Markdown bullet above carries, with the verdict dropped: `in dependency` names where the finding lives and `not failing` says why the run is still green. A container that cannot boot is worded the same way — see [`boundary-boot-failures`](../boundary-boot-failures/README.md).",
    },
  ];

  return {
    id: "boundary-dependency-notes",
    jsonExports: [],
    sections,
    summary:
      "A project that merely depends on a project with a boundary finding is not failed: the finding is reported as a note against the dependency, and the run stays green.",
    title: "A dependent is told, not failed",
  };
}

/** Builds the example showing a forbidden edge charged to its source only. */
async function buildForbiddenEdgeDocument(): Promise<ExampleDocument> {
  return {
    id: "boundary-forbidden-edges",
    jsonExports: [],
    sections: [
      {
        body: renderWorkspaceGraph(SHOP_ACCESS),
        heading: "A workspace where an application reaches past the api",
        note: "`shop-web` depends on `shop-api` and, directly, on `shop-database`. `shop-api` depends on `shop-database` and on `shop-pricing`. `shop-e2e` depends on `shop-web`.",
      },
      {
        body: renderBoundaryRun(
          await runAccessCheck({ judged: ["shop-web"], kind: "forbid" }),
        ),
        heading: "A `forbid` violation is charged to the edge's source",
        note: "`web-never-reaches-the-database` condemns the edge `shop-web → shop-database`. The project that wrote the import is `shop-web`, so it is charged `shop-web` and nothing else.",
      },
      {
        body: renderBoundaryRun(
          await runAccessCheck({ judged: ["shop-database"], kind: "forbid" }),
        ),
        heading: "The target is not charged, so judging it finds nothing",
        note: "`shop-database` did nothing wrong, and a dependency closure never includes dependents, so the edge is not even built. Naming the target is a clean run.",
      },
      {
        body: renderBoundaryRun(
          await runAccessCheck({ judged: ["shop-e2e"], kind: "forbid" }),
        ),
        heading: "A project depending on the source is noted",
        note: "`shop-e2e` depends on `shop-web`, so the edge is built and charged to `shop-web` — which is not judged. It is reported as a note against the dependency.",
      },
      {
        body: renderBoundaryRun(
          await runAccessCheck({ judged: ["shop-api"], kind: "allow" }),
        ),
        heading: "An edge no `allow` rule covers is charged to its source too",
        note: "`api-reaches-database-only` lists the whole surface `shop-api` may reach, so `shop-api → shop-pricing` is uncovered. It is charged to `shop-api`, whose code reaches out, rather than to `shop-pricing`, which is only reached.",
      },
    ],
    summary:
      "A `forbid` violation, or an edge no `allow` rule covers, is charged to the project that owns the edge's source and to no other.",
    title: "A forbidden edge is charged to its source",
  };
}

// 🏃 Running

/** Runs one in-memory workspace against its rules. */
async function runScenario(args: {
  dependencies?: boolean | undefined;
  judged: readonly string[];
  rules: CodependixBoundaryRule[];
  workspace: ExampleWorkspace;
}): Promise<BoundaryRun> {
  return runBoundaryCheck({
    ...(args.dependencies !== undefined && { dependencies: args.dependencies }),
    judged: args.judged,
    rules: { nxProjects: args.rules },
    workingDirectory: "/atlas",
    workspace: args.workspace,
  });
}
