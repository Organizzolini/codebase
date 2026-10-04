import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { KafArabicLetterCharacteristicsService } from "./kaf-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ك (final Arabic kaf) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * │ ╷
 * └─┴╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "05x03y00040040c02b390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y4000e100c000a310",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y63710c080080000",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y235000c002d00080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y40000c0400a3b10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y6310c000e1008000",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y27350080c000080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y004002d000c02390",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "kafFinal",
};

/**
 * Each distinct orientation of the ك (initial Arabic kaf) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╶──┐
 *   ╶┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "05x02y63310a1000",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x04y6508c00c0080",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x02y0025023390",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x04y400c00c40a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x02y2335000290",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x04y0400c04c0a90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x02y61000a3310",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x04y650c80c00800",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "kafInitial",
};

/**
 * Each distinct orientation of the ك (isolated Arabic kaf) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * │ ╷
 * └─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "04x03y004040c0a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y6100c000a310",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x03y6350c0808000",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y235000c00290",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x03y4000c040a390",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x03y6310c000a100",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x03y635080c00080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x03y025000c02390",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "kafIsolated",
};

/**
 * Each distinct orientation of the ك (medial Arabic kaf) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╶──┐
 *   ╶┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "06x02y0633102b1000",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x05y400e508c00c0080",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "06x02y002710233900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x05y400c00c40ad0080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "06x02y233500002b10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x05y0400c04c0e90800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "06x02y2710000a3310",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x05y0406d0c80c00800",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "kafMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(KafArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    KafArabicLetterCharacteristicsService,
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
