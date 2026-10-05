import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { ALatinLetterCharacteristicsService } from "./a-latin-letter-characteristics.service";
import { AinArabicLetterCharacteristicsService } from "./ain-arabic-letter-characteristics.service";
import { AlefArabicLetterCharacteristicsService } from "./alef-arabic-letter-characteristics.service";
import { AoHanziLetterCharacteristicsService } from "./ao-hanzi-letter-characteristics.service";
import { BLatinLetterCharacteristicsService } from "./b-latin-letter-characteristics.service";
import { BehArabicLetterCharacteristicsService } from "./beh-arabic-letter-characteristics.service";
import { CLatinLetterCharacteristicsService } from "./c-latin-letter-characteristics.service";
import { DalArabicLetterCharacteristicsService } from "./dal-arabic-letter-characteristics.service";
import { DaletHebrewLetterCharacteristicsService } from "./dalet-hebrew-letter-characteristics.service";
import { DeltaGreekLetterCharacteristicsService } from "./delta-greek-letter-characteristics.service";
import { ELatinLetterCharacteristicsService } from "./e-latin-letter-characteristics.service";
import { FLatinLetterCharacteristicsService } from "./f-latin-letter-characteristics.service";
import { FehArabicLetterCharacteristicsService } from "./feh-arabic-letter-characteristics.service";
import { GanHanziLetterCharacteristicsService } from "./gan-hanzi-letter-characteristics.service";
import { HLatinLetterCharacteristicsService } from "./h-latin-letter-characteristics.service";
import { HahArabicLetterCharacteristicsService } from "./hah-arabic-letter-characteristics.service";
import { HehArabicLetterCharacteristicsService } from "./heh-arabic-letter-characteristics.service";
import { ILatinLetterCharacteristicsService } from "./i-latin-letter-characteristics.service";
import { JiaHanziLetterCharacteristicsService } from "./jia-hanzi-letter-characteristics.service";
import { JingHanziLetterCharacteristicsService } from "./jing-hanzi-letter-characteristics.service";
import { KafArabicLetterCharacteristicsService } from "./kaf-arabic-letter-characteristics.service";
import { KappaGreekLetterCharacteristicsService } from "./kappa-greek-letter-characteristics.service";
import { KieukHangulLetterCharacteristicsService } from "./kieuk-hangul-letter-characteristics.service";
import { LLatinLetterCharacteristicsService } from "./l-latin-letter-characteristics.service";
import { LamArabicLetterCharacteristicsService } from "./lam-arabic-letter-characteristics.service";
import { LambdaGreekLetterCharacteristicsService } from "./lambda-greek-letter-characteristics.service";
import { LamedHebrewLetterCharacteristicsService } from "./lamed-hebrew-letter-characteristics.service";
import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { LetterUtilitiesService } from "./letter-utilities.service";
import { LETTER_ORIENTATION_NAMES, LETTER_SCRIPTS } from "./letter.constants";
import { MLatinLetterCharacteristicsService } from "./m-latin-letter-characteristics.service";
import { MeemArabicLetterCharacteristicsService } from "./meem-arabic-letter-characteristics.service";
import { MuHanziLetterCharacteristicsService } from "./mu-hanzi-letter-characteristics.service";
import { NLatinLetterCharacteristicsService } from "./n-latin-letter-characteristics.service";
import { NoonArabicLetterCharacteristicsService } from "./noon-arabic-letter-characteristics.service";
import { OLatinLetterCharacteristicsService } from "./o-latin-letter-characteristics.service";
import { OmegaGreekLetterCharacteristicsService } from "./omega-greek-letter-characteristics.service";
import { PhiGreekLetterCharacteristicsService } from "./phi-greek-letter-characteristics.service";
import { PieupHangulLetterCharacteristicsService } from "./pieup-hangul-letter-characteristics.service";
import { PsiGreekLetterCharacteristicsService } from "./psi-greek-letter-characteristics.service";
import { QafArabicLetterCharacteristicsService } from "./qaf-arabic-letter-characteristics.service";
import { RehArabicLetterCharacteristicsService } from "./reh-arabic-letter-characteristics.service";
import { RhoGreekLetterCharacteristicsService } from "./rho-greek-letter-characteristics.service";
import { SLatinLetterCharacteristicsService } from "./s-latin-letter-characteristics.service";
import { SadArabicLetterCharacteristicsService } from "./sad-arabic-letter-characteristics.service";
import { SeenArabicLetterCharacteristicsService } from "./seen-arabic-letter-characteristics.service";
import { ShangHanziLetterCharacteristicsService } from "./shang-hanzi-letter-characteristics.service";
import { ShenHanziLetterCharacteristicsService } from "./shen-hanzi-letter-characteristics.service";
import { SigmaGreekLetterCharacteristicsService } from "./sigma-greek-letter-characteristics.service";
import { TLatinLetterCharacteristicsService } from "./t-latin-letter-characteristics.service";
import { TahArabicLetterCharacteristicsService } from "./tah-arabic-letter-characteristics.service";
import { TavHebrewLetterCharacteristicsService } from "./tav-hebrew-letter-characteristics.service";
import { TianHanziLetterCharacteristicsService } from "./tian-hanzi-letter-characteristics.service";
import { TuHanziLetterCharacteristicsService } from "./tu-hanzi-letter-characteristics.service";
import { TuSoilHanziLetterCharacteristicsService } from "./tu-soil-hanzi-letter-characteristics.service";
import { ULatinLetterCharacteristicsService } from "./u-latin-letter-characteristics.service";
import { WLatinLetterCharacteristicsService } from "./w-latin-letter-characteristics.service";
import { WangHanziLetterCharacteristicsService } from "./wang-hanzi-letter-characteristics.service";
import { WawArabicLetterCharacteristicsService } from "./waw-arabic-letter-characteristics.service";
import { XLatinLetterCharacteristicsService } from "./x-latin-letter-characteristics.service";
import { YLatinLetterCharacteristicsService } from "./y-latin-letter-characteristics.service";
import { YaHangulLetterCharacteristicsService } from "./ya-hangul-letter-characteristics.service";
import { YehArabicLetterCharacteristicsService } from "./yeh-arabic-letter-characteristics.service";
import { YeoHangulLetterCharacteristicsService } from "./yeo-hangul-letter-characteristics.service";
import { YoHangulLetterCharacteristicsService } from "./yo-hangul-letter-characteristics.service";
import { YouHanziLetterCharacteristicsService } from "./you-hanzi-letter-characteristics.service";
import { YuHangulLetterCharacteristicsService } from "./yu-hangul-letter-characteristics.service";
import { YuKatakanaLetterCharacteristicsService } from "./yu-katakana-letter-characteristics.service";
import { ZLatinLetterCharacteristicsService } from "./z-latin-letter-characteristics.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";
import type { LetterScript } from "./letter.types";
import type { Type } from "@nestjs/common";

