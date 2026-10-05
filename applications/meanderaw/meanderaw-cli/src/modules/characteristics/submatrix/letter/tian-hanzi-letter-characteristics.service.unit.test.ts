import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { TianHanziLetterCharacteristicsService } from "./tian-hanzi-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the 田 (hanzi tian) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y6750efd0ab90",
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

describe(TianHanziLetterCharacteristicsService, () => {
  const letter = letterHarness(
    TianHanziLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `tian${name}HanziCount`),
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
});
