import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { AinArabicLetterCharacteristicsService } from "./ain-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ع (final Arabic ain) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌┐
 * ┌┴┴╴
 * └─╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic غ (ghain)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y065002bb5002390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y04004e50ce90a900",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y63100a77100a900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y06506dc0ad800800",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y065006bb10a3100",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y6500ce508e900800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y02350277900a900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y04006d40adc00a90",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "ainFinal",
};

/**
 * Each distinct orientation of the ع (initial Arabic ain) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌╴
 * ╶┴╴
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the initial Arabic غ (ghain)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x02y25002b10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x03y440e90800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x02y27100a10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x03y0406d0880",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x02y06102b10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x03y400e50880",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x02y27102900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x03y440ad0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "ainInitial",
};

/**
 * Each distinct orientation of the ع (isolated Arabic ain) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌╴
 * ┌┴╴
 * └─╴
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic غ (ghain)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x03y25002b502390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y4440ce90a900",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x03y6310a7100a10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y06506dc08880",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x03y06106b10a310",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x03y6500ce508880",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x03y235027902900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x03y4440adc00a90",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "ainIsolated",
};

/**
 * Each distinct orientation of the ع (medial Arabic ain) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌┬╴
 * ╶┴┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the medial Arabic غ (ghain)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x02y275002bb10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x04y440ed0e90800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x02y277100ab10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x04y0406d0ed0880",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x02y067102bb10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x04y400e50ed0880",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x02y277102b900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x04y440ed0ad0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "ainMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(AinArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    AinArabicLetterCharacteristicsService,
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