/** Every letter service the module provides. */
const LETTERS: readonly Type<CharacteristicEvaluatorGroup<number>>[] = [
  ALatinLetterCharacteristicsService,
  AinArabicLetterCharacteristicsService,
  AlefArabicLetterCharacteristicsService,
  AoHanziLetterCharacteristicsService,
  BLatinLetterCharacteristicsService,
  BehArabicLetterCharacteristicsService,
  CLatinLetterCharacteristicsService,
  DalArabicLetterCharacteristicsService,
  DaletHebrewLetterCharacteristicsService,
  DeltaGreekLetterCharacteristicsService,
  ELatinLetterCharacteristicsService,
  FLatinLetterCharacteristicsService,
  FehArabicLetterCharacteristicsService,
  GanHanziLetterCharacteristicsService,
  HLatinLetterCharacteristicsService,
  HahArabicLetterCharacteristicsService,
  HehArabicLetterCharacteristicsService,
  ILatinLetterCharacteristicsService,
  JiaHanziLetterCharacteristicsService,
  JingHanziLetterCharacteristicsService,
  KafArabicLetterCharacteristicsService,
  KappaGreekLetterCharacteristicsService,
  KieukHangulLetterCharacteristicsService,
  LLatinLetterCharacteristicsService,
  LamArabicLetterCharacteristicsService,
  LambdaGreekLetterCharacteristicsService,
  LamedHebrewLetterCharacteristicsService,
  MLatinLetterCharacteristicsService,
  MeemArabicLetterCharacteristicsService,
  MuHanziLetterCharacteristicsService,
  NLatinLetterCharacteristicsService,
  NoonArabicLetterCharacteristicsService,
  OLatinLetterCharacteristicsService,
  OmegaGreekLetterCharacteristicsService,
  PhiGreekLetterCharacteristicsService,
  PieupHangulLetterCharacteristicsService,
  PsiGreekLetterCharacteristicsService,
  QafArabicLetterCharacteristicsService,
  RehArabicLetterCharacteristicsService,
  RhoGreekLetterCharacteristicsService,
  SLatinLetterCharacteristicsService,
  SadArabicLetterCharacteristicsService,
  SeenArabicLetterCharacteristicsService,
  ShangHanziLetterCharacteristicsService,
  ShenHanziLetterCharacteristicsService,
  SigmaGreekLetterCharacteristicsService,
  TLatinLetterCharacteristicsService,
  TahArabicLetterCharacteristicsService,
  TavHebrewLetterCharacteristicsService,
  TianHanziLetterCharacteristicsService,
  TuHanziLetterCharacteristicsService,
  TuSoilHanziLetterCharacteristicsService,
  ULatinLetterCharacteristicsService,
  WLatinLetterCharacteristicsService,
  WangHanziLetterCharacteristicsService,
  WawArabicLetterCharacteristicsService,
  XLatinLetterCharacteristicsService,
  YLatinLetterCharacteristicsService,
  YaHangulLetterCharacteristicsService,
  YehArabicLetterCharacteristicsService,
  YeoHangulLetterCharacteristicsService,
  YoHangulLetterCharacteristicsService,
  YouHanziLetterCharacteristicsService,
  YuHangulLetterCharacteristicsService,
  YuKatakanaLetterCharacteristicsService,
  ZLatinLetterCharacteristicsService,
];

