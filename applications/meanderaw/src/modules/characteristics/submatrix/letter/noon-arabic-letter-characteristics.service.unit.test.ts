import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { NoonArabicLetterCharacteristicsService } from "./noon-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ں (final Arabic dotless noon) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ┌╴
 * │ │
 * └─┘
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ن (noon)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y250400c0c00a390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y00406390c000a310",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y63500c0c0080a10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y235000c063908000",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y40610c0c00a3900",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y6310c000a3500080",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y063500c0c029080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y4000a35000c02390",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "noonFinal",
};

/**
 * Each distinct orientation of the ں (isolated Arabic dotless noon) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ╷
 * │ │
 * └─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ن (noon)",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x03y4040c0c0a390",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
    {
      fixture: "04x03y6310c000a310",
      names: [
        "SoutheastQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x03y6350c0c08080",
      names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
    },
    {
      fixture: "04x03y235000c02390",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "noonIsolated",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [FINAL_FORM, ISOLATED_FORM];

describe(NoonArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    NoonArabicLetterCharacteristicsService,
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
