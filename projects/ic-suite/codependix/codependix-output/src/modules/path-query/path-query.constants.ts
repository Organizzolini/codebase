import {
  FORMAT_JSON,
  FORMAT_MARKDOWN,
} from "../combined-output/combined-output.constants";

// ♟️ Constants

/** Arrow connecting successive nodes in a Markdown path. */
export const PATH_ARROW = " → ";

/** What `--format mermaid` prints: each active graph type rendered as a mermaid flowchart. */
export const FORMAT_MERMAID = "mermaid";

/** Formats accepted by the path command's `--format` flag. */
export const PATH_FORMAT_NAMES = [
  FORMAT_JSON,
  FORMAT_MARKDOWN,
  FORMAT_MERMAID,
] as const;

/** Header declaring the mermaid diagram type for path rendering. */
export const PATH_MERMAID_HEADER = "graph LR";

/**
 * Message rendered when no connecting path exists between two nodes.
 */
export const buildNoPathMessage = (from: string, to: string): string =>
  `_No path connects "${from}" to "${to}"._`;
