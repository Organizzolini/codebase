import { Injectable } from "@nestjs/common";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit carries no ink at all, rendering purely
 * as bare dots — the dots family's whole-grid template.
 */
@Injectable()
export class IsDotsCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isDots` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether every digit of the repeating unit is 0, so no two lattice points connect and the band renders as bare dots.",
    formula: String.raw`\forall d \in \text{digits},\ d = \text{0}`,
    key: "isDots",
    name: "Is Dots",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks every digit of the unit is `0`. */
  public compute(context: CharacteristicContext): boolean {
    return /^0+$/u.test(context.code.digits);
  }
}
