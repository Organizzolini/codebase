import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/two-directions";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "A card: the document and its back",
    inputs: {
      name: { description: "Card name in kebab-case", type: "string" },
    },
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "card",
    templatePath: `${EXAMPLE_PATH}/templates/card`,
  },
  {
    description: "A panel: the document and its manifest",
    inputs: {
      name: { description: "Panel name in kebab-case", type: "string" },
    },
    instances: [],
    name: "panel",
    templatePath: `${EXAMPLE_PATH}/templates/panel`,
  },
];

export default conformetryConfiguration;
