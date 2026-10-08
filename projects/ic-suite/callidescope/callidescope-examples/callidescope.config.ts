import type { CallidescopeProjectConfiguration } from "@callidescope/configuration";

/**
 * What this package says about itself, as opposed to what it runs.
 *
 * Two files at this root, two roles. `callidescope.workspace.config.ts` beside
 * this one is the *workspace* configuration a run of these fixtures is handed:
 * it names the output destinations and the default limits every project the
 * run reaches falls back to. This file is this *project's*
 * own, discovered the way every project's is — by name, at the root holding the
 * `tsconfig.json` that makes it a project — and it says all four of the things
 * a project is entitled to say about itself, completely: a traced project's
 * file is its whole statement, so a field left out is refused by name.
 *
 * ## Why five
 *
 * Six is what `callidescope.workspace.config.ts` supplies as the run's own
 * default. Five is one tighter, and the difference is the example:
 * `examples/project-depth-limit` is a six-frame chain that is a finding under
 * this package's five and would pass under the run's own six — nothing about
 * the code differs, only which file the number is written in.
 *
 * @see examples/project-depth-limit/README.md — the limit, and what it changed
 * @see examples/declared-entry-points/README.md — the address, and the kind
 */
const callidescopeConfiguration: CallidescopeProjectConfiguration = {
  entryPoints: {
    /**
     * One address, for a callable no rule would have rooted.
     *
     * `DeclaredEntryPointsService.collect` is called from inside this package,
     * so orphan promotion never sees it and it would head no stack of its own.
     * Naming it here roots it under the `declared` kind, which is how a package
     * states the surface it means to be measured on.
     */
    addresses: [
      "projects/ic-suite/callidescope/callidescope-examples/examples/declared-entry-points/declared-entry-points.ts#DeclaredEntryPointsService.collect",
    ],
    /**
     * The tool's own list, written out rather than imported.
     *
     * A value import here would be a real call-graph edge from this fixture
     * into `@callidescope/configuration`, widening the closure this run
     * measures. A real package spreads `projectDefaults` and never has to
     * think about it.
     */
    decorators: [
      "Command",
      "Cron",
      "Delete",
      "Get",
      "Mutation",
      "OnEvent",
      "Option",
      "Patch",
      "Post",
      "Put",
      "Query",
      "ResolveField",
      "SubscribeMessage",
    ],
    includeExportedFunctions: true,
    includeOrphans: true,
    includeTests: false,
  },
  exclude: [],
  limits: {
    /** No breadth limit here: the leaf next door is where breadth is gated. */
    maximumBreadth: undefined,
    /** Five, one under the six the run supplies. */
    maximumDepth: 5,
  },
  write: {
    /** The `## 🔭 Callidescope` section at the bottom of this package's README. */
    markdown: {
      heading: "## 🔭 Callidescope",
      path: "README.md",
    },
    /** The run's own diagram is published by the workspace configuration. */
    mermaid: undefined,
  },
};

export default callidescopeConfiguration;
