import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  BOOLEAN_CHARACTERISTIC_KEY_SET,
  CHARACTERISTIC_KEYS,
  LETTER_CHARACTERISTIC_KEYS,
} from "./characteristics.constants";
import { CharacteristicsModule } from "./characteristics.module";
import { IsArcadeCharacteristicService } from "./compound/family/is-arcade-characteristic.service";
import { IsBarsCharacteristicService } from "./compound/family/is-bars-characteristic.service";
import { IsBoxesCharacteristicService } from "./compound/family/is-boxes-characteristic.service";
import { IsChainCharacteristicService } from "./compound/family/is-chain-characteristic.service";
import { IsClaspsCharacteristicService } from "./compound/family/is-clasps-characteristic.service";
import { IsCombCharacteristicService } from "./compound/family/is-comb-characteristic.service";
import { IsCrossCharacteristicService } from "./compound/family/is-cross-characteristic.service";
import { IsDotsCharacteristicService } from "./compound/family/is-dots-characteristic.service";
import { IsDoubleChainCharacteristicService } from "./compound/family/is-double-chain-characteristic.service";
import { IsForkCharacteristicService } from "./compound/family/is-fork-characteristic.service";
import { IsLinesCharacteristicService } from "./compound/family/is-lines-characteristic.service";
import { IsMeshCharacteristicService } from "./compound/family/is-mesh-characteristic.service";
import { IsParallelCharacteristicService } from "./compound/family/is-parallel-characteristic.service";
import { IsPureTreeCharacteristicService } from "./compound/family/is-pure-tree-characteristic.service";
import { IsSnakeCharacteristicService } from "./compound/family/is-snake-characteristic.service";
import { IsStippledCharacteristicService } from "./compound/family/is-stippled-characteristic.service";
import { IsSwirlCharacteristicService } from "./compound/family/is-swirl-characteristic.service";
import { IsWaterfallsCharacteristicService } from "./compound/family/is-waterfalls-characteristic.service";
import { IsWhirlCharacteristicService } from "./compound/family/is-whirl-characteristic.service";
import { IsClosedLoopCharacteristicService } from "./compound/structure/is-closed-loop-characteristic.service";
import { IsSingleArcCharacteristicService } from "./compound/structure/is-single-arc-characteristic.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "./path/end/ends-are-lattice-neighbors-characteristic.service";
import { EndsOnBorderRulesCharacteristicService } from "./path/end/ends-on-border-rules-characteristic.service";
import { TileCrossingComponentDeltaCountCharacteristicService } from "./path/tile-crossing/tile-crossing-component-delta-count-characteristic.service";
import { TileCrossingCountCharacteristicService } from "./path/tile-crossing/tile-crossing-count-characteristic.service";
import { TileCrossingCycleCountCharacteristicService } from "./path/tile-crossing/tile-crossing-cycle-count-characteristic.service";
import { BettiNumber0CountCharacteristicService } from "./path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "./path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "./path/topology/free-end-count-characteristic.service";
import { BottomBorderTouchCountCharacteristicService } from "./path/turn/bottom-border-touch-count-characteristic.service";
import { InflectionCountCharacteristicService } from "./path/turn/inflection-count-characteristic.service";
import { MaxMonotonicTurnLengthCharacteristicService } from "./path/turn/max-monotonic-turn-length-characteristic.service";
import { ReversesAtItsTightestTurnCharacteristicService } from "./path/turn/reverses-at-its-tightest-turn-characteristic.service";
import { TightestTurnCountCharacteristicService } from "./path/turn/tightest-turn-count-characteristic.service";
import { TopBorderTouchCountCharacteristicService } from "./path/turn/top-border-touch-count-characteristic.service";
import { TotalTurnCountCharacteristicService } from "./path/turn/total-turn-count-characteristic.service";
import { CornerCountCharacteristicService } from "./submatrix/corner/corner-count-characteristic.service";
import { NorthEastCornerCountCharacteristicService } from "./submatrix/corner/north-east-corner-count-characteristic.service";
import { NorthWestCornerCountCharacteristicService } from "./submatrix/corner/north-west-corner-count-characteristic.service";
import { SouthEastCornerCountCharacteristicService } from "./submatrix/corner/south-east-corner-count-characteristic.service";
import { SouthWestCornerCountCharacteristicService } from "./submatrix/corner/south-west-corner-count-characteristic.service";
import { CrossCountCharacteristicService } from "./submatrix/cross/cross-count-characteristic.service";
import { EmbeddedUCountCharacteristicService } from "./submatrix/embedded/embedded-u-count-characteristic.service";
import { EastForkCountCharacteristicService } from "./submatrix/fork/east-fork-count-characteristic.service";
import { ForkCountCharacteristicService } from "./submatrix/fork/fork-count-characteristic.service";
import { NorthForkCountCharacteristicService } from "./submatrix/fork/north-fork-count-characteristic.service";
import { SouthForkCountCharacteristicService } from "./submatrix/fork/south-fork-count-characteristic.service";
import { WestForkCountCharacteristicService } from "./submatrix/fork/west-fork-count-characteristic.service";
import { LetterCharacteristicsModule } from "./submatrix/letter/letter-characteristics.module";
import {
  LETTER_ORIENTATION_NAMES,
  LETTER_SCRIPTS,
} from "./submatrix/letter/letter.constants";
import { DensityCharacteristicService } from "./submatrix/point/density-characteristic.service";
import { DotCountCharacteristicService } from "./submatrix/point/dot-count-characteristic.service";
import { DoubleHorizontalEdgeCountCharacteristicService } from "./submatrix/point/double-horizontal-edge-count-characteristic.service";
import { DoubleVerticalEdgeCountCharacteristicService } from "./submatrix/point/double-vertical-edge-count-characteristic.service";
import { EastEdgeCountCharacteristicService } from "./submatrix/point/east-edge-count-characteristic.service";
import { EdgeCountCharacteristicService } from "./submatrix/point/edge-count-characteristic.service";
import { InkPointCountCharacteristicService } from "./submatrix/point/ink-point-count-characteristic.service";
import { NorthEdgeCountCharacteristicService } from "./submatrix/point/north-edge-count-characteristic.service";
import { SouthEdgeCountCharacteristicService } from "./submatrix/point/south-edge-count-characteristic.service";
import { WestEdgeCountCharacteristicService } from "./submatrix/point/west-edge-count-characteristic.service";
import { HorizontalRectangleCountCharacteristicService } from "./submatrix/rectangle/horizontal-rectangle-count-characteristic.service";
import { VerticalRectangleCountCharacteristicService } from "./submatrix/rectangle/vertical-rectangle-count-characteristic.service";
import { LongestHorizontalRunLengthCharacteristicService } from "./submatrix/run/longest-horizontal-run-length-characteristic.service";
import { LongestVerticalRunLengthCharacteristicService } from "./submatrix/run/longest-vertical-run-length-characteristic.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
  SubmatrixWindow,
} from "./characteristics.types";
import type { Type } from "@nestjs/common";

