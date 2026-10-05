import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { HahArabicLetterCharacteristicsService } from "./hah-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ح (final Arabic hah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌─╴
 * ┌┘
 * └─╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ج (jeem) and خ (khah)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y2350000a5002390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y004040c0c690a900",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y63100a50000a310",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y065069c0c0808000",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y0631069000a3100",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y6500ca5080c00080",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y023500069023900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y4000c040a5c00a90",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "hahFinal",
};

/**
 * Each distinct orientation of the ح (initial Arabic hah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *   ┌╴
 *  ┌┘
 * ╶┘
 * ```
 */
const INITIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the initial Arabic ج (jeem) and خ (khah)",
      names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y250000a50000a10",
      names: ["Southeast", "SoutheastHalf", "Northwest", "NorthwestHalf"],
    },
    {
      fixture: "04x04y0040069069008000",
      names: [
        "SoutheastQuarter",
        "SoutheastThreeQuarter",
        "NorthwestQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "05x03y006100690029000",
      names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
    },
    {
      fixture: "04x04y4000a5000a500080",
      names: [
        "SouthwestQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NortheastThreeQuarter",
      ],
    },
  ],
  prefix: "hahInitial",
};

/**
 * Each distinct orientation of the ح (isolated Arabic hah) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌╴
 * ┌┘
 * └─╴
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ج (jeem) and خ (khah)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "04x03y25000a502390",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x03y4040c690a900",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "04x03y6310a5000a10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x03y065069c08080",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "04x03y06106900a310",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x03y6500ca508080",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "04x03y235006902900",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x03y4040a5c00a90",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "hahIsolated",
};

/**
 * Each distinct orientation of the ح (medial Arabic hah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *   ┌╴
 *  ┌┘
 * ╶┴╴
 * ```
 */
const MEDIAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the medial Arabic ج (jeem) and خ (khah)",
      names: ["Southwest", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "05x03y250000a50002b10",
      names: ["Southeast", "NorthwestHalf"],
    },
    {
      fixture: "04x04y00404690e9008000",
      names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
    },
    {
      fixture: "05x03y271000a50000a10",
      names: ["SoutheastHalf", "Northwest"],
    },
    {
      fixture: "04x04y004006d069808000",
      names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
    },
    {
      fixture: "05x03y00610069002b100",
      names: ["Southwest", "NortheastHalf"],
    },
    {
      fixture: "04x04y4000e5008a500080",
      names: ["SouthwestQuarter", "NortheastThreeQuarter"],
    },
    {
      fixture: "05x03y027100690029000",
      names: ["SouthwestHalf", "Northeast"],
    },
    {
      fixture: "04x04y4000a5400ad00080",
      names: ["SouthwestThreeQuarter", "NortheastQuarter"],
    },
  ],
  prefix: "hahMedial",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [
  FINAL_FORM,
  INITIAL_FORM,
  ISOLATED_FORM,
  MEDIAL_FORM,
];

describe(HahArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    HahArabicLetterCharacteristicsService,
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
