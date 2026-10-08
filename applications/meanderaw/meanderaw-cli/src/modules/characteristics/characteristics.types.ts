// 🏷️ Types

import type { CodeObject } from "../code/code.types";
import type { Matrix } from "../matrix/matrix.types";
import type {
  BOOLEAN_CHARACTERISTIC_KEYS,
  CHARACTERISTIC_KEYS,
  LETTER_CHARACTERISTIC_KEYS,
  NUMERIC_CHARACTERISTIC_KEYS,
  PATTERN_CHARACTERISTIC_KEYS,
  STORED_BOOLEAN_KEYS,
} from "./characteristics.constants";

/** The key of a characteristic whose value is a boolean: see {@link BOOLEAN_CHARACTERISTIC_KEYS}. */
export type BooleanCharacteristicKey =
  (typeof BOOLEAN_CHARACTERISTIC_KEYS)[number];

/**
 * A discovered provider shaped like an evaluator — a `compute` method and a
 * `metadata` object naming a string key and value type — before its key and
 * value type are checked against the key lists.
 */
export interface CandidateEvaluator {
  compute(context: CharacteristicContext): unknown;
  readonly metadata: {
    readonly key: string;
    readonly valueType: unknown;
  };
}

/**
 * The tier a characteristic is measured in: `submatrix` reads local windows
 * of the grid (a single point or an M×N sliding window), `path` walks the ink
 * as a graph over the cyclic band, and `compound` combines other
 * characteristics' values rather than reading the grid itself.
 */
export type CharacteristicCategory = "compound" | "path" | "submatrix";

/**
 * Everything an evaluator may read about one meander, prepared once by the
 * caller and shared by every evaluator — so no evaluator depends on another
 * having run first.
 *
 * `matrix` is the decoded grid indexed `[row][column]`; its columns wrap
 * cyclically, which `MatrixService.pointAt` and `MatrixService.submatrices`
 * already honour. `rows` and `columns` restate its shape so an evaluator need
 * not guard an empty first row.
 */
export interface CharacteristicContext {
  readonly code: CodeObject;
  readonly columns: number;
  readonly matrix: Matrix;
  readonly rows: number;
}

/**
 * One characteristic as a self-describing service: the metadata that names
 * and explains it, and the pure computation of its value from a context.
 *
 * An evaluator that needs another characteristic's value injects that
 * evaluator's service and calls its `compute` with the same context.
 */
export interface CharacteristicEvaluator<
  T extends CharacteristicValue = CharacteristicValue,
> {
  compute(context: CharacteristicContext): T;
  readonly metadata: CharacteristicMetadata<T>;
}

/**
 * A provider holding several evaluators rather than being one — a letter
 * service, whose sixteen orientations are each an evaluator with its own key
 * and metadata. `CharacteristicsService` registers every member of every
 * group it discovers exactly as it registers a lone evaluator.
 */
export interface CharacteristicEvaluatorGroup<
  T extends CharacteristicValue = CharacteristicValue,
> {
  readonly evaluators: readonly CharacteristicEvaluator<T>[];
}

/** The key of any registered characteristic: see {@link CHARACTERISTIC_KEYS}. */
export type CharacteristicKey = (typeof CHARACTERISTIC_KEYS)[number];

/** The key a characteristic yielding `T` may carry, derived from the value type so a numeric evaluator cannot claim a boolean key. */
export type CharacteristicKeyOf<T extends CharacteristicValue> =
  T extends boolean ? BooleanCharacteristicKey : NumericCharacteristicKey;

/**
 * What a characteristic is, for people and catalogs rather than for the
 * computation: its camelCase `key` (the record field, and the key of a
 * stored row's `characteristics` map, it fills), a display `name`, a one-sentence `description`, its tier, and the
 * type of value it yields. `formula` is a LaTeX expression of the definition,
 * and `documentationUrl` links a fuller explanation where one exists.
 *
 * A `submatrix` characteristic must also declare the `submatrix` window it
 * reads; a `path` or `compound` one reads no window and must not.
 */
export type CharacteristicMetadata<
  T extends CharacteristicValue = CharacteristicValue,
> =
  | (CharacteristicMetadataFields<T> & {
      readonly category: "submatrix";
      readonly submatrix: SubmatrixWindow;
    })
  | (CharacteristicMetadataFields<T> & {
      readonly category: Exclude<CharacteristicCategory, "submatrix">;
      readonly submatrix?: never;
    });

/** The {@link CharacteristicMetadata} fields every category shares. */
export interface CharacteristicMetadataFields<
  T extends CharacteristicValue = CharacteristicValue,
> {
  readonly description: string;
  readonly documentationUrl?: string;
  readonly formula?: string;
  readonly key: CharacteristicKeyOf<T>;
  readonly name: string;
  readonly valueType: CharacteristicValueType<T>;
}

/**
 * Every Characteristic of one meander as a single record, one field per
 * registered evaluator: a number under each numeric key and a boolean under
 * each boolean key. `CharacteristicsService.compute` fills it.
 */
export type Characteristics = NumericCharacteristicRecord &
  Readonly<Record<BooleanCharacteristicKey, boolean>>;

/** Every value a characteristic may yield. */
export type CharacteristicValue = boolean | number;

/** The name of a characteristic value's runtime type, derived from the value type itself so metadata cannot disagree with `compute`. */
export type CharacteristicValueType<T extends CharacteristicValue> =
  T extends boolean ? "boolean" : "number";

/** The key of a letter glyph count: see {@link LETTER_CHARACTERISTIC_KEYS}. */
export type LetterCharacteristicKey =
  (typeof LETTER_CHARACTERISTIC_KEYS)[number];

/** The key of a characteristic whose value is a number: see {@link NUMERIC_CHARACTERISTIC_KEYS}. */
export type NumericCharacteristicKey =
  (typeof NUMERIC_CHARACTERISTIC_KEYS)[number];

/**
 * The numeric half of a {@link Characteristics} record: a number under each
 * numeric key, letters included.
 */
export type NumericCharacteristicRecord = Readonly<
  Record<NumericCharacteristicKey, number>
>;

/** The key of a pattern characteristic: see {@link PATTERN_CHARACTERISTIC_KEYS}. */
export type PatternCharacteristicKey =
  (typeof PATTERN_CHARACTERISTIC_KEYS)[number];

/** A key a stored row's `characteristics` map may hold `true` under: see {@link STORED_BOOLEAN_KEYS}. */
export type StoredBooleanKey = (typeof STORED_BOOLEAN_KEYS)[number];

/**
 * A meander row's `characteristics` map: every numeric characteristic that is
 * not zero under its key, and `true` under every {@link StoredBooleanKey} that
 * holds. A zero or `false` is left out, so a reader takes a missing key as
 * zero or `false`; raw SQL reads one as
 * `COALESCE((characteristics ->> 'key')::numeric, 0)` for the same reason.
 */
export type StoredCharacteristics = Readonly<
  Partial<Record<NumericCharacteristicKey, number>> &
    Partial<Record<StoredBooleanKey, true>>
>;

/**
 * The window a `submatrix` characteristic reads, in lattice points: a fixed
 * glyph's exact template size, 1×1 for a point scan, or — marked `variable` —
 * the smallest window a variable-size scan such as a rectangle can match.
 */
export interface SubmatrixWindow {
  readonly columns: number;
  readonly rows: number;
  readonly variable?: true;
}
