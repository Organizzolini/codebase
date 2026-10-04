import { CharacteristicContextService } from "../src/modules/characteristics/characteristic-context.service";
import { LetterUtilitiesService } from "../src/modules/characteristics/submatrix/letter/letter-utilities.service";
import { LETTER_ORIENTATION_NAMES } from "../src/modules/characteristics/submatrix/letter/letter.constants";
import { SubmatrixUtilitiesService } from "../src/modules/characteristics/submatrix/submatrix-utilities.service";
import { CodeModule } from "../src/modules/code/code.module";
import { MatrixModule } from "../src/modules/matrix/matrix.module";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
  SubmatrixWindow,
} from "../src/modules/characteristics/characteristics.types";
import type { LetterOrientationName } from "../src/modules/characteristics/submatrix/letter/letter.types";
import type { ModuleMetadata, Type } from "@nestjs/common";

/**
 * Compiles one letter service for its unit test and reads its sixteen
 * orientation evaluators back by name — sixteen per positional form for an
 * Arabic letter — so each letter's test states only its own fixtures: every
 * distinct orientation drawn as a Code holding one isolated copy, beside
 * every orientation name that draws that ink.
 */

// 🏷️ Types

/** One alias of a letter, and every orientation name drawing the ink it reads as. */
export interface LetterAliasFixture {
  readonly alias: string;
  readonly names: readonly LetterOrientationName[];
}

/** One positional form of a letter: the key prefix its evaluators share, each distinct orientation of its ink, and each of its aliases. */
export interface LetterFormFixture {
  readonly aliases: readonly LetterAliasFixture[];
  readonly orientations: readonly LetterOrientationFixture[];
  readonly prefix: string;
}

/** A compiled letter service's evaluators, read by orientation name, with `form` narrowing them to one positional form's. */
export interface LetterHarness extends LetterReadings {
  /** Compiles the letter service; the letter's test runs it in `beforeAll`. */
  compile(): Promise<void>;
  /** The same readings of only the evaluators whose keys are `prefix` followed by an orientation name, such as one Arabic positional form's `behInitial`. */
  form(prefix: string): LetterReadings;
}

/**
 * Compiles a testing module — `Test.createTestingModule(metadata).compile()`
 * — passed in by the letter's test, which owns the Nest testing dependency.
 */
export type LetterModuleCompiler = (
  metadata: ModuleMetadata,
) => Promise<{ resolve<T>(type: Type<T>): Promise<T> }>;

/** One distinct orientation of a letter: a Code holding one isolated copy of its ink, and every orientation name drawing that ink. */
export interface LetterOrientationFixture {
  readonly fixture: string;
  readonly names: readonly LetterOrientationName[];
}

/** A set of sixteen orientation evaluators, read by orientation name; a reading by name throws unless exactly sixteen are selected. */
export interface LetterReadings {
  /** Each orientation's count of a fixture's ink, in orientation-name order. */
  counts(
    fixture: string,
  ): readonly (readonly [LetterOrientationName, number])[];
  /** The span of a fixture's inked points, in lattice points. */
  inkedWindow(fixture: string): SubmatrixWindow;
  /** Every evaluator's metadata key, in evaluator order. */
  keys(): readonly string[];
  /** The orientation names whose descriptions mention `text`, in orientation-name order. */
  namesDescribing(text: string): readonly LetterOrientationName[];
  /** The declared window of each named orientation. */
  windows(
    names: readonly LetterOrientationName[],
  ): readonly (SubmatrixWindow | undefined)[];
}

// 🌎 Utilities

/** The counts a fixture should get: one under each name that draws its ink and zero under every other, in orientation-name order. */
export function expectedCounts(
  names: readonly LetterOrientationName[],
): readonly (readonly [LetterOrientationName, number])[] {
  return LETTER_ORIENTATION_NAMES.map((name) => [
    name,
    names.includes(name) ? 1 : 0,
  ]);
}

/** Reads `service`'s evaluators back by orientation name once its `compile` — run by the test's `beforeAll` — has compiled it with `compileModule`. */
export function letterHarness(
  service: Type<CharacteristicEvaluatorGroup<number>>,
  compileModule: LetterModuleCompiler,
): LetterHarness {
  let contextService: CharacteristicContextService;
  let evaluators: readonly CharacteristicEvaluator<number>[] = [];

  const compile = async (): Promise<void> => {
    const module = await compileModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LetterUtilitiesService,
        SubmatrixUtilitiesService,
        service,
      ],
    });

    contextService = await module.resolve(CharacteristicContextService);
    const group = await module.resolve(service);
    evaluators = group.evaluators;
  };

  /** The readings of whichever evaluators `select` returns when a reading is taken, so a form narrowed before `compile` reads the compiled evaluators. */
  const readings = (
    select: () => readonly CharacteristicEvaluator<number>[],
  ): LetterReadings => {
    const named = (
      name: LetterOrientationName,
    ): CharacteristicEvaluator<number> | undefined => {
      const selected = select();
      if (selected.length !== LETTER_ORIENTATION_NAMES.length) {
        throw new RangeError(
          `Read ${selected.length} evaluators by orientation name, which needs exactly ${LETTER_ORIENTATION_NAMES.length}: narrow a letter with several forms to one with \`form\``,
        );
      }

      return selected[LETTER_ORIENTATION_NAMES.indexOf(name)];
    };

    return {
      counts: (fixture) => {
        const context = contextService.create(fixture);
        return LETTER_ORIENTATION_NAMES.map((name) => [
          name,
          named(name)?.compute(context) ?? -1,
        ]);
      },
      inkedWindow: (fixture) => {
        const inked = contextService
          .create(fixture)
          .matrix.flatMap((points, row) =>
            points.flatMap((point, column) =>
              Object.values(point).includes(true) ? [{ column, row }] : [],
            ),
          );
        return {
          columns: new Set(inked.map(({ column }) => column)).size,
          rows: new Set(inked.map(({ row }) => row)).size,
        };
      },
      keys: () => select().map(({ metadata }) => metadata.key),
      namesDescribing: (text) =>
        LETTER_ORIENTATION_NAMES.filter(
          (name) => named(name)?.metadata.description.includes(text) === true,
        ),
      windows: (names) => names.map((name) => named(name)?.metadata.submatrix),
    };
  };

  return {
    ...readings(() => evaluators),
    compile,
    form: (prefix) =>
      readings(() => {
        const pattern = new RegExp(
          `^${prefix}(?:${LETTER_ORIENTATION_NAMES.join("|")})`,
          "u",
        );

        return evaluators.filter(({ metadata }) => pattern.test(metadata.key));
      }),
  };
}
