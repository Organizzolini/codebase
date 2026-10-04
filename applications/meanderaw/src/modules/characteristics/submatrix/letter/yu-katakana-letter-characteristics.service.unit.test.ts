import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { YuKatakanaLetterCharacteristicsService } from "./yu-katakana-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the ユ (katakana yu) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "04x02y25002b10", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "03x03y440e90800",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "04x02y27100a10", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "03x03y0406d0880",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "04x02y06102b10", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "03x03y400e50880",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "04x02y27102900", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "03x03y440ad0080",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  { alias: "the Hebrew ב (bet)", names: ["Southeast", "NorthwestHalf"] },
];

describe(YuKatakanaLetterCharacteristicsService, () => {
  const letter = letterHarness(
    YuKatakanaLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `yu${name}KatakanaCount`),
    );
  });

  it("draws every orientation name in exactly one fixture", () => {
    expect(ORIENTATIONS.flatMap(({ names }) => names).toSorted()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.toSorted(),
    );
  });

  it.each(ORIENTATIONS)(
    "counts $fixture once under each of $names and under no other name",
    ({ fixture, names }) => {
      expect(letter.counts(fixture)).toStrictEqual(expectedCounts(names));
    },
  );

  it.each(ORIENTATIONS)(
    "sizes the window of each of $names to the ink of $fixture",
    ({ fixture, names }) => {
      expect(letter.windows(names)).toStrictEqual(
        names.map(() => letter.inkedWindow(fixture)),
      );
    },
  );

  it.each(ALIASES)("lists $alias on exactly $names", ({ alias, names }) => {
    expect(letter.namesDescribing(alias)).toStrictEqual(names);
  });
});
