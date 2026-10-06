import { Injectable } from "@nestjs/common";

import {
  CAPITAL_LETTER_PATTERN,
  COMBINING_MARKS_PATTERN,
} from "./literature.constants";

/** Normalizes words to the form the word cache is keyed by. */
@Injectable()
export class LiteratureWordNormalizationService {
  // 🏗 Dependency Injection

  public constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Escapes capitals as an underscore and the lowercase letter, matching how
   * the dictionary stores words whose case is meaningful.
   */
  public escapeCapitals(word: string): string {
    return word.replaceAll(
      CAPITAL_LETTER_PATTERN,
      (character) => `_${character.toLowerCase()}`,
    );
  }

  /** Strips diacritics, lowercases, and trims, so lookups ignore accents. */
  public normalize(value: string): string {
    return value
      .normalize("NFD")
      .replaceAll(COMBINING_MARKS_PATTERN, "")
      .toLowerCase()
      .trim();
  }
}