/** Whether a module export is a letter service, which its class name marks, so the letter module's exports can be read without a cast. */
function isLetterService(
  value: unknown,
): value is Type<CharacteristicEvaluatorGroup<number>> {
  return (
    typeof value === "function" &&
    value.name.endsWith("LetterCharacteristicsService")
  );
}

/**
 * The letter module's declared exports, read off its `@Module` metadata. It
 * throws when the metadata holds no exports list, so a letter module that
 * stops declaring one fails every test here rather than exporting nothing.
 */
function letterModuleExports(): readonly unknown[] {
  const exported: unknown = Reflect.getMetadata(
    MODULE_METADATA.EXPORTS,
    LetterCharacteristicsModule,
  );
  if (!Array.isArray(exported)) {
    throw new TypeError("LetterCharacteristicsModule declares no exports list");
  }

  return exported;
}

/** Every letter service a consumer of `CharacteristicsModule` must be able to inject, each providing its letter's sixteen orientation evaluators per positional form: every letter service the letter module exports, so a new letter needs no second list here. */
const LETTER_SERVICES: readonly Type<CharacteristicEvaluatorGroup<number>>[] =
  letterModuleExports().filter((value) => isLetterService(value));

/** Every lone characteristic evaluator a consumer of `CharacteristicsModule` must be able to inject. */
const CHARACTERISTIC_SERVICES: readonly Type<CharacteristicEvaluator>[] = [
  BettiNumber0CountCharacteristicService,
  BettiNumber1CountCharacteristicService,
  BottomBorderTouchCountCharacteristicService,
  CornerCountCharacteristicService,
  CrossCountCharacteristicService,
  DensityCharacteristicService,
  DotCountCharacteristicService,
  DoubleHorizontalEdgeCountCharacteristicService,
  DoubleVerticalEdgeCountCharacteristicService,
  EastEdgeCountCharacteristicService,
  EastForkCountCharacteristicService,
  EdgeCountCharacteristicService,
  EmbeddedUCountCharacteristicService,
  EndsAreLatticeNeighborsCharacteristicService,
  EndsOnBorderRulesCharacteristicService,
  ForkCountCharacteristicService,
  FreeEndCountCharacteristicService,
  HorizontalRectangleCountCharacteristicService,
  InflectionCountCharacteristicService,
  InkPointCountCharacteristicService,
  IsArcadeCharacteristicService,
  IsBarsCharacteristicService,
  IsBoxesCharacteristicService,
  IsChainCharacteristicService,
  IsClaspsCharacteristicService,
  IsClosedLoopCharacteristicService,
  IsCombCharacteristicService,
  IsCrossCharacteristicService,
  IsDotsCharacteristicService,
  IsDoubleChainCharacteristicService,
  IsForkCharacteristicService,
  IsLinesCharacteristicService,
  IsMeshCharacteristicService,
  IsParallelCharacteristicService,
  IsPureTreeCharacteristicService,
  IsSingleArcCharacteristicService,
  IsSnakeCharacteristicService,
  IsStippledCharacteristicService,
  IsSwirlCharacteristicService,
  IsWaterfallsCharacteristicService,
  IsWhirlCharacteristicService,
  LongestHorizontalRunLengthCharacteristicService,
  LongestVerticalRunLengthCharacteristicService,
  MaxMonotonicTurnLengthCharacteristicService,
  NorthEastCornerCountCharacteristicService,
  NorthEdgeCountCharacteristicService,
  NorthForkCountCharacteristicService,
  NorthWestCornerCountCharacteristicService,
  ReversesAtItsTightestTurnCharacteristicService,
  SouthEastCornerCountCharacteristicService,
  SouthEdgeCountCharacteristicService,
  SouthForkCountCharacteristicService,
  SouthWestCornerCountCharacteristicService,
  TightestTurnCountCharacteristicService,
  TileCrossingComponentDeltaCountCharacteristicService,
  TileCrossingCountCharacteristicService,
  TileCrossingCycleCountCharacteristicService,
  TopBorderTouchCountCharacteristicService,
  TotalTurnCountCharacteristicService,
  VerticalRectangleCountCharacteristicService,
  WestEdgeCountCharacteristicService,
  WestForkCountCharacteristicService,
];

