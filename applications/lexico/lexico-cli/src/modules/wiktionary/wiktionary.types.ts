// 🏷️ Types

import type { categories } from "./wiktionary.constants";

/** Union of recognised Wiktionary Latin category keys (e.g. `"lemma"`, `"verb"`,
 * `"noun"`). Derived from the `categories` constant map. */
export type Category = keyof typeof categories;
