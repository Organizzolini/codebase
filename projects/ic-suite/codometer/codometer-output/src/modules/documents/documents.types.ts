// 🏷️ Types

/** Where a rendered section should land. */
export interface DocumentDestination {
  /** Markdown file to splice the section into, between its markers. */
  markdown: string | undefined;
  /** File to write the section to on its own. */
  output: string | undefined;
}

/** The HTML comments delimiting one report's section inside a document. */
export interface DocumentMarkers {
  end: string;
  start: string;
}

/** Arguments for wrapping a rendered body and putting it where it was asked for. */
export interface EmitArguments {
  /** The report's rendered body, without its markers. */
  body: string;
  destination: DocumentDestination;
  /** Names the report in log messages, so several reports stay distinguishable. */
  label: string;
  markers: DocumentMarkers;
}
