import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { TLatinLetterCharacteristicsService } from "./t-latin-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the T as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x02y27100800",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
  {
    fixture: "03x03y0402d0080",
    names: [
      "SoutheastQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "04x02y04002b10",
    names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
  },
  {
    fixture: "03x03y400e10800",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the katakana ト (to) and the hangul ㅏ (a)",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestQuarter",
    ],
  },
  {
    alias: "the Greek Τ (tau), the hanzi 丁 (ding), and the hangul ㅜ (u)",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
  {
    alias: "the hangul ㅗ (o)",
    names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
  },
  {
    alias: "the hangul ㅓ (eo)",
    names: [
      "SoutheastQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestThreeQuarter",
    ],
  },
];

describe(TLatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    TLatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `t${name}LatinCount`),
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

  it.each(ALIASES)("lists $alias on exactly $names", ({ alias, names }) => {
    expect(letter.namesDescribing(alias)).toStrictEqual(names);
  });
});
