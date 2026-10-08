// ♟️ Constants

import type { SkillExclusionFile } from "./skill-exclusions.types";

/**
 * Body of the comment opening the generated block.
 *
 * A label rather than a whole marker, because each file prefixes it with its
 * own comment syntax: `#` for the four line-oriented ignore files and YAML,
 * `//` for JSONC.
 */
export const BLOCK_START_LABEL = "installed-skills-start";

/** Body of the comment closing the generated block. */
export const BLOCK_END_LABEL = "installed-skills-end";

/**
 * The files that must name every installed skill.
 *
 * Every other tool in the repository scopes itself with explicit globs that
 * never include `.agents/`, so these five are the whole list. Adding a sixth
 * means adding its markers to the file in the same change.
 */
export const SKILL_EXCLUSION_FILES: SkillExclusionFile[] = [
  {
    commentPrefix: "#",
    filePath: ".gitattributes",
    renderEntry: (skillName) =>
      `.agents/skills/${skillName}/** linguist-vendored`,
    tool: "Linguist",
  },
  {
    commentPrefix: "#",
    filePath: "configuration/.codometerignore",
    renderEntry: (skillName) => `.agents/skills/${skillName}/`,
    tool: "codometer",
  },
  {
    // markdownlint reads its ignore globs from a JSONC array, so an entry is a
    // quoted string element carrying the array's indentation and a trailing
    // comma, and the markers are `//` comments rather than `#` ones.
    commentPrefix: "//",
    filePath: "configuration/.markdownlint-cli2.jsonc",
    renderEntry: (skillName) => `    ".agents/skills/${skillName}/**",`,
    tool: "markdownlint",
  },
  {
    // Prettier resolves ignore patterns relative to the ignore file, hence the
    // leading `**/`.
    commentPrefix: "#",
    filePath: "configuration/.prettierignore",
    renderEntry: (skillName) => `**/.agents/skills/${skillName}/**`,
    tool: "prettier",
  },
  {
    // cspell reads its ignore globs from a YAML sequence, so an entry is a
    // list item at the sequence's indentation. The leading `**/` matches the
    // prettier pattern: cspell resolves globs relative to its configuration
    // file too.
    commentPrefix: "#",
    filePath: "configuration/cspell.config.yaml",
    renderEntry: (skillName) => `  - "**/.agents/skills/${skillName}/**"`,
    tool: "cspell",
  },
];
