// 🏷️ Types

/** Input to the markdown analysis step. */
export interface MarkdownInput {
  markdownFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from parsing markdown documents. */
export interface MarkdownResult {
  blockQuotes: number;
  codeBlocks: number;
  files: number;
  headingLevel1: number;
  headingLevel2: number;
  headingLevel3: number;
  headingLevel4: number;
  headingLevel5: number;
  headingLevel6: number;
  images: number;
  inlineCode: number;
  lines: number;
  links: number;
  listItems: number;
  lists: number;
  paragraphs: number;
  tableRows: number;
  tables: number;
  taskListItems: number;
  thematicBreaks: number;
}
