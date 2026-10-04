import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { YeoHangulLetterCharacteristicsService } from "./yeo-hangul-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the ㅕ (hangul yeo) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x04y0402d02d0080",
    names: ["Southeast", "SouthwestHalf", "Northeast", "NorthwestHalf"],
  },
  {
    fixture: "05x02y044002bb10",
    names: [
      "SoutheastQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "03x04y400e10e10800",
    names: ["SoutheastHalf", "Southwest", "NortheastHalf", "Northwest"],
  },
  {
    fixture: "05x02y2771008800",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestQuarter",
    ],
  },
];

describe(YeoHangulLetterCharacteristicsService, () => {
  const letter = letterHarness(
    YeoHangulLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `yeo${name}HangulCount`),
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
