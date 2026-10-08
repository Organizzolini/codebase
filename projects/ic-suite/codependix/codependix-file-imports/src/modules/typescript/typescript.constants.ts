// ♟️ Constants

/** Extension a program's root files carry when they are declaration-only. */
export const DECLARATION_FILE_EXTENSION = ".d.ts";

/** Header declaring the mermaid diagram type and its default layout direction. */
export const TYPESCRIPT_IMPORT_GRAPH_MERMAID_HEADER = "graph LR";

/** Rendered in place of a diagram for a project with no internal file imports. */
export const TYPESCRIPT_IMPORT_GRAPH_UNCONNECTED =
  "_This project has no internal file imports._";

/** File name a project must carry to be discovered as a TypeScript project. */
export const TYPESCRIPT_PROJECT_CONFIG_FILE = "tsconfig.json";

// 🚨 Errors

/**
 * Raised when a project's `tsconfig.json` cannot be parsed.
 *
 * Parsing failures are fatal rather than skipped: a project silently dropped
 * from the export makes `codependix map --check` unable to tell a genuinely empty
 * import graph from one it never actually built.
 */
export class TypescriptProjectConfigurationError extends Error {
  constructor(args: { configurationPath: string; messages: string[] }) {
    super(
      `Could not read ${args.configurationPath}: ${args.messages.join("; ")}`,
    );
    this.name = "TypescriptProjectConfigurationError";
  }
}
