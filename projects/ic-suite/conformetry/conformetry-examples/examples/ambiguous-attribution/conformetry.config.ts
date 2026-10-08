import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/ambiguous-attribution";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "A two-file template: the document, and its notes",
    inputs: {
      name: { description: "Document name in kebab-case", type: "string" },
    },
    // Both templates claim these paths, and only one group declares them. A
    // run unions every generator's groups into one list of paths, so the same
    // glob written twice locates the same path twice and every finding about
    // it is reported once per group. Which template explains a path is
    // inferred either way, so saying it once is enough.
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "overview",
    templatePath: `${EXAMPLE_PATH}/templates/overview`,
  },
  {
    description: "A two-file template: the document, and its summary",
    inputs: {
      name: { description: "Document name in kebab-case", type: "string" },
    },
    instances: [],
    name: "digest",
    templatePath: `${EXAMPLE_PATH}/templates/digest`,
  },
];

export default conformetryConfiguration;
