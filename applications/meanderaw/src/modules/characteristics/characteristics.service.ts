import { Inject, Injectable } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";

import { CodeService } from "../code/code.service";

import { CharacteristicContextService } from "./characteristic-context.service";
import {
  BOOLEAN_CHARACTERISTIC_KEY_SET,
  BOOLEAN_CHARACTERISTIC_KEYS,
  CHARACTERISTIC_KEY_SET,
  CHARACTERISTIC_KEYS,
  CharacteristicRegistryError,
  NUMERIC_CHARACTERISTIC_KEYS,
} from "./characteristics.constants";
import { TileCrossingComponentDeltaCountCharacteristicService } from "./path/tile-crossing/tile-crossing-component-delta-count-characteristic.service";

import type { Code, CodeObject } from "../code/code.types";
import type {
  BooleanCharacteristicKey,
  CandidateEvaluator,
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicKey,
  CharacteristicMetadata,
  Characteristics,
  CharacteristicValue,
  CharacteristicValueType,
  NumericCharacteristicRecord,
  StoredCharacteristics,
} from "./characteristics.types";
import type { OnApplicationBootstrap } from "@nestjs/common";

/**
 * Orchestrates every registered characteristic evaluator: finds them all
 * through Nest's `DiscoveryService` rather than a hand-maintained list — a
 * provider that is one evaluator, and each member of a provider that holds a
 * group of them, such as a letter's sixteen orientations —
 * checks them against the key lists in `characteristics.constants` when the
 * application boots, and fills one {@link Characteristics} record per Code
 * from a single shared context.
 *
 * It also reduces a record to the sparse map a meander row stores
 * ({@link CharacteristicsService.stored}).
 *
 * It also answers the two questions about a Code as filed rather than about
 * its repeating unit — whether it reduces, and the canonical-phase
 * tile-crossing score — which is why neither is a field of the record.
 */
@Injectable()
export class CharacteristicsService implements OnApplicationBootstrap {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(CharacteristicContextService)
    private readonly contextService: CharacteristicContextService,
    @Inject(DiscoveryService)
    private readonly discoveryService: DiscoveryService,
    @Inject(TileCrossingComponentDeltaCountCharacteristicService)
    private readonly tileCrossingComponentDeltaCountService: TileCrossingComponentDeltaCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  /**
   * Every evaluator in key-list order, discovered and checked once. The
   * real application always reaches this through
   * {@link onApplicationBootstrap}; the `??=` here only serves a module
   * that is compiled but never initialized, such as a test that never
   * calls `module.init()`.
   */
  private registered: readonly CharacteristicEvaluator[] | undefined;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws unless every key holds a value of the type its key list promises, naming the first that does not. */
  private assertCharacteristics(
    values: Readonly<Record<string, CharacteristicValue>>,
  ): asserts values is Characteristics {
    const mismatch = CHARACTERISTIC_KEYS.find(
      (key) => typeof values[key] !== this.valueTypeOf(key),
    );

    if (mismatch !== undefined) {
      throw new CharacteristicRegistryError(
        `Characteristic "${mismatch}" computed ${typeof values[mismatch]}, but its key promises ${this.valueTypeOf(mismatch)}`,
      );
    }
  }

  /**
   * The evaluator candidates one discovered provider holds: itself when it
   * is shaped like an evaluator, every evaluator-shaped member when it is a
   * group such as a letter service, and none otherwise.
   */
  private candidates(instance: unknown): readonly CandidateEvaluator[] {
    if (this.isCandidateEvaluator(instance)) return [instance];
    if (!this.isCandidateGroup(instance)) return [];

    return instance.evaluators.filter((member) =>
      this.isCandidateEvaluator(member),
    );
  }

  /** Every discovered evaluator, lone or grouped, checked against the key lists and ordered by them. */
  private discover(): readonly CharacteristicEvaluator[] {
    const providers: readonly { readonly instance: unknown }[] =
      this.discoveryService.getProviders();
    const byKey = new Map<string, CharacteristicEvaluator>();

    for (const candidate of providers.flatMap(({ instance }) =>
      this.candidates(instance),
    )) {
      const evaluator = this.verify(candidate);
      if (byKey.has(evaluator.metadata.key)) {
        throw new CharacteristicRegistryError(
          `Two evaluators claim characteristic "${evaluator.metadata.key}"`,
        );
      }
      byKey.set(evaluator.metadata.key, evaluator);
    }

    return CHARACTERISTIC_KEYS.map((key) => {
      const evaluator = byKey.get(key);
      if (evaluator === undefined) {
        throw new CharacteristicRegistryError(
          `No evaluator is registered for characteristic "${key}"`,
        );
      }
      return evaluator;
    });
  }

  /** One evaluator's value for a context, keyed by its characteristic. */
  private entry(
    evaluator: CharacteristicEvaluator,
    context: CharacteristicContext,
  ): [string, CharacteristicValue] {
    return [evaluator.metadata.key, evaluator.compute(context)];
  }

  /** Every evaluator in key-list order, discovering them the first time only. */
  private evaluators(): readonly CharacteristicEvaluator[] {
    this.registered ??= this.discover();

    return this.registered;
  }

