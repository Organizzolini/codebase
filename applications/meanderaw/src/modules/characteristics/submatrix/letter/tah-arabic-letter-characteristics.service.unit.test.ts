import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { TahArabicLetterCharacteristicsService } from "./tah-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ط (final Arabic tah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * ├┐
 * └┴╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ظ (zah)",
      names: [
        "SoutheastQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestThreeQuarter",
      ],
    },
  ],
  orientations: [
    {
      fixture: "04x03y004006d02b90",
      names: [
        "Southeast",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestHalf",
      ],
    },
    {
      fixture: "04x03y4000e500ab10",
      names: [
        "SoutheastQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x03y6710e9008000",
      names: [
        "SoutheastHalf",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "Northwest",
      ],
    },
    {
      fixture: "04x03y27500ad00080",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestHalf",
        "Northeast",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "tahFinal",
};

/**
 * Each distinct orientation of the ط (initial Arabic tah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 *  ├┐
 * ╶┴┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the initial Arabic ظ (zah)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x03y04006d00ab10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y6500eb108000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x03y27500e900800",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y004027d00a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x03y04000e502b90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x03y4000e710a900",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x03y6710ad000800",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x03y06502bd00080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "tahInitial",
};

/**
 * Each distinct orientation of the ط (isolated Arabic tah) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * ├┐
 * └┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ظ (zah)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "03x03y0406d0a90",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x02y6500ab10",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "03x03y650e90800",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x02y27500a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "03x03y400e50a90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x02y6710a900",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "03x03y650ad0080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x02y06502b90",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "tahIsolated",
};

/**
 * Each distinct orientation of the ط (medial Arabic tah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 *  ├┐
 * ╶┴┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the medial Arabic ظ (zah)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y0040006d002bb10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y4000e500eb108000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y277100e90008000",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y004027d00ad00080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y040000e5002bb10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y4000e710e9008000",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y277100ad0000800",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y004006d02bd00080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "tahMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(TahArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    TahArabicLetterCharacteristicsService,
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
