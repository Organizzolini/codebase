import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The nearest configuration wins outright, and nothing is merged.
 *
 * Codometer searches for a configuration by walking **upward** from the folder
 * it was pointed at and taking the **first** file it finds. Three files are in
 * play above this one — this package's, and the workspace root's, which is
 * itself a re-export of `configuration/codometer.config.ts` — and none of them
 * contributes anything to a run measuring this folder.
 *
 * That is visible rather than asserted, because the counter below exists
 * nowhere else:
 *
 * ```bash
 * # This file wins: one badge, "Configurations", and no "Service Files".
 * cd projects/ic-suite/codometer/codometer-examples/examples/discovery/nested
 * codometer
 *
 * # One folder up carries no configuration, so the search continues to the
 * # package's: "Service Files" and "Unit Tests" return, "Configurations" does
 * # not — and so does the package's own "Corpus" input, now reported empty
 * # since this folder holds no `examples/corpus/`. See this package's own
 * # guide for why one plain configuration file now answers for both cases.
 * cd projects/ic-suite/codometer/codometer-examples/examples/discovery
 * codometer
 * ```
 *
 * Merging the two would leave a limit that never applied looking exactly like
 * one that did, and telling them apart would mean knowing which of several
 * files each field came from. So a project needs no configuration file of its
 * own — one at the top of a workspace can describe every folder beneath it —
 * and a project that writes one replaces that description rather than editing
 * it.
 */
const codometerConfiguration: CodometerConfiguration = {
  custom: [
    {
      color: "9333ea",
      label: "Configurations",
      patterns: ["**/*.config.ts"],
    },
  ],
  format: "markdown",
};

export default codometerConfiguration;
