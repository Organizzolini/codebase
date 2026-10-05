import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { YehArabicLetterCharacteristicsService } from "./yeh-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ى (final Arabic alef maksura, the dotless
 * yeh) as a Code holding one isolated copy, beside every orientation name
 * drawing that ink. The base, facing Southwest, draws:
 *
 * ```text
 *   ┌─╴
 * ╷ └┐
 * └──┘
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ي (yeh) and ئ (yeh with hamza above)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "06x03y2350000690400a3390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x05y004065c0ca90c000a100",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "06x03y63350080690000a310",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x05y025000c065c0ca908000",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "06x03y00631040a500a33900",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x05y6100c000c650a9c00080",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "06x03y0633500a5080239000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x05y4000c650a9c000c00290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "yehFinal",
};

/**
 * Each distinct orientation of the ى (isolated Arabic alef maksura, the dotless
 * yeh) as a Code holding one isolated copy, beside every orientation name
 * drawing that ink. The base, facing Southwest, draws:
 *
 * ```text
 *   ┌╴
 * ╷ └┐
 * └──┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ي (yeh) and ئ (yeh with hamza above)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y2500069040a3390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y6540ca90c000a100",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y633508069000a10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y025000c065c08a90",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y0061040a50a3390",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y6100c000c650a980",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y63350a508029000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y4650a9c000c00290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "yehIsolated",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [FINAL_FORM, ISOLATED_FORM];

describe(YehArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    YehArabicLetterCharacteristicsService,
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
