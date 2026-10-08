import { projectDefaults } from "../../codependix.config.js";

/**
 * Spreads the workspace root's `projectDefaults`, then overrides `nxProjects`
 * outright — its `markdown` destination is gone, not merged with the one
 * `projectDefaults` carried.
 */
export default {
  ...projectDefaults,
  nxProjects: { json: { path: "codependix-nx-graph.json" }, target: "json" },
};
