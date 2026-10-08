// ♟️ Constants

import { InputError } from "@codependix/configuration";

import type { ResolvedCodependixSelection } from "@codependix/configuration";

/**
 * A `--projects`/`--tags` selection that matched no project at all.
 *
 * Refused rather than run, whatever the mode: a misspelled name would
 * otherwise judge nothing and pass — a green gate that checked nothing — and
 * draw the Workspace Graph over no project. Every pattern is named, since
 * the run cannot tell which of them was the typo.
 */
export const emptySelectionError = (
  selection: ResolvedCodependixSelection,
): InputError => {
  const patterns = [
    ...(selection.projects.length > 0
      ? [`--projects ${selection.projects.join(",")}`]
      : []),
    ...(selection.tags.length > 0
      ? [`--tags ${selection.tags.join(",")}`]
      : []),
  ];

  return new InputError(
    `${patterns.join(" and ")} matched no project, so there is nothing to judge or draw.`,
  );
};
