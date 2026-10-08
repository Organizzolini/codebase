import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/language-validators";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "One file per validator, plus two no validator claims",
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "polyglot",
    templatePath: `${EXAMPLE_PATH}/templates/polyglot`,
  },
];

export default conformetryConfiguration;
