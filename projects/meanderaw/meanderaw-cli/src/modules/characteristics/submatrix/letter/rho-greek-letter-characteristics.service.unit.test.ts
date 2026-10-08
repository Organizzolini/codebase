import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { RhoGreekLetterCharacteristicsService } from "./rho-greek-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the Ρ (Greek rho) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "03x03y650e90800", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "04x02y27500a90",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "03x03y0406d0a90", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "04x02y6500ab10",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "03x03y650ad0080", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "04x02y06502b90",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "03x03y400e50a90", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "04x02y6710a900",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  { alias: "the Latin d", names: ["SoutheastHalf", "Northwest"] },
  {
    alias: "the Latin P and the isolated Arabic م (meem)",
    names: ["Southeast", "NorthwestHalf"],
  },
];

describe(RhoGreekLetterCharacteristicsService, () => {
  const letter = letterHarness(
    RhoGreekLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `rho${name}GreekCount`),
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
