import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LLatinLetterCharacteristicsService } from "./l-latin-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the L as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x02y400a10",
    names: [
      "Southeast",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestHalf",
    ],
  },
  {
    fixture: "03x02y610800",
    names: [
      "SoutheastQuarter",
      "SouthwestHalf",
      "Northeast",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "03x02y250080",
    names: [
      "SoutheastHalf",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "Northwest",
    ],
  },
  {
    fixture: "03x02y040290",
    names: [
      "SoutheastThreeQuarter",
      "Southwest",
      "NortheastHalf",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the Greek Γ (gamma)",
    names: [
      "SoutheastQuarter",
      "SouthwestHalf",
      "Northeast",
      "NorthwestThreeQuarter",
    ],
  },
  {
    alias: "the hangul ㄴ (nieun)",
    names: [
      "Southeast",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestHalf",
    ],
  },
  {
    alias: "the hangul ㄱ (giyeok) and the Hebrew ר (resh)",
    names: [
      "SoutheastHalf",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "Northwest",
    ],
  },
];

describe(LLatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    LLatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `l${name}LatinCount`),
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
