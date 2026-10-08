// 🏷️ Types

// What resolution produced, as opposed to what a configuration asked for.
// This half reads the authoring vocabulary and nothing reads it back, so the
// two sides cannot form a cycle — the same arrangement `statistics.types.ts`
// keeps for the measurement half.

import type {
  CodometerAnalysis,
  CodometerCommentLanguage,
  CodometerCompression,
  CodometerFormat,
  CodometerSymbolMatcher,
} from "./configuration.types";
import type { WriteMarkdownOutput } from "./output.types";
import type {
  CodometerSeverity,
  CodometerStatisticGroup,
  CodometerSymbolKind,
} from "@codometer/core";

/**
 * A resolved configuration and the file it was resolved from.
 *
 * `path` stays `undefined` when the upward walk reached the filesystem root
 * without finding a file, which is legal and leaves every default in place.
 */
export interface LoadedConfiguration {
  configuration: ResolvedCodometerConfiguration;
  path: string | undefined;
}

/** A `comment` selector with its severity filled in. */
export interface ResolvedCodometerCommentSelector {
  kind: CodometerSymbolKind | undefined;
  language: CodometerCommentLanguage | undefined;
  maximumCharacters: number | undefined;
  maximumLines: number | undefined;
  maximumWords: number | undefined;
  severity: CodometerSeverity;
}

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has
 * to know which fields a configuration file may omit.
 */
export interface ResolvedCodometerConfiguration {
  /** Every counter this configuration measures, with defaults applied. */
  custom: ResolvedCodometerCustomStatistic[];
  /** Stays `undefined` when nothing named one, so every path must qualify. */
  defaultInput: string | undefined;
  exclude: string[];
  excludeFrom: string[];
  format: CodometerFormat;
  inputs: ResolvedCodometerInput[];
  limits: ResolvedCodometerLimit[];
  outputs: ResolvedCodometerOutput[];
  python: ResolvedCodometerPythonConfiguration;
}

/** A configured counter with its badge color and group filled in. */
export interface ResolvedCodometerCustomStatistic {
  color: string;
  comment: ResolvedCodometerCommentSelector | undefined;
  group: CodometerStatisticGroup;
  label: string;
  /** Empty for a symbol or comment counter naming none, which then searches every file. */
  patterns: string[];
  symbols?: CodometerSymbolMatcher | undefined;
}

/**
 * A named set of files with its compression filled in and its negations
 * collected.
 *
 * `include` holds only patterns that add files and `exclude` only patterns
 * that remove them, whichever list they were authored in. Order carries no
 * meaning in either: a file is in the input when some include glob claims it
 * and no exclude glob does.
 */
export interface ResolvedCodometerInput {
  analyses: CodometerAnalysis[];
  compression: CodometerCompression;
  /** `"."` when the input never named one, meaning the process's working directory. */
  directory: string;
  exclude: string[];
  include: string[];
  name: string;
}

/** JSON output destination with defaults applied. */
export interface ResolvedCodometerJsonOutput {
  custom: ResolvedCodometerCustomStatistic[];
  indentation: number;
  path: string;
  type: "json";
}

/**
 * A limit with its severity filled in and its value read as a number.
 *
 * The unit is gone by this point: a limit written `"8 KB"` arrives here as
 * 8000, so nothing downstream has to know that limits can be written with
 * units at all.
 */
export interface ResolvedCodometerLimit {
  /** Stays `undefined` when none was written; a report falls back to the path. */
  label: string | undefined;
  metric: string;
  severity: CodometerSeverity;
  value: number;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `write` stays `undefined` when the configuration supplies none: the
 * built-in rendering and writing live in the CLI that calls it, so "unset" is
 * what selects it rather than a default named here.
 */
export interface ResolvedCodometerMarkdownOutput {
  custom: ResolvedCodometerCustomStatistic[];
  description: string | undefined;
  endMarker: string;
  path: string | undefined;
  startMarker: string;
  type: "markdown";
  write: undefined | WriteMarkdownOutput;
}

/** Destination the measured statistics are written to, with defaults applied. */
export type ResolvedCodometerOutput =
  | ResolvedCodometerJsonOutput
  | ResolvedCodometerMarkdownOutput;

/** Python analysis settings with defaults applied. */
export interface ResolvedCodometerPythonConfiguration {
  command: string;
}
