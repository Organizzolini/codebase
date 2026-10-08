import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { BehArabicLetterCharacteristicsService } from "./beh-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ٮ (final Arabic dotless beh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷
 * └─╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ب (beh), ت (teh), and ث (theh)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x02y00402390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "03x03y400c00a10",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x02y63108000",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "03x03y2500c0080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x02y4000a310",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "03x03y610c00800",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x02y23500080",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "03x03y0400c0290",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "behFinal",
};

/**
 * Each distinct orientation of the ٮ (initial Arabic dotless beh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 *  ╷
 * ╶┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias:
        "the initial Arabic ب (beh), ت (teh), ث (theh), ن (noon), ي (yeh), and ئ (yeh with hamza above)",
      names: [
        "SoutheastThreeQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestQuarter",
      ],
    },
  ],
  orientations: [
    {
      fixture: "03x02y400a10",
      names: [
        "Southeast",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestHalf",
      ],
    },
    {
      fixture: "03x02y610800",
      names: [
        "SoutheastQuarter",
        "SouthwestHalf",
        "Northeast",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "03x02y250080",
      names: [
        "SoutheastHalf",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "Northwest",
      ],
    },
    {
      fixture: "03x02y040290",
      names: [
        "SoutheastThreeQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "behInitial",
};

/**
 * Each distinct orientation of the ٮ (isolated Arabic dotless beh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ╷
 * └─┘
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ب (beh), ت (teh), and ث (theh)",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x02y4040a390",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
    {
      fixture: "03x03y610c00a10",
      names: [
        "SoutheastQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x02y63508080",
      names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
    },
    {
      fixture: "03x03y2500c0290",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "behIsolated",
};

/**
 * Each distinct orientation of the ٮ (medial Arabic dotless beh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 *  ╷
 * ╶┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias:
        "the medial Arabic ب (beh), ت (teh), ث (theh), ن (noon), ي (yeh), and ئ (yeh with hamza above)",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x02y04002b10",
      names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
    },
    {
      fixture: "03x03y400e10800",
      names: [
        "SoutheastQuarter",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x02y27100800",
      names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
    },
    {
      fixture: "03x03y0402d0080",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "behMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(BehArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    BehArabicLetterCharacteristicsService,
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