/** A letter service's class name, read as its key stem and its script: `TuSoilHanziLetterCharacteristicsService` keys `tuSoil…HanziCount`. */
const LETTER_SERVICE_NAME = new RegExp(
  String.raw`^(?<stem>\w+?)(?<script>${Object.keys(LETTER_SCRIPTS).join("|")})LetterCharacteristicsService$`,
  "u",
);

/**
 * The window, in lattice points, each submatrix evaluator other than a letter
 * glyph reads: 1×1 for a point scan or a sum of point scans, and the smallest
 * window for a variable-size scan. A letter glyph's window is checked against
 * its drawn fixture in the letter module's own test.
 */
const WINDOWS: Readonly<Record<string, SubmatrixWindow>> = {
  cornerCount: { columns: 1, rows: 1 },
  crossCount: { columns: 1, rows: 1 },
  density: { columns: 1, rows: 1 },
  dotCount: { columns: 1, rows: 1 },
  doubleHorizontalEdgeCount: { columns: 1, rows: 1 },
  doubleVerticalEdgeCount: { columns: 1, rows: 1 },
  eastEdgeCount: { columns: 1, rows: 1 },
  eastForkCount: { columns: 1, rows: 1 },
  edgeCount: { columns: 1, rows: 1 },
  embeddedUCount: { columns: 2, rows: 2 },
  forkCount: { columns: 1, rows: 1 },
  horizontalRectangleCount: { columns: 3, rows: 2, variable: true },
  inkPointCount: { columns: 1, rows: 1 },
  longestHorizontalRunLength: { columns: 2, rows: 1, variable: true },
  longestVerticalRunLength: { columns: 1, rows: 2, variable: true },
  northEastCornerCount: { columns: 1, rows: 1 },
  northEdgeCount: { columns: 1, rows: 1 },
  northForkCount: { columns: 1, rows: 1 },
  northWestCornerCount: { columns: 1, rows: 1 },
  southEastCornerCount: { columns: 1, rows: 1 },
  southEdgeCount: { columns: 1, rows: 1 },
  southForkCount: { columns: 1, rows: 1 },
  southWestCornerCount: { columns: 1, rows: 1 },
  verticalRectangleCount: { columns: 2, rows: 3, variable: true },
  westEdgeCount: { columns: 1, rows: 1 },
  westForkCount: { columns: 1, rows: 1 },
};

