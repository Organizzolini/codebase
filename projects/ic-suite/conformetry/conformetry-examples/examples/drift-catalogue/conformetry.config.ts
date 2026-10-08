import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/drift-catalogue";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "One template, and one instance per kind of drift it catches",
    inputs: {
      name: { description: "Widget name in kebab-case", type: "string" },
    },
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "widget",
    templatePath: `${EXAMPLE_PATH}/templates/widget`,
  },
];

export default conformetryConfiguration;
