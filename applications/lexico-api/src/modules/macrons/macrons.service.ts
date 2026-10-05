/* cspell:words unmacronized */

import { Injectable } from "@nestjs/common";

import { COMBINING_DIACRITICS_PATTERN } from "./macrons.constants";

/**
 * Handles Latin vowel-length marks (macrons) on text crossing the API boundary.
 */
@Injectable()
export class MacronsService {
  // 🏗 Dependency Injection

  public constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Removes macrons, and the other combining diacritics ingestion strips, so a
   * macronized query such as `amō` matches the stored, unmacronized `amo`.
   */
  public removeMacrons(value: string): string {
    return value.normalize("NFD").replaceAll(COMBINING_DIACRITICS_PATTERN, "");
  }
}
