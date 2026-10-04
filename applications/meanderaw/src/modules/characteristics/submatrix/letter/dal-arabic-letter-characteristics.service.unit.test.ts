import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { DalArabicLetterCharacteristicsService } from "./dal-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the د (final Arabic dal) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╶┐
 * ╶─┴╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ذ (thal)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x02y061002b310",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x04y400e50c80800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x02y2371002900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x04y0404c0ad0080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x02y0250023b10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x04y400c40e90800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x02y273100a100",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x04y0406d08c0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "dalFinal",
};

/**
 * Each distinct orientation of the د (isolated Arabic dal) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╶┐
 * ╶─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ذ (thal)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x02y6100a310",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x03y650c80800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x02y23500290",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x03y0404c0a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x02y02502390",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x03y400c40a90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x02y6310a100",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x03y6508c0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "dalIsolated",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [FINAL_FORM, ISOLATED_FORM];

describe(DalArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    DalArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations of every form", () => {
    expect(letter.keys()).toStrictEqual(
      FORMS.flatMap(({ prefix }) =>
        LETTER_ORIENTATION_NAMES.map((name) => `${prefix}${name}ArabicCount`),
      ),
    );
  });

  describe.each(FORMS)("$prefix", ({ aliases, orientations, prefix }) => {
    const form = letter.form(prefix);

    it("draws every orientation name in exactly one fixture", () => {
      expect(
        orientations.flatMap(({ names }) => names).toSorted(),
      ).toStrictEqual(LETTER_ORIENTATION_NAMES.toSorted());
    });

    it.each(orientations)(
      "counts $fixture once under each of $names and under no other name",
      ({ fixture, names }) => {
        expect(form.counts(fixture)).toStrictEqual(expectedCounts(names));
      },
    );

    it.each(orientations)(
      "sizes the window of each of $names to the ink of $fixture",
      ({ fixture, names }) => {
        expect(form.windows(names)).toStrictEqual(
          names.map(() => form.inkedWindow(fixture)),
        );
      },
    );

    it("lists each alias on exactly the names drawing the ink it reads as", () => {
      expect(
        aliases.map(({ alias }) => form.namesDescribing(alias)),
      ).toStrictEqual(aliases.map(({ names }) => names));
    });

    it("lists an alias on no name but those its fixtures give", () => {
      expect(form.namesDescribing("Also reads as")).toStrictEqual(
        LETTER_ORIENTATION_NAMES.filter((name) =>
          aliases.some(({ names }) => names.includes(name)),
        ),
      );
    });
  });
});
