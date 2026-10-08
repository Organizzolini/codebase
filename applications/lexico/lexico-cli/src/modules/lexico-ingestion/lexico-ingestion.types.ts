// 🏷️ Types

/**
 * One entry an interactive option prompt offers.
 */
export interface CommandOptionChoice {
  title: string;
  value: string;
}

/**
 * A string-valued flag as nest-commander hands it to `run`: the text given,
 * `true` when the flag was passed bare (`--author`), or absent when omitted.
 */
export type CommandOptionValue = boolean | null | string | undefined;

/**
 * Optional booleans that decide which root ingestion stages execute.
 */
export interface LexicoIngestionCommandOptions {
  dictionary?: boolean;
  library?: boolean;
  librarySources?: boolean;
  literature?: boolean;
  wikipedia?: boolean;
}

/**
 * Inputs for asking the user to pick one choice for a missing flag value.
 */
export interface SelectChoiceArguments {
  choices: CommandOptionChoice[];
  message: string;
  noSelectionTitle: string;
}

/**
 * Cached Wiktionary entry metadata. `html` is populated after the article body
 * has been fetched and written to disk.
 */
export interface WiktionaryPage {
  category: string;
  href: string;
  html?: string;
  word: string;
}
