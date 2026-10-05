import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { HehArabicLetterCharacteristicsService } from "./heh-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ه (final Arabic heh) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ┌┐
 * │├╴
 * └┘
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ة (teh marbuta)",
      names: ["SoutheastHalf", "Southwest", "NortheastHalf", "Northwest"],
    },
  ],
  orientations: [
    {
      fixture: "04x03y06502dc00a90",
      names: ["Southeast", "SouthwestHalf", "Northeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y04006b50a390",
      names: [
        "SoutheastQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x03y6500ce10a900",
      names: ["SoutheastHalf", "Southwest", "NortheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y6350a7900800",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "hehFinal",
};

/**
 * Each distinct orientation of the ه (initial Arabic heh) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌┐
 *  ├┤
 * ╶┴┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "04x03y6500ed00ab10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y6750eb908000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x03y27500ed00a90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y004067d0ab90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x03y06500ed02b90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x03y4000e750ab90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x03y6710ed00a900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x03y6750abd00080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "hehInitial",
};

/**
 * Each distinct orientation of the ه (medial Arabic heh) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌┐
 * ╶┼┼╴
 *  └┘
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "05x03y065002ff100a900",
      names: [
        "Southeast",
        "SoutheastHalf",
        "Southwest",
        "SouthwestHalf",
        "Northeast",
        "NortheastHalf",
        "Northwest",
        "NorthwestHalf",
      ],
    },
    {
      fixture: "04x04y04006f50af900800",
      names: [
        "SoutheastQuarter",
        "SoutheastThreeQuarter",
        "SouthwestQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NortheastThreeQuarter",
        "NorthwestQuarter",
        "NorthwestThreeQuarter",
      ],
    },
  ],
  prefix: "hehMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  MEDIAL_FORM,
];

describe(HehArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    HehArabicLetterCharacteristicsService,
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
