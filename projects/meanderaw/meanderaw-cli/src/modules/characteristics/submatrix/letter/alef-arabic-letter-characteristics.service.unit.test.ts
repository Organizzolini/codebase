import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { AlefArabicLetterCharacteristicsService } from "./alef-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterFormFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ا (final Arabic alef) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * │
 * └─╴
 * ```
 */
const FINAL_FORM: LetterFormFixture = {
  aliases: [
    {
      alias:
        "the final Arabic أ (alef with hamza above), إ (alef with hamza below), and آ (alef with madda above)",
      names: [
        "SoutheastQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestThreeQuarter",
      ],
    },
  ],
  orientations: [
    {
      fixture: "04x03y004000c02390",
      names: [
        "Southeast",
        "SouthwestThreeQuarter",
        "NortheastQuarter",
        "NorthwestHalf",
      ],
    },
    {
      fixture: "04x03y4000c000a310",
      names: [
        "SoutheastQuarter",
        "Southwest",
        "NortheastHalf",
        "NorthwestThreeQuarter",
      ],
    },
    {
      fixture: "04x03y6310c0008000",
      names: [
        "SoutheastHalf",
        "SouthwestQuarter",
        "NortheastThreeQuarter",
        "Northwest",
      ],
    },
    {
      fixture: "04x03y235000c00080",
      names: [
        "SoutheastThreeQuarter",
        "SouthwestHalf",
        "Northeast",
        "NorthwestQuarter",
      ],
    },
  ],
  prefix: "alefFinal",
};

/** Every positional form the letter is drawn in, in key order. */
const FORMS: readonly LetterFormFixture[] = [FINAL_FORM];

describe(AlefArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    AlefArabicLetterCharacteristicsService,
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
