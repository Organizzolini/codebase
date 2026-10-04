import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { RehArabicLetterCharacteristicsService } from "./reh-arabic-letter-characteristics.service";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ر (final Arabic reh) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌╴
 * ┌┘
 * ╵
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the final Arabic ز (zain)",
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
      fixture: "04x03y25000a500080",
      names: [
        "Southeast",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "NorthwestHalf",
      ],
    },
    {
      fixture: "04x03y004006902900",
      names: [
        "SoutheastQuarter",
        "SouthwestHalf",
        "Northeast",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x03y4000a5000a10",
      names: [
        "SoutheastHalf",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "Northwest",
      ],
    },
    {
      fixture: "04x03y061069008000",
      names: [
        "SoutheastThreeQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "rehFinal",
};

/**
 * Each distinct orientation of the ر (isolated Arabic reh) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 * ┌┘
 * ╵
 * ```
 */
const ISOLATED_FORM: LetterFormFixture = {
  aliases: [
    {
      alias: "the isolated Arabic ز (zain)",
      names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
    },
  ],
  orientations: [
    {
      fixture: "03x03y400a50080",
      names: ["Southeast", "SoutheastHalf", "Northwest", "NorthwestHalf"],
    },
    {
      fixture: "04x02y06102900",
      names: [
        "SoutheastQuarter",
        "SoutheastThreeQuarter",
        "NorthwestQuarter",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "03x03y040690800",
      names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
    },
    {
      fixture: "04x02y25000a10",
      names: [
        "SouthwestQuarter",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NortheastThreeQuarter",
      ],
    },
  ],
  prefix: "rehIsolated",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [FINAL_FORM, ISOLATED_FORM];

describe(RehArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    RehArabicLetterCharacteristicsService,
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
