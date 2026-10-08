// 🏷️ Types

import type {
  CommentCounter,
  CommentMeasurement,
} from "../comments/comments.types";
import type {
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "@codometer/core";
import type { SourceFile } from "typescript";

/** Arguments for analyzing a single source file. */
export interface AnalyzeTypescriptFileArguments {
  commentCounters: CommentCounter[];
  counters: TypescriptSymbolCounter[];
  filePath: string;
  stats: TypescriptResult;
  workingDirectory: string;
}

/** Everything one walk of one file's AST needs to carry down the tree. */
/**
 * Everything one node's JSDoc measurement needs, gathered before any counting.
 *
 * Exists so `DeclarationCommentsService.measure` can stay inside this
 * repository's statement budget without putting a helper on the measuring path
 * itself, where it would deepen the stack the depth gate holds.
 */
export interface PreparedDeclarationComment {
  counters: CommentCounter[];
  declaration: string;
  kind: CodometerSymbolKind;
  line: number;
  prose: string;
  source: string;
}

/** Input to the TypeScript/JavaScript AST analysis step. */
export interface TypescriptInput {
  /**
   * Every `comment`-selector custom statistic's budget, per declared statistic.
   *
   * The whole list, not only the counters this walk measures: a counter naming
   * a documentable `kind` is one of those and every other one is ignored here,
   * which is what leaves a configuration declaring no such statistic measuring
   * nothing rather than measuring against a limit nobody chose.
   */
  commentCounters: CommentCounter[];
  sourceFiles: string[];
  /** Configured counters over declarations, tallied during the same walk. */
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/** Aggregated metrics collected from walking TypeScript and JavaScript ASTs. */
export interface TypescriptResult {
  asyncFunctions: number;
  blockComments: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  /** One measurement list per configured declaration-comment counter, keyed by its label. */
  declarationCommentCounts: Record<string, CommentMeasurement[]>;
  decorators: number;
  docComments: number;
  docTags: Record<string, number>;
  enums: number;
  exported: number;
  externalPackages: Set<string>;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  lineComments: number;
  lines: number;
  methods: number;
  /** One tally per configured symbol counter, keyed by its label. */
  symbolCounts: Record<string, number>;
  syncFunctions: number;
  testFiles: number;
  todos: number;
  tsFiles: number;
}

/** One configured counter over declarations, resolved for the analyzer. */
export interface TypescriptSymbolCounter {
  kinds: CodometerSymbolKind[];
  label: string;
  modifiers: CodometerSymbolModifier[];
  /** Globs narrowing which files are searched; empty searches all of them. */
  patterns: string[];
}

/**
 * What one file's AST walk carries with it, node to node.
 *
 * Narrowed once per file rather than rebuilt per node: which counters search a
 * file depends on its path, and the path does not change as the walk descends.
 */
export interface TypescriptWalkContext {
  commentCounters: CommentCounter[];
  /**
   * The symbol counters that apply to the file being walked.
   *
   * Narrowed once per file rather than per node: which counters search a file
   * depends on its path, which does not change as the walk descends.
   */
  counters: TypescriptSymbolCounter[];
  filePath: string;
  insideClass: boolean;
  sourceFile: SourceFile;
  stats: TypescriptResult;
}
