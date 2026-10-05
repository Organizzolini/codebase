import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { LetterUtilitiesService } from "./letter-utilities.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { CharacteristicEvaluator } from "../../characteristics.types";
import type {
  LetterDefinition,
  LetterOrientation,
  LetterOrientationName,
  LetterScript,
} from "./letter.types";

/** An L: a stem down three points with a foot east, 2 columns by 3 rows, unchanged by no flip or turn. */
const L: readonly string[] = ["4.", "c.", "a1"];

/** A hook turning south at its east end, 3 columns by 2 rows, a second asymmetric shape so the laws are not tuned to one template. */
const HOOK: readonly string[] = ["235", "..8"];

/** The orientation named `name`, or undefined — which no expected template or window equals — when the enumeration lacks it. */
function named(
  orientations: readonly LetterOrientation[],
  name: LetterOrientationName,
): LetterOrientation | undefined {
  return orientations.find((entry) => entry.name === name);
}

/** The L drawn as a Latin letter, keyed as the real L so its keys are registered ones, with one alias on its Southeast orientation and one on its SoutheastQuarter. */
const L_LETTER: LetterDefinition = {
  aliases: {
    Southeast: "the hangul ㄴ (nieun)",
    SoutheastQuarter: "the Greek Γ (gamma)",
  },
  glyph: "L",
  key: (name) => `l${name}LatinCount`,
  script: "Latin",
  shape: "a two-unit stem with a unit foot reaching east from its bottom",
  template: L,
};

