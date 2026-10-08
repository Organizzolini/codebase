// ♟️ Constants

/**
 * Directory entry holding git's own database, never measured.
 *
 * Skipped by name rather than by an ignore rule: `.gitignore` never mentions
 * it, because git has no need to ignore what it never looks at.
 */
export const GIT_DIRECTORY_NAME = ".git";

/** File name a directory's own gitignore-syntax rules are read from. */
export const GITIGNORE_FILE_NAME = ".gitignore";

/**
 * Glob suffix claiming everything beneath the directory a pattern names.
 *
 * A pattern ending in it excludes every descendant without exception, which
 * is what makes the directory safe to skip rather than walk and discard.
 */
export const RECURSIVE_GLOB_SUFFIX = "/**";

/** File extensions treated as TypeScript source. */
export const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

/** File extensions treated as JavaScript source. */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** File extensions treated as markdown prose. */
export const MARKDOWN_EXTENSIONS = new Set([".markdown", ".md", ".mdx"]);

/**
 * File extensions treated as JSON data.
 *
 * `.ipynb` is deliberately absent: a notebook is JSON on disk, but measuring
 * it here would report a document whose cells nobody wrote by hand as prose
 * and code. The jupyter analyzer takes notebooks apart instead.
 */
export const JSON_EXTENSIONS = new Set([".json", ".jsonc", ".jsonl"]);

/** File extensions treated as CSS stylesheets. */
export const CSS_EXTENSIONS = new Set([".css"]);

/** File extensions treated as HCL, the Terraform configuration language. */
export const HCL_EXTENSIONS = new Set([".hcl", ".tf", ".tfvars"]);

/** File extensions treated as shell scripts. */
export const SHELL_EXTENSIONS = new Set([".bash", ".sh", ".zsh"]);

/** File extensions treated as SQL scripts. */
export const SQL_EXTENSIONS = new Set([".sql"]);

/** File extensions treated as TOML documents. */
export const TOML_EXTENSIONS = new Set([".toml"]);

/** File extensions treated as YAML documents. */
export const YAML_EXTENSIONS = new Set([".yaml", ".yml"]);

/** File extensions treated as Jupyter notebooks. */
export const NOTEBOOK_EXTENSIONS = new Set([".ipynb"]);

/** Regex matching test and spec file names. */
export const TEST_FILE_REGEX =
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/;
