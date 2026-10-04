import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { FehArabicLetterCharacteristicsService } from "./feh-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ڡ (final Arabic dotless feh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ┌┐
 * └─┴┴╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ف (feh)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "06x02y0650402bb390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x05y400e50e90c00a10",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "06x02y63771080a900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x05y2500c06d0ad0080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "06x02y406500a3bb10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x05y610c00e50e90800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "06x02y2773500a9080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x05y0406d0ad00c0290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "fehFinal",
};

/**
 * Each distinct orientation of the ڡ (initial Arabic dotless feh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 *  ┌┐
 *  └┤
 * ╶─┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the initial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x03y6500e900a310",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y6750ca908000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x03y235006d00a90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y004065c0ab90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x03y06500ad02390",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x03y4000c650ab90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x03y6310e500a900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x03y6750a9c00080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "fehInitial",
};

/**
 * Each distinct orientation of the ڡ (isolated Arabic dotless feh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ┌┐
 * └─┴┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ف (feh)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x02y65040ab390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x04y650e90c00a10",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x02y6375080a90",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x04y2500c06d0a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x02y40650a3b90",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x04y610c00e50a90",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x02y67350a9080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x04y650ad00c0290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "fehIsolated",
};

/**
 * Each distinct orientation of the ڡ (medial Arabic dotless feh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 *  ┌┐
 *  └┤
 * ╶─┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the medial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y065000e9002b310",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y4000e750ca908000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y2371006d000a900",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y004065c0abd00080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y065000ad0023b10",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y4000c650eb908000",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y273100e5000a900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y004067d0a9c00080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "fehMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(FehArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    FehArabicLetterCharacteristicsService,
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
