import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { ZLatinLetterCharacteristicsService } from "./z-latin-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the Z as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x03y250690a10",
    names: ["Southeast", "SoutheastHalf", "Northwest", "NorthwestHalf"],
  },
  {
    fixture: "04x02y65408a90",
    names: [
      "SoutheastQuarter",
      "SoutheastThreeQuarter",
      "NorthwestQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "03x03y610a50290",
    names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
  },
  {
    fixture: "04x02y4650a980",
    names: [
      "SouthwestQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NortheastThreeQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the Greek Ζ (zeta) and the hangul ㄹ (rieul)",
    names: ["Southeast", "SoutheastHalf", "Northwest", "NorthwestHalf"],
  },
];

describe(ZLatinLetterCharacteristicsService, () => {
  const letter = letterHarness(
    ZLatinLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `z${name}LatinCount`),
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
