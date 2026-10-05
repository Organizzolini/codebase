import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { SadArabicLetterCharacteristicsService } from "./sad-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ص (final Arabic sad) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *    ╷┌┐
 * ╷ ┌┴┴┴╴
 * └─┘
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ض (dad)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "08x03y065400002bbb50400000a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x07y04000e500e900e106900c000a100",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "08x03y6350000080a777100008a900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x07y025000c006902d006d00ad000800",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "08x03y00046500406bbb10a3900000",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x07y6100c000a5000e100e500e900800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "08x03y00006350277790800a980000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x07y04006d00ad002d000a5000c00290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "sadFinal",
};

/**
 * Each distinct orientation of the ص (initial Arabic sad) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷┌┐
 * ╶┴┴┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the initial Arabic ض (dad)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x02y65400abb10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x04y650e90e10800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x02y2775008a90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x04y0402d06d0a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x02y046502bb90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x04y400e10e50a90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x02y67710a9800",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x04y650ad02d0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "sadInitial",
};

/**
 * Each distinct orientation of the ص (isolated Arabic sad) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *    ╷┌┐
 * ╷ ┌┴┴┘
 * └─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ض (dad)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "07x03y6540000abb5040000a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x06y06500e900e106900c000a100",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "07x03y635000080a77500008a90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x06y025000c006902d006d00a900",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "07x03y0004650406bb90a390000",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x06y6100c000a5000e100e500a90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "07x03y00063506779080a980000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x06y6500ad002d000a5000c00290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "sadIsolated",
};

/**
 * Each distinct orientation of the ص (medial Arabic sad) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷┌┐
 * ╶┴┴┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the medial Arabic ض (dad)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "06x02y0654002bbb10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x05y400e50e90e10800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "06x02y27771008a900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x05y0402d06d0ad0080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "06x02y0465002bbb10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x05y400e10e50e90800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "06x02y2777100a9800",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x05y0406d0ad02d0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "sadMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(SadArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    SadArabicLetterCharacteristicsService,
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
