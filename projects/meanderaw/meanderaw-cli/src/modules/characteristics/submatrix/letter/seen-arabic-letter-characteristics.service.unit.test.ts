import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { SeenArabicLetterCharacteristicsService } from "./seen-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the س (final Arabic seen) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *    ╷╷╷
 * ╷ ┌┴┴┴╴
 * └─┘
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ش (sheen)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "08x03y044400002bbb50400000a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x07y04000e100e100e106900c000a100",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "08x03y6350000080a7771000088800",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x07y025000c006902d002d002d000800",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "08x03y00044400406bbb10a3900000",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x07y6100c000a5000e100e100e100800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "08x03y000063502777908008880000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x07y04002d002d002d000a5000c00290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "seenFinal",
};

/**
 * Each distinct orientation of the س (initial Arabic seen) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷╷╷
 * ╶┴┴┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the initial Arabic ش (sheen)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x02y44400abb10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x04y610e10e10800",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x02y2775008880",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x04y0402d02d0290",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x02y044402bb90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x04y400e10e10a10",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x02y6771088800",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x04y2502d02d0080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "seenInitial",
};

/**
 * Each distinct orientation of the س (isolated Arabic seen) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *    ╷╷╷
 * ╷ ┌┴┴┘
 * └─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ش (sheen)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "07x03y4440000abb5040000a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x06y06100e100e106900c000a100",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "07x03y635000080a77500008880",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x06y025000c006902d002d002900",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "07x03y0004440406bb90a390000",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x06y6100c000a5000e100e100a10",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "07x03y000635067790808880000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x06y25002d002d000a5000c00290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "seenIsolated",
};

/**
 * Each distinct orientation of the س (medial Arabic seen) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷╷╷
 * ╶┴┴┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the medial Arabic ش (sheen)",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
  ],
  orientations: [
    {
      fixture: "06x02y0444002bbb10",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
    {
      fixture: "03x05y400e10e10e10800",
      names: [
        "SoutheastQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "06x02y277710088800",
      names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
    },
    {
      fixture: "03x05y0402d02d02d0080",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "seenMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(SeenArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    SeenArabicLetterCharacteristicsService,
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
