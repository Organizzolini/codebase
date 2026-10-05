import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { ELatinLetterCharacteristicsService } from "./e-latin-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the E as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x03y610e10a10",
    names: ["Southeast", "SouthwestHalf", "Northeast", "NorthwestHalf"],
  },
  {
    fixture: "04x02y67508880",
    names: [
      "SoutheastQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "03x03y2502d0290",
    names: ["SoutheastHalf", "Southwest", "NortheastHalf", "Northwest"],
  },
  {
    fixture: "04x02y4440ab90",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the Greek Ε (epsilon) and the hangul ㅌ (tieut)",
    names: ["Southeast", "SouthwestHalf", "Northeast", "NorthwestHalf"],
  },
  {
    alias: "the hanzi 山 (shan)",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestQuarter",
    ],
  },
  {
    alias: "the katakana ヨ (yo)",
    names: ["SoutheastHalf", "Southwest", "NortheastHalf", "Northwest"],
  },
];

describe(ELatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    ELatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `e${name}LatinCount`),
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
