import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { TavHebrewLetterCharacteristicsService } from "./tav-hebrew-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the ת (Hebrew tav) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "04x02y65008a10", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "03x03y250690800",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "04x02y25400a90", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "03x03y040690a10",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "04x02y06502980", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "03x03y400a50290",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "04x02y4610a900", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "03x03y610a50080",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(TavHebrewLetterCharacteristicsService, () => {
  const letter = letterHarness(
    TavHebrewLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `tav${name}HebrewCount`),
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
