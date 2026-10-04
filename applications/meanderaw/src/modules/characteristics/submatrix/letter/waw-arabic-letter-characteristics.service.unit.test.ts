import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { WawArabicLetterCharacteristicsService } from "./waw-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the و (final Arabic waw) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ┌┐
 * └┼╴
 * ┌┘
 * ╵
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ؤ (waw with hamza above)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x04y06502f900a500080",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "05x03y0040006f5029a90",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x04y4000a5006f10a900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "05x03y65610af90008000",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x04y6500af1069008000",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "05x03y256500af9000800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x04y004006902f500a90",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "05x03y040006f500a9a10",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "wawFinal",
};

/**
 * Each distinct orientation of the و (isolated Arabic waw) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ┌┐
 * └┤
 * ┌┘
 * ╵
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ؤ (waw with hamza above)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "03x04y650e90a50080",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "05x02y0675029a90",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "03x04y400a506d0a90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "05x02y65610ab900",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "03x04y650ad0690800",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "05x02y256500ab90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "03x04y040690e50a90",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "05x02y67500a9a10",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "wawIsolated",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [FINAL_FORM, ISOLATED_FORM];

describe(WawArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    WawArabicLetterCharacteristicsService,
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
