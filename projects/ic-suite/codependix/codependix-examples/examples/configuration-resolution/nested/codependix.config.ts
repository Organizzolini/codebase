/**
 * Sits at the fixture workspace root, which the upward search reaches past a
 * nested project's own `package.json`.
 */
export default {
  include: ["packages/*"],
  workspace: {
    nxProjects: { markdown: { anchor: "example-nx" }, target: "markdown" },
  },
};
