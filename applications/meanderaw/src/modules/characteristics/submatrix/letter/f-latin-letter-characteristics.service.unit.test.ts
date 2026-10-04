import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { FLatinLetterCharacteristicsService } from "./f-latin-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the F as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "03x03y610e10800", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "04x02y27500880",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "03x03y0402d0290", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "04x02y4400ab10",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "03x03y2502d0080", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "04x02y04402b90",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "03x03y400e10a10", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "04x02y67108800",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(FLatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    FLatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `f${name}LatinCount`),
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
