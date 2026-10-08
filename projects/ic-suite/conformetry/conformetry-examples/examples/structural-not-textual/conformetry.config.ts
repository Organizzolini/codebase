import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/structural-not-textual";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description:
      "Two instances of one template: reformatting passes, a lost export does not",
    inputs: {
      name: { description: "Report name in kebab-case", type: "string" },
    },
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "report",
    templatePath: `${EXAMPLE_PATH}/templates/report`,
  },
];

export default conformetryConfiguration;