/** The token a consumer module gathers every letter service under, through a factory whose `inject` list only resolves exported providers. */
const GROUPS = Symbol("GROUPS");

/** The script a letter key names, read from its end: `daletSouthwestHebrewCount` is Hebrew. */
const SCRIPT = new RegExp(
  `(${Object.keys(LETTER_SCRIPTS).join("|")})Count$`,
  "u",
);

/** A letter key's orientation name and script, read from its end, leaving the letter and any positional form: `behInitialSouthwestArabicCount` leaves `behInitial`. */
const ORIENTATION = new RegExp(
  `(?:${LETTER_ORIENTATION_NAMES.join("|")})(?:${Object.keys(LETTER_SCRIPTS).join("|")})Count$`,
  "u",
);

/** Whether a string names a letter script, so a key's script can be looked up without a cast. */
function isLetterScript(value: string | undefined): value is LetterScript {
  return value !== undefined && Object.hasOwn(LETTER_SCRIPTS, value);
}

/**
 * The glyph a letter formula typesets, with its blank border rows and columns
 * trimmed, so a template padded with blanks reads as the glyph it pads.
 */
function trimmedGlyph(formula: string): string {
  const blank = String.raw`\cdot`;
  const matrix = /\\begin\{matrix\} (.*) \\end\{matrix\}/u.exec(formula)?.[1];
  const rows = (matrix ?? "")
    .split(String.raw` \\ `)
    .map((row) => row.split(" & "));
  const inkedRows = rows.flatMap((cells, row) =>
    cells.some((cell) => cell !== blank) ? [row] : [],
  );
  const inkedColumns = rows.flatMap((cells) =>
    cells.flatMap((cell, column) => (cell === blank ? [] : [column])),
  );
  const left = Math.min(...inkedColumns);
  const right = Math.max(...inkedColumns);

  return rows
    .slice(Math.min(...inkedRows), Math.max(...inkedRows) + 1)
    .map((cells) => cells.slice(left, right + 1).join(" & "))
    .join(String.raw` \\ `);
}

/** Each arm a Code digit can carry: its bit, the step to the neighbor it reaches, and the bit that neighbor must carry back. */
const ARMS = [
  { back: 4, bit: 8, column: 0, row: -1 },
  { back: 8, bit: 4, column: 0, row: 1 },
  { back: 1, bit: 2, column: 1, row: 0 },
  { back: 2, bit: 1, column: -1, row: 0 },
] as const;

/** The arms of the point at `(row, column)`, or none for a blank or a point off the glyph's edge. */
function armsAt(
  digits: readonly (readonly number[])[],
  row: number,
  column: number,
): number {
  return Math.max(0, digits[row]?.[column] ?? 0);
}

/** A trimmed glyph read back into its Code digits, row by row, with each blank as -1. */
function glyphDigits(glyph: string): number[][] {
  return glyph
    .split(String.raw` \\ `)
    .map((row) =>
      row
        .split(" & ")
        .map((cell) =>
          cell === String.raw`\cdot` ? -1 : Number.parseInt(cell, 16),
        ),
    );
}

