import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { MeemArabicLetterCharacteristicsService } from "./meem-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the م (final Arabic meem) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ┌┬╴
 * ├┘
 * │
 * ╵
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "04x04y27500ad000c00080",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "05x03y00040006d023b90",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x04y4000c000e500ab10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "05x03y67310e900080000",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x04y6710e900c0008000",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "05x03y2375000ad000080",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x04y004000c006d02b90",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "05x03y40000e5000ab310",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "meemFinal",
};

/**
 * Each distinct orientation of the م (initial Arabic meem) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╶┬┐
 *  └┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "04x02y6710a900",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x03y650ad0080",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x02y06502b90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x03y400e50a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x02y27500a90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x03y0406d0a90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x02y6500ab10",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x03y650e90800",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "meemInitial",
};

/**
 * Each distinct orientation of the م (medial Arabic meem) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╶┬┬╴
 *  └┘
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "05x02y277100a900",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
    {
      fixture: "03x04y0406d0ad0080",
      names: [
        "SoutheastQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "05x02y065002bb10",
      names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
    },
    {
      fixture: "03x04y400e50e90800",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "meemMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  MEDIAL_FORM,
];

describe(MeemArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    MeemArabicLetterCharacteristicsService,
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