describe(LetterUtilitiesService, () => {
  let service: LetterUtilitiesService;
  let contextService: CharacteristicContextService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LetterUtilitiesService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(LetterUtilitiesService);
  });

  it("is exported by LetterCharacteristicsModule for letter services to inject", async () => {
    const shared = Symbol("shared");
    const module = await Test.createTestingModule({
      imports: [LetterCharacteristicsModule],
      providers: [
        {
          inject: [LetterUtilitiesService],
          provide: shared,
          useFactory: (
            utilities: LetterUtilitiesService,
          ): LetterUtilitiesService => utilities,
        },
      ],
    }).compile();

    expect(module.get(shared)).toBeInstanceOf(LetterUtilitiesService);
  });

  it("mirrors a template east to west, swapping east and west arms", () => {
    expect(service.flipHorizontally(L)).toStrictEqual([".4", ".c", "29"]);
  });

  it("mirrors a template north to south, swapping north and south arms", () => {
    expect(service.flipVertically(L)).toStrictEqual(["61", "c.", "8."]);
  });

  it("turns a template a quarter clockwise, carrying each arm round", () => {
    expect(service.turnClockwise(L, "Quarter")).toStrictEqual(["631", "8.."]);
  });

  it("turns a template three quarters clockwise, the same as a quarter anticlockwise", () => {
    expect(service.turnClockwise(L, "ThreeQuarter")).toStrictEqual([
      "..4",
      "239",
    ]);
  });

  it("leaves a template unturned under no rotation", () => {
    expect(service.turnClockwise(L, "None")).toStrictEqual(L);
  });

  describe.each([{ template: L }, { template: HOOK }])(
    "composition laws on $template",
    ({ template }) => {
      it("turns a half as flipping both ways", () => {
        expect(service.turnClockwise(template, "Half")).toStrictEqual(
          service.flipVertically(service.flipHorizontally(template)),
        );
      });

      it("returns to the base after four quarter turns", () => {
        let turned = template;
        for (let turn = 0; turn < 4; turn += 1) {
          turned = service.turnClockwise(turned, "Quarter");
        }

        expect(turned).toStrictEqual(template);
      });

      it("undoes a quarter turn with a three-quarter turn", () => {
        expect(
          service.turnClockwise(
            service.turnClockwise(template, "Quarter"),
            "ThreeQuarter",
          ),
        ).toStrictEqual(template);
      });

      it("undoes each flip by flipping again", () => {
        expect(
          service.flipHorizontally(service.flipHorizontally(template)),
        ).toStrictEqual(template);
        expect(
          service.flipVertically(service.flipVertically(template)),
        ).toStrictEqual(template);
      });
    },
  );

  it.each<{ corner: string; script: LetterScript }>([
    { corner: "Southwest", script: "Arabic" },
    { corner: "Southeast", script: "Greek" },
    { corner: "Southeast", script: "Hangul" },
    { corner: "Southeast", script: "Hanzi" },
    { corner: "Southeast", script: "Katakana" },
    { corner: "Southeast", script: "Latin" },
    { corner: "Southwest", script: "Hebrew" },
  ])("reads $script from the $corner corner", ({ corner, script }) => {
    expect(service.baseCorner(script)).toBe(corner);
  });

  it("names sixteen distinct corner and rotation orientations", () => {
    const names = service.orientationNames();

    expect(names).toHaveLength(16);
    expect(new Set(names).size).toBe(16);
    expect(names).toContain("Southeast");
    expect(names).toContain("NorthwestThreeQuarter");
    expect(names).toContain("SouthwestHalf");
  });

  it("names the orientations in the order the letter keys list them", () => {
    expect(service.orientationNames()).toStrictEqual(LETTER_ORIENTATION_NAMES);
  });

  describe("orientations from a Southeast base", () => {
    let orientations: readonly LetterOrientation[];

    beforeAll(() => {
      orientations = service.orientations(L, "Latin");
    });

    it("pairs every orientation name with a template", () => {
      expect(orientations.map(({ name }) => name)).toStrictEqual(
        service.orientationNames(),
      );
    });

    it("keeps the base template as the Southeast orientation", () => {
      expect(named(orientations, "Southeast")?.template).toStrictEqual(L);
    });

    it("flips the base horizontally, vertically, and both ways for the other corners", () => {
      expect(named(orientations, "Southwest")?.template).toStrictEqual(
        service.flipHorizontally(L),
      );
      expect(named(orientations, "Northeast")?.template).toStrictEqual(
        service.flipVertically(L),
      );
      expect(named(orientations, "Northwest")?.template).toStrictEqual(
        service.flipVertically(service.flipHorizontally(L)),
      );
    });

    it("draws Southeast turned a half the same as Northwest", () => {
      expect(named(orientations, "SoutheastHalf")?.template).toStrictEqual(
        named(orientations, "Northwest")?.template,
      );
    });

    it("turns after flipping, not before", () => {
      expect(named(orientations, "SouthwestQuarter")?.template).toStrictEqual(
        service.turnClockwise(service.flipHorizontally(L), "Quarter"),
      );
      expect(
        named(orientations, "SouthwestQuarter")?.template,
      ).not.toStrictEqual(
        service.flipHorizontally(service.turnClockwise(L, "Quarter")),
      );
    });

    it("draws an asymmetric glyph in eight distinct orientations", () => {
      expect(
        new Set(orientations.map(({ template }) => template.join("/"))).size,
      ).toBe(8);
    });

    it("swaps the window's columns and rows on a quarter or three-quarter turn", () => {
      expect(named(orientations, "Southeast")?.window).toStrictEqual({
        columns: 2,
        rows: 3,
      });
      expect(named(orientations, "SoutheastHalf")?.window).toStrictEqual({
        columns: 2,
        rows: 3,
      });
      expect(named(orientations, "NortheastQuarter")?.window).toStrictEqual({
        columns: 3,
        rows: 2,
      });
      expect(
        named(orientations, "SouthwestThreeQuarter")?.window,
      ).toStrictEqual({ columns: 3, rows: 2 });
    });
  });

  describe("orientations from a Southwest base", () => {
    let orientations: readonly LetterOrientation[];

    beforeAll(() => {
      orientations = service.orientations(L, "Hebrew");
    });

    it("keeps the base template as the Southwest orientation", () => {
      expect(named(orientations, "Southwest")?.template).toStrictEqual(L);
    });

    it("flips the base horizontally, vertically, and both ways for the other corners", () => {
      expect(named(orientations, "Southeast")?.template).toStrictEqual(
        service.flipHorizontally(L),
      );
      expect(named(orientations, "Northwest")?.template).toStrictEqual(
        service.flipVertically(L),
      );
      expect(named(orientations, "Northeast")?.template).toStrictEqual(
        service.flipVertically(service.flipHorizontally(L)),
      );
    });

    it("carries the flips each corner is drawn with from the Southwest base", () => {
      expect(
        ["Southwest", "SoutheastQuarter", "NorthwestHalf", "Northeast"].map(
          (name) =>
            orientations.find((entry) => entry.name === name)?.flips ?? null,
        ),
      ).toStrictEqual([
        [],
        ["east to west"],
        ["north to south"],
        ["east to west", "north to south"],
      ]);
    });

    it("draws Southwest turned a half the same as Northeast", () => {
      expect(named(orientations, "SouthwestHalf")?.template).toStrictEqual(
        named(orientations, "Northeast")?.template,
      );
    });

    it("turns the base itself, with no mirror, for the Southwest rotations", () => {
      expect(named(orientations, "SouthwestQuarter")?.template).toStrictEqual([
        "631",
        "8..",
      ]);
      expect(
        named(orientations, "SouthwestThreeQuarter")?.template,
      ).toStrictEqual(["..4", "239"]);
    });

    it("turns after flipping for the other corners' rotations", () => {
      expect(
        named(orientations, "SoutheastThreeQuarter")?.template,
      ).toStrictEqual(["235", "..8"]);
      expect(named(orientations, "NorthwestQuarter")?.template).toStrictEqual(
        service.turnClockwise(service.flipVertically(L), "Quarter"),
      );
      expect(named(orientations, "NortheastQuarter")?.template).toStrictEqual(
        service.turnClockwise(
          service.flipVertically(service.flipHorizontally(L)),
          "Quarter",
        ),
      );
    });

    it("draws an asymmetric glyph in eight distinct orientations", () => {
      expect(
        new Set(orientations.map(({ template }) => template.join("/"))).size,
      ).toBe(8);
    });
  });

  describe("evaluators for a letter", () => {
    let evaluators: readonly CharacteristicEvaluator<number>[];

    /** The evaluator of the orientation `name`, which every test below expects to exist. */
    function evaluator(
      name: LetterOrientationName,
    ): CharacteristicEvaluator<number> | undefined {
      return evaluators[LETTER_ORIENTATION_NAMES.indexOf(name)];
    }

    beforeAll(() => {
      evaluators = service.evaluators(L_LETTER);
    });

    it("keys one evaluator for each of the sixteen orientations, in orientation order", () => {
      expect(evaluators.map(({ metadata }) => metadata.key)).toStrictEqual(
        LETTER_ORIENTATION_NAMES.map((name) => `l${name}LatinCount`),
      );
    });

    it("makes every evaluator a numeric submatrix count", () => {
      expect(
        evaluators.map(({ metadata }) => [
          metadata.category,
          metadata.valueType,
        ]),
      ).toStrictEqual(evaluators.map(() => ["submatrix", "number"]));
    });

    it("gives each evaluator its own orientation's window and formula", () => {
      const orientations = service.orientations(L, "Latin");
      const utilities = new SubmatrixUtilitiesService();

      expect(
        evaluators.map(({ metadata }) => metadata.submatrix),
      ).toStrictEqual(orientations.map(({ window }) => window));
      expect(evaluators.map(({ metadata }) => metadata.formula)).toStrictEqual(
        orientations.map(({ template }) => utilities.glyphFormula(template)),
      );
    });

    it("names each evaluator after its key, word by word", () => {
      expect(evaluator("Southeast")?.metadata.name).toBe(
        "L Southeast Latin Count",
      );
      expect(evaluator("NorthwestThreeQuarter")?.metadata.name).toBe(
        "L Northwest Three Quarter Latin Count",
      );
    });

    it("describes the glyph, its upright shape, and how each orientation draws it", () => {
      expect(evaluator("Southeast")?.metadata.description).toBe(
        "The number of minimal isolated L glyphs — a two-unit stem with a unit foot reaching east from its bottom — drawn upright. Also reads as the hangul ㄴ (nieun).",
      );
      expect(evaluator("SouthwestQuarter")?.metadata.description).toBe(
        "The number of minimal isolated L glyphs — a two-unit stem with a unit foot reaching east from its bottom — mirrored east to west, then turned a quarter clockwise.",
      );
      expect(evaluator("NortheastHalf")?.metadata.description).toBe(
        "The number of minimal isolated L glyphs — a two-unit stem with a unit foot reaching east from its bottom — mirrored north to south, then turned a half turn.",
      );
      expect(
        evaluator("NorthwestThreeQuarter")?.metadata.description,
      ).toContain(
        "mirrored east to west and north to south, then turned three quarters clockwise.",
      );
    });

    it("lists an alias on every orientation drawing the same ink as the one it was given for, and on no other", () => {
      const withAlias = evaluators
        .filter(({ metadata }) => metadata.description.includes("Γ (gamma)"))
        .map(({ metadata }) => metadata.key);

      expect(withAlias).toStrictEqual([
        "lSoutheastQuarterLatinCount",
        "lNorthwestThreeQuarterLatinCount",
      ]);
    });

    it("counts each orientation's own ink, and the same ink under every name that draws it", () => {
      const context = contextService.create("04x02y63108000");

      expect(evaluators.map((entry) => entry.compute(context))).toStrictEqual(
        LETTER_ORIENTATION_NAMES.map((name) =>
          name === "SoutheastQuarter" || name === "NorthwestThreeQuarter"
            ? 1
            : 0,
        ),
      );
    });

    it("counts each context afresh rather than reusing another context's count", () => {
      expect(
        evaluator("Southeast")?.compute(
          contextService.create("03x03y400c00a10"),
        ),
      ).toBe(1);
      expect(
        evaluator("Southeast")?.compute(
          contextService.create("03x03y610c00800"),
        ),
      ).toBe(0);
    });

    it("keeps apart two templates whose rows run together into the same characters", () => {
      const context = contextService.create("04x02y6500a900");
      const square = service.evaluators({
        glyph: "O",
        key: (name) => `o${name}LatinCount`,
        script: "Latin",
        shape: "a closed unit square",
        template: ["65", "a9"],
      });
      const row = service.evaluators({
        glyph: "L",
        key: (name) => `l${name}LatinCount`,
        script: "Latin",
        shape: "the square's digits in one row",
        template: ["65a9"],
      });

      expect(
        [square, row].map((drawn) => drawn[0]?.compute(context)),
      ).toStrictEqual([1, 0]);
    });
  });

  describe("evaluators for a letter's positional forms", () => {
    /** A form of a dotless Arabic letter keyed by `key`, drawn as `template`, with its Southwest orientation aliased when `alias` is given. */
    function form(
      key: LetterDefinition["key"],
      template: readonly string[],
      alias?: string,
    ): LetterDefinition {
      return {
        ...(alias === undefined ? {} : { aliases: { Southwest: alias } }),
        glyph: "ٮ (Arabic dotless beh)",
        key,
        script: "Arabic",
        shape: "a test shape",
        template,
      };
    }

    it("keys and draws each form's sixteen orientations in turn, from that form's own template", () => {
      const utilities = new SubmatrixUtilitiesService();
      const evaluators = service.formEvaluators([
        form((name) => `behMedial${name}ArabicCount`, L),
        form((name) => `behFinal${name}ArabicCount`, HOOK),
      ]);

      expect(evaluators.map(({ metadata }) => metadata.key)).toStrictEqual([
        ...LETTER_ORIENTATION_NAMES.map(
          (name) => `behMedial${name}ArabicCount`,
        ),
        ...LETTER_ORIENTATION_NAMES.map((name) => `behFinal${name}ArabicCount`),
      ]);
      expect(evaluators.map(({ metadata }) => metadata.formula)).toStrictEqual(
        [
          ...service.orientations(L, "Arabic"),
          ...service.orientations(HOOK, "Arabic"),
        ].map(({ template }) => utilities.glyphFormula(template)),
      );
    });

    it("keeps each form's aliases on that form, even where another form draws the same ink", () => {
      const evaluators = service.formEvaluators([
        form((name) => `behMedial${name}ArabicCount`, L, "the medial ب"),
        form((name) => `behFinal${name}ArabicCount`, L),
      ]);

      expect(
        evaluators
          .filter(({ metadata }) => metadata.description.includes("ب"))
          .map(({ metadata }) => metadata.key),
      ).toStrictEqual([
        "behMedialSouthwestArabicCount",
        "behMedialNortheastHalfArabicCount",
      ]);
    });
  });
});
