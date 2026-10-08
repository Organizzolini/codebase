// 🏷️ Types

/**
 * Command options for selectively clearing dictionary and literature data.
 */
export interface ClearCommandOptions {
  dictionary?: boolean;
  literature?: boolean;
}

/**
 * Prompt answers returned when clear options are interactively requested.
 */
export interface ClearPromptResponse {
  dictionary?: boolean;
  literature?: boolean;
}
