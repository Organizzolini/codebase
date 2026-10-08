import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/scoring-thresholds";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "One template, two instance groups, two thresholds",
    inputs: {
      name: { description: "Dossier name in kebab-case", type: "string" },
    },
    instances: [
      // No threshold of its own, so this group answers to the generator's.
      { patterns: [`${EXAMPLE_PATH}/instances/strict/*`] },
      // The directory still being migrated. Its findings print either way — a
      // lowered threshold is permission to ship the drift, not a reason to
      // stop showing it.
      { patterns: [`${EXAMPLE_PATH}/instances/migrating/*`], threshold: 0.75 },
    ],
    name: "dossier",
    templatePath: `${EXAMPLE_PATH}/templates/dossier`,
    threshold: 1,
  },
];

export default conformetryConfiguration;
