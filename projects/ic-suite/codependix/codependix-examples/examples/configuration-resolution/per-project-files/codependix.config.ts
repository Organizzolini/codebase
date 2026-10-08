/**
 * `projectDefaults` is what a project's own `codependix.config.ts` spreads —
 * the same pattern the real `configuration/codependix.config.ts` follows for
 * every project in this workspace.
 */
export const projectDefaults = {
  nxProjects: { markdown: { anchor: "example-nx" }, target: "markdown" },
};

export default {
  include: ["packages/*"],
};
