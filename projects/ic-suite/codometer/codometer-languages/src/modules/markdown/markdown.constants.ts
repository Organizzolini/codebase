// ♟️ Constants

import type { MarkdownResult } from "./markdown.types";

export const EMPTY_MARKDOWN_RESULT: MarkdownResult = {
  blockQuotes: 0,
  codeBlocks: 0,
  files: 0,
  headingLevel1: 0,
  headingLevel2: 0,
  headingLevel3: 0,
  headingLevel4: 0,
  headingLevel5: 0,
  headingLevel6: 0,
  images: 0,
  inlineCode: 0,
  lines: 0,
  links: 0,
  listItems: 0,
  lists: 0,
  paragraphs: 0,
  tableRows: 0,
  tables: 0,
  taskListItems: 0,
  thematicBreaks: 0,
};

/**
 * Maps an mdast node type onto the result field that counts it.
 *
 * Headings and list items are absent because they need the node itself —
 * a heading to read its depth, a list item to see whether it is a checkbox.
 */
export const NODE_COUNTER_KEYS: Record<string, keyof MarkdownResult> = {
  blockquote: "blockQuotes",
  code: "codeBlocks",
  image: "images",
  imageReference: "images",
  inlineCode: "inlineCode",
  link: "links",
  linkReference: "links",
  list: "lists",
  paragraph: "paragraphs",
  table: "tables",
  tableRow: "tableRows",
  thematicBreak: "thematicBreaks",
};
