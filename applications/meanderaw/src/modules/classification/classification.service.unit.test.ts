import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { characteristicRecord } from "../../../testing/meanders";

import {
  MEANDER_FAMILIES,
  STRUCTURAL_MINIMUM_ROWS,
} from "./classification.constants";
import { ClassificationService } from "./classification.service";

import type { BooleanCharacteristicKey } from "../characteristics/characteristics.types";
import type { MeanderFamily, MeanderFiledShape } from "./classification.types";

/** One family rule as this test states it: the family and the compound characteristic that decides it. */
interface FamilyRule {
  readonly family: MeanderFamily;
  readonly key: BooleanCharacteristicKey;
}

/** Every family rule in descending precedence order, which is the order the service must try them in. */
const FAMILY_RULES: readonly FamilyRule[] = [
  { family: "dots", key: "isDots" },
  { family: "lines", key: "isLines" },
  { family: "bars", key: "isBars" },
  { family: "mesh", key: "isMesh" },
  { family: "comb", key: "isComb" },
  { family: "arcade", key: "isArcade" },
  { family: "parallel", key: "isParallel" },
  { family: "cross", key: "isCross" },
  { family: "fork", key: "isFork" },
  { family: "tree", key: "isPureTree" },
  { family: "boxes", key: "isBoxes" },
  { family: "chain", key: "isChain" },
  { family: "double-chain", key: "isDoubleChain" },
  { family: "waterfalls", key: "isWaterfalls" },
  { family: "whirl", key: "isWhirl" },
  { family: "swirl", key: "isSwirl" },
  { family: "clasps", key: "isClasps" },
  { family: "snake", key: "isSnake" },
  { family: "stipple", key: "isStippled" },
];

/** The families whose predicate compares runs against the unit's width, and so refuse a Code that reduces. */
const UNIT_FAMILIES: ReadonlySet<MeanderFamily> = new Set<MeanderFamily>([
  "chain",
  "double-chain",
]);

/** A band deep enough for every family's structural minimum. */
const DEEPEST_MINIMUM = Math.max(...Object.values(STRUCTURAL_MINIMUM_ROWS));

/** Every pair of rules where the first outranks the second. */
const OUTRANKING_PAIRS = FAMILY_RULES.flatMap((higher, index) =>
  FAMILY_RULES.slice(index + 1).map((lower) => ({ higher, lower })),
);

/** A shape `rows` deep and not reducible, except where `overrides` says otherwise. */
function shape(
  rows: number,
  overrides: Partial<MeanderFiledShape> = {},
): MeanderFiledShape {
  return { isReducible: false, rows, ...overrides };
}

describe(ClassificationService, () => {
  let service: ClassificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ClassificationService],
    }).compile();

    service = await module.resolve(ClassificationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("exports supported families", () => {
    expect(MEANDER_FAMILIES).toStrictEqual([
      "dots",
      "lines",
      "bars",
      "mesh",
      "parallel",
      "cross",
      "arcade",
      "comb",
      "fork",
      "tree",
      "boxes",
      "chain",
      "double-chain",
      "waterfalls",
      "whirl",
      "swirl",
      "clasps",
      "snake",
      "stipple",
      "unclassified",
    ]);
  });

  it("tries its rules in descending precedence order", () => {
    expect(service.rules().map((rule) => rule.name)).toStrictEqual(
      FAMILY_RULES.map(({ family }) => family),
    );
  });

  it("returns unclassified when no family predicate holds", () => {
    expect(
      service.classify(characteristicRecord(), shape(DEEPEST_MINIMUM)),
    ).toBe("unclassified");
  });

  it("keeps boxes at least as deep as waterfalls, so the boxes predicate's own waterfalls exclusion always applies within the boxes rule", () => {
    expect(STRUCTURAL_MINIMUM_ROWS.boxes).toBeGreaterThanOrEqual(
      STRUCTURAL_MINIMUM_ROWS.waterfalls,
    );
  });

  describe.each(FAMILY_RULES)("$family", ({ family, key }) => {
    const minimum = STRUCTURAL_MINIMUM_ROWS[family];

    it(`classifies a record whose ${key} holds, at the family's minimum rows`, () => {
      expect(
        service.classify(characteristicRecord({ [key]: true }), shape(minimum)),
      ).toBe(family);
    });

    it(`classifies a record whose ${key} holds, deeper than the family's minimum`, () => {
      expect(
        service.classify(
          characteristicRecord({ [key]: true }),
          shape(minimum + 3),
        ),
      ).toBe(family);
    });

    it(`does not classify a record whose ${key} holds one row short of the family's minimum`, () => {
      expect(
        service.classify(
          characteristicRecord({ [key]: true }),
          shape(minimum - 1),
        ),
      ).toBe("unclassified");
    });

    it(`does not classify a record whose ${key} is false`, () => {
      expect(
        service.classify(
          characteristicRecord({ [key]: false }),
          shape(DEEPEST_MINIMUM),
        ),
      ).toBe("unclassified");
    });
  });

  describe.each(
    FAMILY_RULES.filter(({ family }) => !UNIT_FAMILIES.has(family)),
  )("$family for a reducible Code", ({ family, key }) => {
    it("still classifies, since its predicate does not read the filed width", () => {
      expect(
        service.classify(
          characteristicRecord({ [key]: true }),
          shape(DEEPEST_MINIMUM, { isReducible: true }),
        ),
      ).toBe(family);
    });
  });

  describe.each(FAMILY_RULES.filter(({ family }) => UNIT_FAMILIES.has(family)))(
    "$family for a reducible Code",
    ({ family, key }) => {
      it("does not classify, since its runs are measured against the unit rather than the Code as filed", () => {
        expect(
          service.classify(
            characteristicRecord({ [key]: true }),
            shape(DEEPEST_MINIMUM, { isReducible: true }),
          ),
        ).toBe("unclassified");
      });

      it("falls through to the next family whose predicate holds", () => {
        expect(
          service.classify(
            characteristicRecord({ isWaterfalls: true, [key]: true }),
            shape(DEEPEST_MINIMUM, { isReducible: true }),
          ),
        ).toBe("waterfalls");
      });

      it("classifies the same record when the Code is its own unit", () => {
        expect(
          service.classify(
            characteristicRecord({ [key]: true }),
            shape(DEEPEST_MINIMUM),
          ),
        ).toBe(family);
      });
    },
  );

  describe.each(OUTRANKING_PAIRS)(
    "$higher.family over $lower.family",
    ({ higher, lower }) => {
      it("picks the higher-precedence family when both predicates hold", () => {
        expect(
          service.classify(
            characteristicRecord({ [higher.key]: true, [lower.key]: true }),
            shape(DEEPEST_MINIMUM),
          ),
        ).toBe(higher.family);
      });
    },
  );

  it("falls through to a lower family when a higher one's predicate holds but its band is too shallow", () => {
    expect(
      service.classify(
        characteristicRecord({ isBoxes: true, isWaterfalls: true }),
        shape(STRUCTURAL_MINIMUM_ROWS.boxes - 1),
      ),
    ).toBe("waterfalls");
  });
});
