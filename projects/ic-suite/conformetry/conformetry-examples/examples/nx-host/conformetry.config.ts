import type { ConformetryNxConfiguration } from "@conformetry/nx";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/nx-host";

/**
 * The same configuration shape, typed for the Nx host instead of the
 * command-line one.
 *
 * `ConformetryNxConfiguration` is what makes an instance group's `tags` legal:
 * the standalone type has nothing to match a label against, so a group written
 * this way only means something to a host with a project graph.
 */
const conformetryConfiguration: ConformetryNxConfiguration = [
  {
    description: "A module template, located by project tag rather than glob",
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    instances: [
      // Tags select the projects, and the patterns are read *inside* each one,
      // so `src/modules/*` means "every module of every NestJS project" and
      // where this generator belongs is stated exactly once.
      { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
      // Tags alone select without locating anything. That is what a template
      // with no instances yet wants: `nx g` is still confined to the projects
      // the template suits, and validation measures nothing.
      { tags: ["framework:react"] },
    ],
    name: "nx-module",
    templatePath: `${EXAMPLE_PATH}/templates/nx-module`,
  },
];

export default conformetryConfiguration;
