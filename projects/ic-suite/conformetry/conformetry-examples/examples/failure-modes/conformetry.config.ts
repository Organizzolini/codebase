import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/failure-modes";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "A template comment marked TODO, which any comment satisfies",
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    // Both generators claim these paths, and only one group declares them —
    // see the ambiguous-attribution example for why saying it twice reports
    // every finding twice.
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "todo-comment",
    templatePath: `${EXAMPLE_PATH}/templates/todo-comment`,
  },
  {
    description: "A template asking for a value nobody supplies",
    // `owner` is deliberately absent: not declared as an input here, and not
    // named in the instance group's substitutions above. Rendering refuses
    // rather than quietly writing an empty string, which is what this half of
    // the example reproduces.
    inputs: {
      name: { description: "Module name in kebab-case", type: "string" },
    },
    instances: [],
    name: "missing-input",
    templatePath: `${EXAMPLE_PATH}/templates/missing-input`,
  },
];

export default conformetryConfiguration;
