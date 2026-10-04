import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { KieukHangulLetterCharacteristicsService } from "./kieuk-hangul-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/** Each distinct orientation of the ㅋ (hangul kieuk) as a Code holding one isolated copy, beside every orientation name drawing that ink. */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  { fixture: "03x03y2502d0080", names: ["Southeast", "NorthwestHalf"] },
  {
    fixture: "04x02y04402b90",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  { fixture: "03x03y400e10a10", names: ["SoutheastHalf", "Northwest"] },
  {
    fixture: "04x02y67108800",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  { fixture: "03x03y610e10800", names: ["Southwest", "NortheastHalf"] },
  {
    fixture: "04x02y27500880",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  { fixture: "03x03y0402d0290", names: ["SouthwestHalf", "Northeast"] },
  {
    fixture: "04x02y4400ab10",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  { alias: "the katakana ヒ (hi)", names: ["SoutheastHalf", "Northwest"] },
];

describe(KieukHangulLetterCharacteristicsService, () => {
  const letter = letterHarness(
    KieukHangulLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `kieuk${name}HangulCount`),
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
