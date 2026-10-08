// 🏷️ Types

/**
 * One file that has to name every installed skill, and how it names them.
 *
 * The five tools that reach `.agents/` each have their own ignore syntax, and
 * each list one skill per line rather than excluding `.agents/skills/`
 * wholesale — that is what keeps this repository's own skills in the same
 * directory formatted, measured, attributed, spell-checked, and markdown-linted.
 */
export interface SkillExclusionFile {
  /**
   * How this file opens a comment, so the markers delimiting the generated
   * block are a comment in its own syntax rather than a syntax error. Four of
   * the five files take `#`; `.markdownlint-cli2.jsonc` is JSONC and takes `//`.
   */
  readonly commentPrefix: string;
  /** Path relative to the workspace root. */
  readonly filePath: string;
  /** Renders the line one skill needs, in this file's own syntax. */
  readonly renderEntry: (skillName: string) => string;
  /** What the entries exist to keep the skills out of. */
  readonly tool: string;
}
