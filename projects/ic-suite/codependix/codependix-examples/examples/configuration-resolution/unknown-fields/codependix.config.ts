/**
 * Carries a field no released codependix has an opinion about.
 *
 * Zod strips unknown keys rather than rejecting them, so this still loads.
 */
export default {
  graphqlSchemas: { target: "markdown" },
  workspace: {
    nxProjects: { markdown: { anchor: "example-nx" }, target: "markdown" },
  },
};
