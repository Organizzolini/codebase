import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LamArabicLetterCharacteristicsService } from "./lam-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ل (final Arabic lam) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *   ╷
 *   │
 * ╷ │
 * └─┴╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "05x04y040000c0000c0402b390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "05x04y40000e3310c0000a1000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x04y6371080c0000c0000800",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "05x04y00250000c0233d000080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x04y0040000c0040c00a3b10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "05x04y61000c0000e331080000",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x04y273500c0800c00008000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "05x04y00040233d0000c000290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "lamFinal",
};

/**
 * Each distinct orientation of the ل (initial Arabic lam) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 *  │
 *  │
 * ╶┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "03x04y400c00c00a10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "05x02y6331080000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "03x04y2500c00c0080",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "05x02y0004023390",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "03x04y0400c00c0290",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "05x02y40000a3310",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "03x04y610c00c00800",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "05x02y2335000080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "lamInitial",
};

/**
 * Each distinct orientation of the ل (isolated Arabic lam) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *   ╷
 *   │
 * ╷ │
 * └─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "04x04y4000c000c040a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "05x03y63310c0000a1000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x04y635080c000c00080",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "05x03y00250000c023390",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x04y004000c040c0a390",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "05x03y61000c0000a3310",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x04y6350c080c0008000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "05x03y23350000c000290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "lamIsolated",
};

/**
 * Each distinct orientation of the ل (medial Arabic lam) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 *  │
 *  │
 * ╶┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [],
  orientations: [
    {
      fixture: "04x04y04000c000c002b10",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
    {
      fixture: "05x03y40000e331080000",
      names: [
        "SoutheastQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x04y27100c000c000800",
      names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
    },
    {
      fixture: "05x03y00040233d000080",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "lamMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(LamArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    LamArabicLetterCharacteristicsService,
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
