// 🏷️ Types

import type {
  MeasureCommandOptions,
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  WriteMarkdownOutput,
} from "@codometer/configuration";

/** Arguments accepted when listing the files a run writes. */
export interface ListOutputPathsArguments {
  destinations: RunDestinations;
  workingDirectory: string;
}

/** Arguments accepted when resolving where each output goes. */
export interface ResolveDestinationsArguments {
  configuration: ResolvedCodometerConfiguration;
  options: MeasureCommandOptions;
  workingDirectory: string;
}

/** Every file one run writes, and the destinations found along the way. */
export interface ResolveDestinationsResult {
  destinations: RunDestinations;
  errors: string[];
}

/** A JSON output destination, resolved for this run. */
export interface ResolvedJsonDestination {
  custom: ResolvedCodometerCustomStatistic[];
  indentation: number;
  path: string;
}

/** A markdown output destination, resolved for this run. */
export interface ResolvedMarkdownDestination {
  custom: ResolvedCodometerCustomStatistic[];
  description: string | undefined;
  endMarker: string;
  path: string | undefined;
  startMarker: string;
  // Carried so a destination is a `ResolvedCodometerMarkdownOutput` in its own
  // right, which is what `@codometer/output` renders. A resolved destination is
  // always the markdown one — the field says which entry shape it came from,
  // not which of several it might be.
  type: "markdown";
  write: undefined | WriteMarkdownOutput;
}

/**
 * Every file one run writes.
 *
 * Two independent sinks: `json` is the report, and `markdown` is the badge
 * block spliced between two markers in a file somebody else wrote the rest
 * of. Neither says anything about standard output — that is `format`'s job
 * alone, so no destination can print a second document over the one a
 * pipeline was reading.
 */
export interface RunDestinations {
  json: ResolvedJsonDestination | undefined;
  markdown: ResolvedMarkdownDestination | undefined;
}
