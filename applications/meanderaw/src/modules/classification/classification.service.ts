import { Injectable } from "@nestjs/common";

import { STRUCTURAL_MINIMUM_ROWS } from "./classification.constants";

import type {
  BooleanCharacteristicKey,
  Characteristics,
} from "../characteristics/characteristics.types";
import type {
  MeanderFamily,
  MeanderFamilyRule,
  MeanderFiledShape,
  MeanderStructure,
} from "./classification.types";

/**
 * Decides which single family a meander belongs to from its measured
 * {@link Characteristics} record and shape, applying strict hierarchical
 * precedence:
 * `dots` -> `lines` -> `bars` -> `mesh` -> `comb` -> `arcade` -> `parallel` -> `cross` -> `fork` -> `tree` -> `boxes` -> `chain` -> `double-chain` -> `waterfalls` -> `whirl` -> `swirl` -> `clasps` -> `snake` -> `stipple` -> `unclassified`.
 *
 * Every rule is the family's own compound characteristic — `isDots`,
 * `isChain`, and so on, each an evaluator under `compound/` — gated by the
 * shallowest band the family's structure can exist in, which stays here
 * rather than in the predicate because it is a fact about the family, not
 * about the unit the predicate reads.
 *
 * `chain` and `double-chain` additionally refuse a reducible Code. Their
 * predicates compare run lengths against the repeating unit's width, where
 * the retired classifier compared them against the Code as filed; a Code
 * wider than its unit could never match there, and refusing it here keeps
 * that outcome.
 */
@Injectable()
export class ClassificationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether a repeat's family predicate holds and its band is deep enough for that family. */
  private holds(
    structure: MeanderStructure,
    key: BooleanCharacteristicKey,
    family: MeanderFamily,
  ): boolean {
    return (
      structure.characteristics[key] &&
      structure.rows >= STRUCTURAL_MINIMUM_ROWS[family]
    );
  }

  /** A rule that matches when {@link holds} does for the family's predicate. */
  private rule(
    key: BooleanCharacteristicKey,
    family: MeanderFamily,
  ): MeanderFamilyRule {
    return {
      matches: (structure) => this.holds(structure, key, family),
      name: family,
    };
  }

  /** A rule that matches like {@link rule}, and only for a Code that does not reduce to a narrower unit. */
  private unitRule(
    key: BooleanCharacteristicKey,
    family: MeanderFamily,
  ): MeanderFamilyRule {
    return {
      matches: (structure) =>
        !structure.isReducible && this.holds(structure, key, family),
      name: family,
    };
  }

  // 🌎 Public Methods

  /**
   * Classifies a meander into a single family based on hierarchical precedence.
   */
  classify(
    characteristics: Characteristics,
    shape: MeanderFiledShape,
  ): MeanderFamily {
    const structure: MeanderStructure = {
      ...shape,
      characteristics,
    };

    for (const rule of this.rules()) {
      if (rule.matches(structure)) {
        return rule.name;
      }
    }

    return "unclassified";
  }

  /**
   * Returns the family rules in descending precedence order.
   */
  rules(): readonly MeanderFamilyRule[] {
    return [
      this.rule("isDots", "dots"),
      this.rule("isLines", "lines"),
      this.rule("isBars", "bars"),
      this.rule("isMesh", "mesh"),
      this.rule("isComb", "comb"),
      this.rule("isArcade", "arcade"),
      this.rule("isParallel", "parallel"),
      this.rule("isCross", "cross"),
      this.rule("isFork", "fork"),
      this.rule("isPureTree", "tree"),
      this.rule("isBoxes", "boxes"),
      this.unitRule("isChain", "chain"),
      this.unitRule("isDoubleChain", "double-chain"),
      this.rule("isWaterfalls", "waterfalls"),
      this.rule("isWhirl", "whirl"),
      this.rule("isSwirl", "swirl"),
      this.rule("isClasps", "clasps"),
      this.rule("isSnake", "snake"),
      this.rule("isStippled", "stipple"),
    ];
  }
}
