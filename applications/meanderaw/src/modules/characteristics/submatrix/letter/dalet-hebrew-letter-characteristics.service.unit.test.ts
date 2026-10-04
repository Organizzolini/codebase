import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { DaletHebrewLetterCharacteristicsService } from "./dalet-hebrew-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the ד (Hebrew dalet) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "05x02y2731008000", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "03x04y0402d00c0080",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "05x02y0040023b10", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "03x04y400c00e10800",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "05x02y2371000800", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "03x04y0400c02d0080",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "05x02y040002b310", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "03x04y400e10c00800",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(DaletHebrewLetterCharacteristicsService, () => {
  const letter = letterHarness(
    DaletHebrewLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `dalet${name}HebrewCount`),
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
