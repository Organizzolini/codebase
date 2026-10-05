import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { JingHanziLetterCharacteristicsService } from "./jing-hanzi-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the 井 (hanzi jing) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x04y044002ff102ff1008800",
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

describe(JingHanziLetterCharacteristicsService, () => {
  const letter = letterHarness(
    JingHanziLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `jing${name}HanziCount`),
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
