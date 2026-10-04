import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { ShangHanziLetterCharacteristicsService } from "./shang-hanzi-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/** Each distinct orientation of the 上 (hanzi shang) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "04x03y04000e102b10", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "04x03y4000e7108800",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "04x03y27102d000800", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "04x03y04402bd00080",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "04x03y04002d002b10", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "04x03y4400eb108000",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "04x03y27100e100800", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "04x03y004027d00880",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(ShangHanziLetterCharacteristicsService, () => {
  const letter = letterHarness(
    ShangHanziLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `shang${name}HanziCount`),
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
