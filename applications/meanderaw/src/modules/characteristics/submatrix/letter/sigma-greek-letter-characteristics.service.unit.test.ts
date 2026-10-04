import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { SigmaGreekLetterCharacteristicsService } from "./sigma-greek-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the Σ (Greek sigma) as a Code holding one isolated
 * copy, beside every orientation name drawing that ink. Its diagonals run as
 * orthogonal zig-zags; the base, facing Southeast, draws:
 *
 * ```text
 * ┌─╴
 * └┐
 * ┌┘
 * └─╴
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x04y6310a5006900a310",
    names: ["Southeast", "SouthwestHalf", "Northeast", "NorthwestHalf"],
  },
  {
    fixture: "05x03y65650ca9c080080",
    names: [
      "SoutheastQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "04x04y235006900a502390",
    names: ["SoutheastHalf", "Southwest", "NortheastHalf", "Northwest"],
  },
  {
    fixture: "05x03y40040c65c0a9a90",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestQuarter",
    ],
  },
];

describe(SigmaGreekLetterCharacteristicsService, () => {
  const letter = letterHarness(
    SigmaGreekLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `sigma${name}GreekCount`),
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
