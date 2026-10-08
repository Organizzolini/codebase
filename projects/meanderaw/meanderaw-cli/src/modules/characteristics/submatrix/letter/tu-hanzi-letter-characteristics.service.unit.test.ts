import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { TuHanziLetterCharacteristicsService } from "./tu-hanzi-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the 凸 (hanzi tu) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x03y0650069a50a3390",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
  {
    fixture: "04x04y6500ca50c690a900",
    names: [
      "SoutheastQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "05x03y63350a56900a900",
    names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
  },
  {
    fixture: "04x04y065069c0a5c00a90",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestQuarter",
    ],
  },
];

describe(TuHanziLetterCharacteristicsService, () => {
  const letter = letterHarness(
    TuHanziLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `tu${name}HanziCount`),
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
