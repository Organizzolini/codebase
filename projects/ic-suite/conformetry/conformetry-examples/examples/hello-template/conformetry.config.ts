import type { ConformetryConfiguration } from "@conformetry/configuration";

/**
 * Where this example's files sit, relative to the workspace root.
 *
 * Every path in a conformetry configuration is resolved against the directory
 * the command runs in, and these examples are documented as run from the
 * workspace root, so each one names itself once and builds its paths from that.
 */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/hello-template";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "The smallest generator there is: one template file",
    inputs: {
      name: { description: "Greeting name in kebab-case", type: "string" },
    },
    instances: [{ patterns: [`${EXAMPLE_PATH}/instances/*`] }],
    name: "hello",
    templatePath: `${EXAMPLE_PATH}/templates/hello`,
  },
];

export default conformetryConfiguration;
