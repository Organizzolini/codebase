import { describe, expect, it } from "vitest";

import {
  AdjectiveInflection,
  AdverbInflection,
  Inflection,
  Lexeme,
  NounInflection,
  PrepositionInflection,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";

import { AdjectiveInflectionType } from "./adjective-inflection.entities";
import { AdverbInflectionType } from "./adverb-inflection.entities";
import { toInflectionType } from "./inflections.utilities";
import { NounInflectionType } from "./noun-inflection.entities";
import { PrepositionInflectionType } from "./preposition-inflection.entities";
import { UninflectedInflectionType } from "./uninflected-inflection.entities";
import { VerbInflectionType } from "./verb-inflection.entities";

/** Gives an inflection entity an id and its lexeme join. */
function withDatabaseColumns<Entity extends Inflection>(
  inflection: Entity,
): Entity {
  return Object.assign(inflection, {
    id: "inflection-1",
    lexeme: new Lexeme(),
  });
}

describe(toInflectionType, () => {
  it.each([
    {
      expected: { declension: "third", gender: "masculine" },
      inflection: Object.assign(new NounInflection(), {
        declension: "third",
        gender: "masculine",
      }),
      type: NounInflectionType,
    },
    {
      expected: { conjugation: "first", other: "deponent" },
      inflection: Object.assign(new VerbInflection(), {
        conjugation: "first",
        other: "deponent",
      }),
      type: VerbInflectionType,
    },
    {
      expected: { declension: "first/second", degree: "comparative" },
      inflection: Object.assign(new AdjectiveInflection(), {
        declension: "first/second",
        degree: "comparative",
      }),
      type: AdjectiveInflectionType,
    },
    {
      expected: { adverbType: "descriptive", degree: "positive" },
      inflection: Object.assign(new AdverbInflection(), {
        adverbType: "descriptive",
        degree: "positive",
      }),
      type: AdverbInflectionType,
    },
    {
      expected: { case: "ablative", other: undefined },
      inflection: Object.assign(new PrepositionInflection(), {
        case: "ablative",
      }),
      type: PrepositionInflectionType,
    },
    {
      expected: {},
      inflection: new UninflectedInflection(),
      type: UninflectedInflectionType,
    },
  ])(
    "maps a $type.name with its own fields and not its lexeme",
    ({ expected, inflection, type }) => {
      expect.hasAssertions();

      const mapped = toInflectionType(withDatabaseColumns(inflection));

      expect(mapped).toBeInstanceOf(type);
      expect(mapped).toStrictEqual(
        Object.assign(new type(), { ...expected, id: "inflection-1" }),
      );
    },
  );

  it("refuses an inflection of no known kind rather than return an unresolvable type", () => {
    expect.hasAssertions();

    expect(() =>
      toInflectionType(withDatabaseColumns(new Inflection())),
    ).toThrow(
      "Inflection inflection-1 has no GraphQL type for its class Inflection",
    );
  });
});