/** The token a consumer module gathers every evaluator under, through a factory whose `inject` list only resolves exported providers. */
const EVALUATORS = Symbol("EVALUATORS");

/** The token a consumer module gathers every letter service under, the same way. */
const LETTERS = Symbol("LETTERS");

/** The metadata key a service's class name promises: `DotCountCharacteristicService` fills `dotCount`. */
function expectedKey(service: Type<CharacteristicEvaluator>): string {
  const stem = service.name.replace(/CharacteristicService$/u, "");

  return stem.charAt(0).toLowerCase() + stem.slice(1);
}

/**
 * The metadata keys a letter service's class name promises, in key-list
 * order: its letter's sixteen orientations, under each positional form the
 * key list gives an Arabic letter. `ALatinLetterCharacteristicsService`
 * fills `aSoutheastLatinCount` through `aNorthwestThreeQuarterLatinCount`,
 * and `BehArabicLetterCharacteristicsService` fills
 * `behFinalSoutheastArabicCount` through
 * `behMedialNorthwestThreeQuarterArabicCount`. Which forms a letter takes is
 * read off the key list rather than pinned here; each letter's own test pins
 * its form set.
 */
function expectedLetterKeys(
  service: Type<CharacteristicEvaluatorGroup<number>>,
): readonly string[] {
  const { script = "", stem = "" } =
    LETTER_SERVICE_NAME.exec(service.name)?.groups ?? {};
  const letter = stem.charAt(0).toLowerCase() + stem.slice(1);
  const pattern = new RegExp(
    `^${letter}(?:Final|Initial|Isolated|Medial)?(?:${LETTER_ORIENTATION_NAMES.join("|")})${script}Count$`,
    "u",
  );

  return LETTER_CHARACTERISTIC_KEYS.filter((key) => pattern.test(key));
}

