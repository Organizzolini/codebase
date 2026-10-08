// 🏷️ Types

import type {
  CodometerCommentLanguage,
  CodometerCommentMeasurement,
} from "@codometer/configuration";
import type { CodometerSeverity, CodometerSymbolKind } from "@codometer/core";
import type { CommentRange } from "typescript";
import type { LineCounter } from "yaml";

/** A run of comment lines a reader takes as one thought. */
export interface CommentBlock {
  tokens: CommentToken[];
}

/**
 * How long one comment or JSDoc block may run, carried as an explicit
 * argument rather than read off a resolved configuration object.
 *
 * Shaped to match the `comment` selector `@codometer/configuration` declares
 * — a `language`, a `kind`, and this same set of optional maxima plus
 * `severity` — so mapping one onto this is a direct field copy rather than a
 * translation.
 */
export interface CommentBudget {
  maximumCharacters: number | undefined;
  maximumLines: number | undefined;
  maximumWords: number | undefined;
  severity: CodometerSeverity;
}

/**
 * One `comment`-selector custom statistic's budget, and what it is over.
 *
 * Mirrors the selector field for field: `kind` names a documentable
 * declaration whose JSDoc is measured, `language` names the language whose
 * plain comment blocks are, and `undefined` on both means every language that
 * has comments — exactly as `CodometerCommentSelector` documents. A counter
 * naming both is measured as a `kind`: the whole list reaches both measurers,
 * and each selects from it by reading `kind`.
 *
 * Kept apart per statistic rather than merged into one budget per language or
 * kind, so two statistics naming the same one with different maxima each
 * count only their own breaches back against their own label.
 */
export interface CommentCounter {
  budget: CommentBudget;
  kind: CodometerSymbolKind | undefined;
  label: string;
  language: CodometerCommentLanguage | undefined;
}

/** One comment block, measured against one declared maximum. */
export type CommentMeasurement = CodometerCommentMeasurement;

/** One comment line, with where it sits and what it says. */
export interface CommentToken {
  /** 1-indexed line the comment is written on. */
  line: number;
  /** Whether nothing but whitespace precedes it on its line. */
  ownLine: boolean;
  /** The comment's prose, with its marker already stripped. */
  prose: string;
  /** The comment exactly as the file carries it, marker and all. */
  source: string;
}

/** One measurement, tagged with the custom statistic label that produced it. */
export interface LabeledCommentMeasurement {
  label: string;
  measurement: CommentMeasurement;
}

/**
 * The file lists comment measurement reads, one per language that has a
 * budget.
 *
 * Named here rather than taken from `DiscoveredLanguageFiles`, which would
 * point this module back at the one that depends on it. `languages` depends on
 * `comments` and never the reverse; a cycle between the two crashes the Nest
 * container outright rather than failing anything readable. The discovery
 * result satisfies this structurally, so callers pass it unchanged.
 */
export interface LanguageCommentFiles {
  cssFiles: string[];
  hclFiles: string[];
  shellFiles: string[];
  /** TypeScript and JavaScript sources, in every dialect the workspace holds. */
  sourceFiles: string[];
  sqlFiles: string[];
  tomlFiles: string[];
  yamlFiles: string[];
}

/** A comment token together with the file it was found in. */
export interface LocatedCommentToken extends CommentToken {
  file: string;
}

/** Arguments accepted when measuring one file's comment blocks. */
export interface MeasureCommentsArguments {
  comments: CommentBudget;
  filePath: string;
  tokens: CommentToken[];
}

/** Arguments accepted when measuring one comment's text directly. */
export interface MeasureCommentTextArguments {
  comments: CommentBudget;
  declaration: string;
  filePath: string;
  kind: string;
  line: number;
  /** The comment's prose, with every marker stripped. */
  prose: string;
  /** The comment exactly as the file carries it, markers and all. */
  source: string;
}

/** Arguments accepted when measuring every configured language's comments. */
export interface MeasureLanguageCommentsArguments {
  /** One `comment`-selector custom statistic's budget, per declared statistic. */
  counters: CommentCounter[];
  files: LanguageCommentFiles;
  /**
   * Python's comments, already found by its own analyzer.
   *
   * Python is read in Python: its analysis runs `tokenize` in a subprocess,
   * which knows a `#` inside a string literal from a real comment the way no
   * line scanner can. The tokens arrive here rather than the measurements, so
   * a word still means one thing across every language.
   */
  pythonComments: readonly LocatedCommentToken[];
  workingDirectory: string;
}

/**
 * A comment token with the offset YAML's tree walk needs to order it.
 *
 * The offset is not part of what a comment is — no other reader has one, and
 * Python's tokenizer reports positions rather than offsets — so it stays here
 * rather than on `CommentToken`.
 */
export interface PositionedToken {
  offset: number;
  token: CommentToken;
}

/**
 * One TypeScript or JavaScript file's in-progress scan.
 *
 * Keyed by position rather than held as a list, so a comment range found from
 * both a token's leading trivia and its predecessor's trailing trivia — the
 * same range read from either side of the gap between them — is kept once.
 */
export interface TypescriptCommentScan {
  content: string;
  ranges: Map<number, CommentRange>;
}

/** One YAML file's in-progress scan: the text, its lines, and what was found. */
export interface YamlCommentScan {
  content: string;
  lineCounter: LineCounter;
  tokens: PositionedToken[];
}
