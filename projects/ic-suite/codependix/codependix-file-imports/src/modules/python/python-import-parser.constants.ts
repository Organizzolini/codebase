// ♟️ Constants

/** Matches a `from <dots><module> import ...` statement, joined onto one line. */
export const FROM_IMPORT_STATEMENT_PATTERN =
  /^from\s+(?<dots>\.*)(?<modulePath>[\w.]*)\s+import\s+.+$/u;

/** Matches a plain `import <specifiers>` statement, joined onto one line. */
export const IMPORT_STATEMENT_PATTERN = /^import\s+(?<specifiers>.+)$/u;

/** Pulls the dotted module path off one comma-separated `import` specifier. */
export const IMPORT_SPECIFIER_MODULE_PATTERN = /^(?<modulePath>[\w.]+)/u;

/** Matches a statement's first keyword, used to spot where one begins. */
export const IMPORT_START_PATTERN = /^(?:from|import)\b/u;
