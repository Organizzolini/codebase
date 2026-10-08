import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/embedding";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "A one-file template, driven without the command-line host",
    inputs: {
      name: { description: "Note name in kebab-case", type: "string" },
    },
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "note",
    templatePath: `${EXAMPLE_PATH}/templates/note`,
  },
];

export default conformetryConfiguration;
