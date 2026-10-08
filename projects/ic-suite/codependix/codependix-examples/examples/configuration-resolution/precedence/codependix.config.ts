/**
 * The TypeScript configuration file, which wins over the JSON one beside it
 * because `CONFIGURATION_FILE_NAMES` searches for it first.
 */
export default {
  include: ["packages/*", "codependix-*"],
  workspace: {
    nxProjects: { markdown: { anchor: "example-nx" }, target: "markdown" },
  },
};