  /** Whether a discovered provider has an evaluator's shape: a `compute` method and metadata naming a string key. */
  private isCandidateEvaluator(value: unknown): value is CandidateEvaluator {
    return (
      typeof value === "object" &&
      value !== null &&
      "compute" in value &&
      typeof value.compute === "function" &&
      "metadata" in value &&
      typeof value.metadata === "object" &&
      value.metadata !== null &&
      "key" in value.metadata &&
      typeof value.metadata.key === "string"
    );
  }

  /** Whether a discovered provider is shaped like a `CharacteristicEvaluatorGroup`: an `evaluators` array, its members not yet checked. */
  private isCandidateGroup(
    value: unknown,
  ): value is { readonly evaluators: readonly unknown[] } {
    return (
      typeof value === "object" &&
      value !== null &&
      "evaluators" in value &&
      Array.isArray(value.evaluators)
    );
  }

  /** Whether a candidate's key is in the key list and its declared value type is the one that list promises. */
  private isCharacteristicEvaluator(
    candidate: CandidateEvaluator,
  ): candidate is CharacteristicEvaluator {
    const { key, valueType } = candidate.metadata;

    return this.isCharacteristicKey(key) && valueType === this.valueTypeOf(key);
  }

  /** Whether a string names a registered characteristic. */
  private isCharacteristicKey(key: string): key is CharacteristicKey {
    return CHARACTERISTIC_KEY_SET.has(key);
  }

  /** The value type a key's list promises. */
  private valueTypeOf(
    key: string,
  ): CharacteristicValueType<CharacteristicValue> {
    return BOOLEAN_CHARACTERISTIC_KEY_SET.has(key) ? "boolean" : "number";
  }

  /** The candidate as an evaluator, or a thrown error saying whether its key is unknown or its value type wrong. */
  private verify(candidate: CandidateEvaluator): CharacteristicEvaluator {
    if (this.isCharacteristicEvaluator(candidate)) return candidate;

    const { key, valueType } = candidate.metadata;
    if (!this.isCharacteristicKey(key)) {
      throw new CharacteristicRegistryError(
        `An evaluator claims characteristic "${key}", which is not in the key list`,
      );
    }

    throw new CharacteristicRegistryError(
      `Characteristic "${key}" declares value type ${String(valueType)}, but its key promises ${this.valueTypeOf(key)}`,
    );
  }

  // 🌎 Public Methods

  /** Every characteristic of a Code's repeating unit, computed by every evaluator from one shared context. */
  public compute(code: Code | CodeObject): Characteristics {
    const context = this.contextService.create(code);
    const values = Object.fromEntries(
      this.evaluators().map((evaluator) => this.entry(evaluator, context)),
    );

    this.assertCharacteristics(values);

    return values;
  }

  /** Whether the Code as filed is wider than its repeating unit — a property of the filing, not of the unit, so not a record field. */
  public isReducible(code: Code | CodeObject): boolean {
    const parsed =
      typeof code === "string" ? this.codeService.parse(code) : code;

    return parsed.columns > this.codeService.reduceToUnit(parsed).columns;
  }

  /** Every registered characteristic's metadata, in key-list order. */
  public metadata(): readonly CharacteristicMetadata[] {
    return this.evaluators().map((evaluator) => evaluator.metadata);
  }

  /**
   * Discovers and checks every evaluator as the application boots, so a key
   * with no evaluator, an unknown or doubly claimed key, or a mistyped
   * declaration stops the application before the first Code is measured
   * rather than partway through a draw run. This is the path the real
   * application always takes; {@link evaluators}'s lazy `??=` is not a
   * second production path, only what lets a test compile this module
   * without booting it.
   */
  public onApplicationBootstrap(): void {
    this.evaluators();
  }

  /**
   * A computed record as a meander row's `characteristics` map stores it:
   * every numeric key whose value is not zero, then `true` under every
   * boolean key that holds, then `isReducible` when the filed Code is wider
   * than its unit — each run in key-list order, and no zero or `false` at all.
   */
  public stored(
    characteristics: Characteristics,
    isReducible: boolean,
  ): StoredCharacteristics {
    const numbers: Partial<NumericCharacteristicRecord> = Object.fromEntries(
      NUMERIC_CHARACTERISTIC_KEYS.filter(
        (key) => characteristics[key] !== 0,
      ).map((key) => [key, characteristics[key]]),
    );
    const truths: Partial<Record<BooleanCharacteristicKey, true>> =
      Object.fromEntries(
        BOOLEAN_CHARACTERISTIC_KEYS.filter((key) => characteristics[key]).map(
          (key) => [key, true as const],
        ),
      );

    return {
      ...numbers,
      ...truths,
      ...(isReducible ? { isReducible: true } : {}),
    };
  }

  /**
   * The tile-crossing component delta of the Code exactly as filed, not of
   * its repeating unit — the canonical-phase scorer, which compares cuts of
   * the same band and so must see the width it was cut at.
   */
  public tileCrossingComponentDeltaCount(code: Code | CodeObject): number {
    return this.tileCrossingComponentDeltaCountService.compute(
      this.contextService.createUnreduced(code),
    );
  }
}
