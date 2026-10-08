import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { OLatinLetterCharacteristicsService } from "./o-latin-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the O as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x02y650a90",
    names: [
      "Southeast",
      "SoutheastQuarter",
      "SoutheastHalf",
      "SoutheastThreeQuarter",
      "Southwest",
      "SouthwestQuarter",
      "SouthwestHalf",
      "SouthwestThreeQuarter",
      "Northeast",
      "NortheastQuarter",
      "NortheastHalf",
      "NortheastThreeQuarter",
      "Northwest",
      "NorthwestQuarter",
      "NorthwestHalf",
      "NorthwestThreeQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias:
      "the Greek Ο (omicron), the katakana ロ (ro), the hanzi 口 (kou), the hangul ㅁ (mieum), the Hebrew ם (final mem), and the isolated Arabic ه (heh) and ة (teh marbuta)",
    names: [
      "Southeast",
      "SoutheastQuarter",
      "SoutheastHalf",
      "SoutheastThreeQuarter",
      "Southwest",
      "SouthwestQuarter",
      "SouthwestHalf",
      "SouthwestThreeQuarter",
      "Northeast",
      "NortheastQuarter",
      "NortheastHalf",
      "NortheastThreeQuarter",
      "Northwest",
      "NorthwestQuarter",
      "NorthwestHalf",
      "NorthwestThreeQuarter",
    ],
  },
];

describe(OLatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    OLatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `o${name}LatinCount`),
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
