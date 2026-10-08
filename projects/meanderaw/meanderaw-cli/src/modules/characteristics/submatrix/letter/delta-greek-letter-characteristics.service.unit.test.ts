import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { DeltaGreekLetterCharacteristicsService } from "./delta-greek-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the Δ (Greek delta) as a Code holding one isolated
 * copy, beside every orientation name drawing that ink. Its diagonals run as
 * orthogonal zig-zags; the base, facing Southeast, draws:
 *
 * ```text
 *   ┌┐
 *  ┌┘└┐
 * ┌┘  └┐
 * └────┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "07x04y0065000069a5006900a50a333390",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
  {
    fixture: "05x06y65000ca500c0a50c0690c6900a9000",
    names: [
      "SoutheastQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "07x04y6333350a5006900a5690000a9000",
    names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
  },
  {
    fixture: "05x06y00650069c0690c0a50c00a5c000a90",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestQuarter",
    ],
  },
];

describe(DeltaGreekLetterCharacteristicsService, () => {
  const letter = letterHarness(
    DeltaGreekLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `delta${name}GreekCount`),
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
