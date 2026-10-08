import type { ConformetryConfiguration } from "@conformetry/configuration";

/** Where this example's files sit, relative to the workspace root. */
const EXAMPLE_PATH =
  "projects/ic-suite/conformetry/conformetry-examples/examples/case-variants";

const conformetryConfiguration: ConformetryConfiguration = [
  {
    description: "Every derived case variant, in file paths and file contents",
    inputs: {
      name: { description: "Component name in kebab-case", type: "string" },
      // Declaring a derived variant as an input is what lets a caller override
      // it. Conformetry derives all four case variants from `name`, and an
      // explicit value of the same name always wins over the derived one.
      nameCamelCase: {
        description: "Camel-case name, overriding the derived variant",
        type: "string",
      },
      owner: { description: "Owning team", type: "string" },
    },
    instances: [
      {
        patterns: [`${EXAMPLE_PATH}/instances/*`],
        // `owner` is a plain substitution: the template asks for it and nothing
        // derives it, so this group is where its value comes from.
        //
        // `nameCamelCase` is the interesting one. Conformetry derives all four
        // case variants from the instance's own directory name, which would
        // make this one `searchBar` — and an explicit value of the same name
        // wins, so `spelledOutByHand` is what both the generator renders and
        // validation expects.
        substitutions: { nameCamelCase: "spelledOutByHand", owner: "platform" },
      },
    ],
    name: "case-variants",
    templatePath: `${EXAMPLE_PATH}/templates/case-variants`,
  },
];

export default conformetryConfiguration;
