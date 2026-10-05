import { Injectable } from "@nestjs/common";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit is only unbroken horizontal lines across
 * every row — the lines family's whole-grid template.
 */
@Injectable()
export class IsLinesCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isLines` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether every digit of the repeating unit is 3, so every row is one unbroken horizontal line.",
    formula: String.raw`\forall d \in \text{digits},\ d = \text{3}`,
    key: "isLines",
    name: "Is Lines",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks every digit of the unit is `3`. */
  public compute(context: CharacteristicContext): boolean {
    return /^3+$/u.test(context.code.digits);
  }
}
