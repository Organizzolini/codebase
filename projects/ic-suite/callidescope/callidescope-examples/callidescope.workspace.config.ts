import type { CallidescopeConfiguration } from "@callidescope/configuration";

/**
 * The configuration the fixtures in this package are traced with.
 *
 * Deliberately not the workspace's. `configuration/callidescope.config.ts`
 * carries a ratchet — `maximumDepth: 17`, today's worst stack — because its job
 * is to stop the repository getting worse. This one carries the tool's own
 * defaults, because its job is to make the fixtures produce findings: a package
 * whose examples all pass demonstrates nothing.
 *
 * That is also why `configuration/.callidescopeignore` excludes this directory
 * from the workspace run. Fixtures that exist to be too deep would otherwise
 * gain a `gate` target of their own: the callidescope Nx plugin withholds
 * `gate` from a project the workspace configuration excludes, because such a
 * project's own code is never traced. Dropping this directory from the ignore
 * file would stop excluding it, so the plugin would infer `gate` here the same
 * as everywhere else, and `deep-stack` and `forwarding-stack` would fail it
 * immediately. Silencing that would mean either raising the workspace limit
 * past what the repository can hold or teaching everyone to ignore a red gate.
 *
 * The two gates therefore rest on entirely different mechanisms, which is the
 * clearest demonstration of the split this package can offer:
 *
 * - the workspace gates depth (and, wherever a project declares
 *   `limits.maximumBreadth`, breadth) through the inferred per-project `gate`
 *   target, scoped by `nx affected` to whatever a change touched; its
 *   committed report is published separately, by `nx run
 *   codebase:callidescope:write` on `main` only, because the call graph moves
 *   on nearly every change;
 * - this package runs `--check reports`, because its fixtures are frozen. A
 *   report here goes stale when a fixture changed, when the resolver did, or
 *   when one of the three dependency packages the run's closure reaches did —
 *   all three of which are exactly what the check should catch.
 *
 * ## Why this file is not called `callidescope.config.ts`
 *
 * Because it is a *workspace* configuration that happens to sit at a project
 * root, and the two roles are read differently. A run resolves a configuration
 * beside every project it traces, and a project's own file may set only
 * `entryPoints`, `exclude`, `limits`, and its own two markdown destinations.
 * This one legitimately sets `write.json`, which only a workspace
 * configuration may set — so being discovered as this package's project
 * configuration would refuse the run outright.
 *
 * A run does skip the file it was handed by `--config`, on the ground that one
 * file holds one role per run. That is necessary but not sufficient here:
 * `testing/examples.integration.test.ts` traces the fixtures through a
 * *derived* copy of this object written into a temporary directory, because two
 * of its assertions override `limits` and `exclude` and neither has a flag. The
 * run's `--config` then names the temporary file, so path equality has nothing
 * to match and discovery would find this one at the project root.
 *
 * The name is what settles it. Project discovery looks for exactly the eight
 * `callidescope.config.*` spellings, so any other name is invisible to it while
 * staying perfectly loadable when `--config` names it. Renaming rather than
 * relocating keeps the file in the trace: `testing/` is excluded as test code,
 * so moving it there would drop this package's `fileCount` and put the suite's
 * counts at odds with the committed report.
 *
 * It also leaves the name `callidescope.config.ts` free beside it, for a
 * genuine per-project configuration this package can demonstrate.
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  limits: {
    /**
     * The tool's own default, so the deliberately deep fixtures are findings.
     *
     * Seven frames and up are reported; `DeepStackService` and
     * `ForwardingStackService` are eight apiece, and both are meant to fail.
     */
    maximumDepth: 6,
  },
  write: {
    /** The whole run as JSON, which is the machine-readable shape. */
    json: {
      path: "projects/ic-suite/callidescope/callidescope-examples/output/report.json",
    },
    /** The printed trees, spliced between anchors. */
    markdown: {
      path: "projects/ic-suite/callidescope/callidescope-examples/output/report.md",
    },
    /** The same stacks drawn as one flowchart instead of printed. */
    mermaid: {
      path: "projects/ic-suite/callidescope/callidescope-examples/output/diagram.md",
    },
  },
};

export default callidescopeConfiguration;
