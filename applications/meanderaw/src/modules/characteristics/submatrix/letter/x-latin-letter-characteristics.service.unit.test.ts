import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { XLatinLetterCharacteristicsService } from "./x-latin-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the X as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y04002f100800",
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
    alias: "the Greek Χ (chi) and the hanzi 十 (shi)",
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

describe(XLatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    XLatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `x${name}LatinCount`),
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