describe(CharacteristicsModule, () => {
  let evaluators: readonly CharacteristicEvaluator[];
  let letters: readonly CharacteristicEvaluatorGroup<number>[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule],
      providers: [
        {
          inject: [...CHARACTERISTIC_SERVICES],
          provide: EVALUATORS,
          useFactory: (
            ...injected: CharacteristicEvaluator[]
          ): CharacteristicEvaluator[] => injected,
        },
        {
          inject: [...LETTER_SERVICES],
          provide: LETTERS,
          useFactory: (
            ...injected: CharacteristicEvaluatorGroup<number>[]
          ): CharacteristicEvaluatorGroup<number>[] => injected,
        },
      ],
    }).compile();

    letters = module.get<CharacteristicEvaluatorGroup<number>[]>(LETTERS);
    evaluators = [
      ...module.get<CharacteristicEvaluator[]>(EVALUATORS),
      ...letters.flatMap((letter) => letter.evaluators),
    ];
  });

  describe.each(
    CHARACTERISTIC_SERVICES.map((service, index) => ({
      index,
      name: service.name,
      service,
    })),
  )("$name", ({ index, service }) => {
    it("is exported to a consumer that imports the module", () => {
      expect(evaluators[index]).toBeInstanceOf(service);
    });

    it("names its metadata key after its class", () => {
      expect(evaluators[index]?.metadata.key).toBe(expectedKey(service));
    });

    it("describes itself with a display name, a description, and a known category", () => {
      const metadata = evaluators[index]?.metadata;

      expect(metadata?.name).not.toBe("");
      expect(metadata?.description).not.toBe("");
      expect(["compound", "path", "submatrix"]).toContain(metadata?.category);
    });

    it("declares a submatrix window exactly when its category is submatrix", () => {
      const metadata = evaluators[index]?.metadata;

      expect(metadata?.submatrix !== undefined).toBe(
        metadata?.category === "submatrix",
      );
    });
  });

  describe.each(
    LETTER_SERVICES.map((service, index) => ({
      index,
      name: service.name,
      service,
    })),
  )("$name", ({ index, service }) => {
    it("is exported to a consumer that imports the module", () => {
      expect(letters[index]).toBeInstanceOf(service);
    });

    it("keys its orientation evaluators after its class", () => {
      expect(
        letters[index]?.evaluators.map(({ metadata }) => metadata.key),
      ).toStrictEqual(expectedLetterKeys(service));
    });

    it("describes every orientation with a display name, a description, and the submatrix category", () => {
      const described = letters[index]?.evaluators.map(
        ({ metadata }) =>
          metadata.name !== "" &&
          metadata.description !== "" &&
          metadata.category === "submatrix",
      );

      expect(described).toStrictEqual(
        expectedLetterKeys(service).map(() => true),
      );
    });
  });

  it("derives every letter key from exactly one letter service's class name", () => {
    expect(
      LETTER_SERVICES.flatMap((service) =>
        expectedLetterKeys(service),
      ).toSorted(),
    ).toStrictEqual([...LETTER_CHARACTERISTIC_KEYS].toSorted());
  });

  it("gives every characteristic evaluator a unique metadata key", () => {
    const keys = evaluators.map((evaluator) => evaluator.metadata.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers exactly the characteristic key list, in both directions", () => {
    const keys = evaluators.map((evaluator) => evaluator.metadata.key);

    expect(keys.toSorted()).toStrictEqual([...CHARACTERISTIC_KEYS].toSorted());
  });

  it("sizes every declared submatrix window in whole lattice points", () => {
    const windows = evaluators.flatMap(({ metadata }) =>
      metadata.submatrix === undefined ? [] : [metadata.submatrix],
    );

    expect(
      windows.filter(
        ({ columns, rows }) =>
          !Number.isInteger(columns) ||
          !Number.isInteger(rows) ||
          columns < 1 ||
          rows < 1,
      ),
    ).toStrictEqual([]);
  });

  it("declares the window each non-letter submatrix evaluator reads", () => {
    const letterKeys: ReadonlySet<string> = new Set(LETTER_CHARACTERISTIC_KEYS);
    const declared = Object.fromEntries(
      evaluators
        .filter(({ metadata }) => !letterKeys.has(metadata.key))
        .flatMap(({ metadata }) =>
          metadata.submatrix === undefined
            ? []
            : [[metadata.key, metadata.submatrix]],
        ),
    );

    expect(declared).toStrictEqual(WINDOWS);
  });

  it("declares the value type each key's list promises", () => {
    const declared = evaluators.map(({ metadata }) => [
      metadata.key,
      metadata.valueType,
    ]);
    const promised = evaluators.map(({ metadata }) => [
      metadata.key,
      BOOLEAN_CHARACTERISTIC_KEY_SET.has(metadata.key) ? "boolean" : "number",
    ]);

    expect(declared).toStrictEqual(promised);
  });
});
