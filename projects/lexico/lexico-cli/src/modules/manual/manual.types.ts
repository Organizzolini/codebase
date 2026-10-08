// 🏷️ Types

/**
 * A stale manual lexeme entry to remove before re-ingesting curated content.
 */
export interface ManualDeletionLexeme {
  readonly disambiguator: number;
  readonly lemma: string;
}

/**
 * Praenomen abbreviation metadata used to generate manual lexeme variants.
 */
export interface ManualPraenomenAbbreviation {
  readonly feminine?: string;
  readonly masculine?: string;
}
