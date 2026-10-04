import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { WangHanziLetterCharacteristicsService } from "./wang-hanzi-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the 王 (hanzi wang) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y27102f102b10",
    names: [
      "Southeast",
      "SoutheastHalf",
      "Southwest",
      "SouthwestHalf",
      "Northeast",
      "NortheastHalf",
      "Northwest",
      "NorthwestHalf",
    ],
  },
  {
    fixture: "04x03y4440efd08880",
    names: [
      "SoutheastQuarter",
      "SoutheastThreeQuarter",
      "SouthwestQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NortheastThreeQuarter",
      "NorthwestQuarter",
      "NorthwestThreeQuarter",
    ],
  },
];

describe(WangHanziLetterCharacteristicsService, () => {
  const letter = letterHarness(
    WangHanziLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `wang${name}HanziCount`),
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