/** The neighbors a point's arms reach that carry each arm back. */
function joinedNeighbors(
  digits: readonly (readonly number[])[],
  row: number,
  column: number,
): { column: number; row: number }[] {
  return ARMS.filter(
    (arm) =>
      (armsAt(digits, row, column) & arm.bit) !== 0 &&
      (armsAt(digits, row + arm.row, column + arm.column) & arm.back) !== 0,
  ).map((arm) => ({ column: column + arm.column, row: row + arm.row }));
}

/**
 * What is wrong with a glyph as ink: every arm with no inked neighbor
 * carrying it back, which covers an arm pointing at a blank or off the edge,
 * and whether its ink falls apart into more than one piece.
 */
function malformations(glyph: string): string[] {
  const digits = glyphDigits(glyph);
  const inked = digits.flatMap((cells, row) =>
    cells.flatMap((digit, column) => (digit < 0 ? [] : [{ column, row }])),
  );
  const unanswered = inked.flatMap(({ column, row }) => {
    const arms = ARMS.filter(
      ({ bit }) => (armsAt(digits, row, column) & bit) !== 0,
    ).length;
    return joinedNeighbors(digits, row, column).length === arms
      ? []
      : [`arm not carried back at row ${row}, column ${column}`];
  });
  const reached = new Set<string>();
  const frontier = inked.slice(0, 1);
  for (let next = frontier.pop(); next !== undefined; next = frontier.pop()) {
    const cell = `${next.row},${next.column}`;
    if (!reached.has(cell)) {
      reached.add(cell);
      frontier.push(...joinedNeighbors(digits, next.row, next.column));
    }
  }

  return reached.size === inked.length
    ? unanswered
    : [...unanswered, "ink in more than one piece"];
}

describe(LetterCharacteristicsModule, () => {
  let groups: readonly CharacteristicEvaluatorGroup<number>[];
  let utilities: LetterUtilitiesService;

  /** A letter's base evaluators, one per positional form: each form's unturned orientation at its script's base corner. */
  function bases(
    evaluators: readonly CharacteristicEvaluator<number>[],
  ): readonly CharacteristicEvaluator<number>[] {
    return evaluators.filter(({ metadata }) => {
      const script = SCRIPT.exec(metadata.key)?.[1];

      return (
        isLetterScript(script) &&
        metadata.key.endsWith(`${utilities.baseCorner(script)}${script}Count`)
      );
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LetterCharacteristicsModule],
      providers: [
        {
          inject: [...LETTERS],
          provide: GROUPS,
          useFactory: (
            ...injected: CharacteristicEvaluatorGroup<number>[]
          ): CharacteristicEvaluatorGroup<number>[] => injected,
        },
      ],
    }).compile();

    groups = module.get<CharacteristicEvaluatorGroup<number>[]>(GROUPS);
    utilities = module.get(LetterUtilitiesService);
  });

  it.each(
    LETTERS.map((service, index) => ({ index, name: service.name, service })),
  )(
    "exports $name to a consumer, with sixteen orientation evaluators per form",
    ({ index, service }) => {
      expect(groups[index]).toBeInstanceOf(service);

      const keys = (groups[index]?.evaluators ?? []).map(
        ({ metadata }) => metadata.key,
      );
      const forms = new Set(keys.map((key) => key.replace(ORIENTATION, "")));

      expect(keys).toHaveLength(LETTER_ORIENTATION_NAMES.length * forms.size);
    },
  );

  it("reads a template padded with blank rows and columns as the glyph it pads", () => {
    const submatrix = new SubmatrixUtilitiesService();

    expect(
      trimmedGlyph(submatrix.glyphFormula(["....", ".25.", ".29.", "...."])),
    ).toBe(trimmedGlyph(submatrix.glyphFormula(["25", "29"])));
  });

  it("finds a base orientation for every letter", () => {
    expect(
      groups.map(({ evaluators }) => bases(evaluators).length > 0),
    ).toStrictEqual(groups.map(() => true));
  });

  it("gives every letter and form its own base shape, so no two share an upright glyph", () => {
    const shapes = groups.flatMap(({ evaluators }) =>
      bases(evaluators).map(({ metadata }) =>
        trimmedGlyph(metadata.formula ?? ""),
      ),
    );

    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("draws every letter's base as one piece of ink whose every arm meets a neighbor's arm", () => {
    const malformed = groups.flatMap(({ evaluators }) =>
      bases(evaluators).flatMap(({ metadata }) => {
        const problems = malformations(trimmedGlyph(metadata.formula ?? ""));
        return problems.length === 0 ? [] : [{ key: metadata.key, problems }];
      }),
    );

    expect(malformed).toStrictEqual([]);
  });
});
