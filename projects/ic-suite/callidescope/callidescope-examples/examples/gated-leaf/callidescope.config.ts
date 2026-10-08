import type { CallidescopeProjectConfiguration } from "@callidescope/configuration";

/**
 * What one leaf project says about itself, completely.
 *
 * A project configuration may set `entryPoints`, `exclude`, `limits`, and
 * `write` — and must set all four. Everything else describes the run itself,
 * and a project file that sets one of those is refused before anything is
 * traced; a project file that leaves one of these four out is refused for
 * exactly the opposite reason.
 *
 * Nothing is resolved across two files any more. Every value this project is
 * traced and judged by is written below, which is why the fields it has no
 * opinion about are here too rather than absent. A real package spreads the
 * workspace's `projectDefaults` to say the same thing in one line; this one
 * writes it out because it is the worked example of the shape.
 */
const callidescopeConfiguration: CallidescopeProjectConfiguration = {
  /**
   * One glob, naming the generated file this project does not want measured.
   *
   * Read relative to this project's own root, which is what keeps it here:
   * `gated-leaf.generated.ts` is named, and there is no spelling of this glob
   * that could reach a file outside the project that wrote it — see
   * [`README.md`](README.md) for the file-count proof.
   */
  exclude: ["*.generated.ts"],

  entryPoints: {
    /**
     * The one address this project publishes.
     *
     * Nothing outside this project calls `read`, so declaring it is what
     * roots it under the `declared` kind rather than under `orphan-root` —
     * the same measurement, labeled as the surface this project asked to be
     * judged on rather than as dead code. See [`README.md`](README.md).
     */
    addresses: [
      "projects/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts#GatedLeafService.read",
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
  limits: {
    /** Two, against the three callees `read` reaches directly. */
    maximumBreadth: 2,
    /** Three, against the four frames `read` heads. */
    maximumDepth: 3,
  },
  write: {
    /** The `## 🔭 Callidescope` section at the bottom of this project's guide. */
    markdown: {
      heading: "## 🔭 Callidescope",
      path: "README.md",
    },
    /** No diagram: the package around this one publishes the run's. */
    mermaid: undefined,
  },
};

export default callidescopeConfiguration;
