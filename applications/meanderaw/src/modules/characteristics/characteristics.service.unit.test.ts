import { DiscoveryService } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CodeModule } from "../code/code.module";
import { MatrixModule } from "../matrix/matrix.module";

import { CharacteristicContextService } from "./characteristic-context.service";
import {
  BOOLEAN_CHARACTERISTIC_KEY_SET,
  BOOLEAN_CHARACTERISTIC_KEYS,
  CHARACTERISTIC_KEYS,
  CharacteristicRegistryError,
  NUMERIC_CHARACTERISTIC_KEYS,
} from "./characteristics.constants";
import { CharacteristicsService } from "./characteristics.service";
import { TileCrossingComponentDeltaCountCharacteristicService } from "./path/tile-crossing/tile-crossing-component-delta-count-characteristic.service";

import type { ModuleMetadata } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";

/** A provider as `DiscoveryService.getProviders` hands it back: only its instance is read. */
interface Provider {
  readonly instance: unknown;
}

/** The collaborators a registry is compiled with: a discovery that returns whatever `getProviders` returns at the time, and a stubbed tile-crossing scorer. */
function collaborators(
  getProviders: () => readonly Provider[],
): NonNullable<ModuleMetadata["providers"]> {
  return [
    CharacteristicContextService,
    { provide: DiscoveryService, useValue: { getProviders } },
    {
      provide: TileCrossingComponentDeltaCountCharacteristicService,
      useValue: {
        compute: (context: { readonly columns: number }): number =>
          context.columns * 10,
      },
    },
  ];
}

/** A well-formed stand-in for every key: `false` under each boolean key and the key's index under each numeric one. */
function completeRegistry(): Provider[] {
  return CHARACTERISTIC_KEYS.map((key, index) =>
    isBooleanKey(key)
      ? fake(key, "boolean", false)
      : fake(key, "number", index),
  );
}

/** A stand-in evaluator for `key`, claiming `valueType` and yielding `value`. */
function fake(key: string, valueType: string, value: unknown): Provider {
  return {
    instance: {
      compute: (): unknown => value,
      metadata: {
        category: "submatrix",
        description: `Stands in for ${key}.`,
        key,
        name: key,
        submatrix: { columns: 1, rows: 1 },
        valueType,
      },
    },
  };
}

/** Whether `key` is one of the boolean keys, compared as a plain string. */
function isBooleanKey(key: string): boolean {
  return BOOLEAN_CHARACTERISTIC_KEY_SET.has(key);
}

describe(CharacteristicsService, () => {
  let service: CharacteristicsService;
  let contextService: CharacteristicContextService;
  let providers: Provider[];
  let getProviders: () => readonly Provider[];

  /** A compiled, uninitialized module over whatever `providers` holds at the time. */
  async function compiled(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [CharacteristicsService, ...collaborators(getProviders)],
    }).compile();
  }

  /** A fresh service over whatever `providers` holds at the time. */
  async function registry(): Promise<CharacteristicsService> {
    const module = await compiled();

    return module.resolve(CharacteristicsService);
  }

  beforeAll(async () => {
    const complete = completeRegistry();
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [CharacteristicsService, ...collaborators(() => complete)],
    }).compile();

    contextService = module.get(CharacteristicContextService);
    service = await module.resolve(CharacteristicsService);
  });

  beforeEach(() => {
    providers = completeRegistry();
    getProviders = vi.fn<() => readonly Provider[]>(() => providers);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("lists metadata in key-list order whatever order discovery returns", async () => {
    providers.reverse();
    const fresh = await registry();

    expect(fresh.metadata().map((metadata) => metadata.key)).toStrictEqual([
      ...CHARACTERISTIC_KEYS,
    ]);
  });

  it("registers every member of a discovered evaluator group as its own evaluator", async () => {
    const grouped = new Set(["aSoutheastLatinCount", "aSouthwestLatinCount"]);
    const members = providers
      .filter((_provider, index) =>
        grouped.has(CHARACTERISTIC_KEYS[index] ?? ""),
      )
      .map(({ instance }) => instance);
    providers = [
      ...providers.filter(
        (_provider, index) => !grouped.has(CHARACTERISTIC_KEYS[index] ?? ""),
      ),
      { instance: { evaluators: members } },
    ];
    const fresh = await registry();

    expect(fresh.metadata().map((metadata) => metadata.key)).toStrictEqual([
      ...CHARACTERISTIC_KEYS,
    ]);
    expect(fresh.compute("02x01y2c").aSouthwestLatinCount).toBe(
      CHARACTERISTIC_KEYS.indexOf("aSouthwestLatinCount"),
    );
  });

  it("throws when a group and a lone evaluator claim the same key", async () => {
    const member =
      providers[CHARACTERISTIC_KEYS.indexOf("aSoutheastLatinCount")];
    providers.push({ instance: { evaluators: [member?.instance] } });
    const fresh = await registry();

    expect(() => fresh.metadata()).toThrow(/aSoutheastLatinCount/u);
  });

  it("skips discovered providers that are not shaped like evaluators", async () => {
    providers.push(
      { instance: undefined },
      { instance: null },
      { instance: 7 },
      { instance: { compute: (): number => 1 } },
      { instance: { compute: 1, metadata: { key: "dotCount" } } },
      { instance: { compute: (): number => 1, metadata: "dotCount" } },
      { instance: { compute: (): number => 1, metadata: { key: 3 } } },
      { instance: { evaluators: "dotCount" } },
      {
        instance: { evaluators: [7, null, { metadata: { key: "dotCount" } }] },
      },
    );
    const fresh = await registry();

    expect(fresh.metadata()).toHaveLength(CHARACTERISTIC_KEYS.length);
  });

  it("fills a record from one context, each key holding its evaluator's value", () => {
    const create = vi.spyOn(contextService, "create");

    const characteristics = service.compute("02x01y2c");

    expect(create).toHaveBeenCalledTimes(1);
    expect(Object.keys(characteristics)).toHaveLength(
      CHARACTERISTIC_KEYS.length,
    );
    expect(characteristics.dotCount).toBe(
      CHARACTERISTIC_KEYS.indexOf("dotCount"),
    );
    expect(characteristics.isDots).toBe(false);
  });

  it("discovers the evaluators once, however many records it fills", async () => {
    const fresh = await registry();

    fresh.compute("02x01y2c");
    fresh.compute("02x01y3c");
    fresh.metadata();

    expect(getProviders).toHaveBeenCalledTimes(1);
  });

  it("discovers and checks the evaluators when the application boots, before any Code is measured", async () => {
    const module = await compiled();

    await module.init();

    expect(getProviders).toHaveBeenCalledTimes(1);

    module.get(CharacteristicsService).compute("02x01y2c");

    expect(getProviders).toHaveBeenCalledTimes(1);
  });

  it("refuses to boot when a key in the key list has no evaluator", async () => {
    providers = providers.filter(
      (_provider, index) => CHARACTERISTIC_KEYS[index] !== "dotCount",
    );
    const module = await compiled();

    await expect(module.init()).rejects.toThrow(/dotCount/u);
  });

  it("throws when a key in the key list has no evaluator", async () => {
    providers = providers.filter(
      (_provider, index) => CHARACTERISTIC_KEYS[index] !== "dotCount",
    );
    const fresh = await registry();

    expect(() => fresh.metadata()).toThrow(CharacteristicRegistryError);
    expect(() => fresh.compute("02x01y2c")).toThrow(/dotCount/u);
  });

  it("throws when an evaluator's key is not in the key list", async () => {
    providers.push(fake("notACharacteristic", "number", 0));
    const fresh = await registry();

    expect(() => fresh.metadata()).toThrow(/notACharacteristic/u);
  });

  it("throws when two evaluators claim the same key", async () => {
    providers.push(fake("dotCount", "number", 0));
    const fresh = await registry();

    expect(() => fresh.metadata()).toThrow(/dotCount/u);
  });

  it("throws when an evaluator's declared value type disagrees with its key's list", async () => {
    providers = providers.map((provider, index) =>
      CHARACTERISTIC_KEYS[index] === "isDots"
        ? fake("isDots", "number", 0)
        : provider,
    );
    const fresh = await registry();

    expect(() => fresh.metadata()).toThrow(/isDots/u);
  });

  it("throws when an evaluator computes a value of the wrong type", async () => {
    providers = providers.map((provider, index) =>
      CHARACTERISTIC_KEYS[index] === "isDots"
        ? fake("isDots", "boolean", 3)
        : provider,
    );
    const fresh = await registry();

    expect(fresh.metadata()).toHaveLength(CHARACTERISTIC_KEYS.length);
    expect(() => fresh.compute("02x01y2c")).toThrow(
      CharacteristicRegistryError,
    );
    expect(() => fresh.compute("02x01y2c")).toThrow(/isDots/u);
  });

  it("scores the tile-crossing component delta on the Code as filed, not its unit", () => {
    expect(service.tileCrossingComponentDeltaCount("04x01y3c3c")).toBe(40);
    expect(service.tileCrossingComponentDeltaCount("02x01y3c")).toBe(20);
  });

  it("calls a Code reducible only when its unit is narrower than the Code", () => {
    expect(service.isReducible("04x01y3c3c")).toBe(true);
    expect(service.isReducible("02x01y00")).toBe(true);
    expect(service.isReducible("02x01y3c")).toBe(false);
    expect(
      service.isReducible({ columns: 2, digits: "3c", repeats: 3, rows: 1 }),
    ).toBe(false);
  });

  it("stores every nonzero numeric value in key-list order, and no zero or false one", () => {
    const characteristics = service.compute("02x01y2c");

    const stored = service.stored(characteristics, false);

    expect(NUMERIC_CHARACTERISTIC_KEYS[0]).toBe("aNortheastHalfLatinCount");
    expect(characteristics.aNortheastHalfLatinCount).toBe(0);
    expect(Object.keys(stored)).toStrictEqual(
      NUMERIC_CHARACTERISTIC_KEYS.slice(1),
    );
    expect(stored.dotCount).toBe(characteristics.dotCount);
    expect(stored.aSoutheastLatinCount).toBe(
      characteristics.aSoutheastLatinCount,
    );
  });

  it("stores no boolean key when none of them hold, and isReducible only when the Code is reducible", () => {
    const characteristics = service.compute("02x01y2c");

    const irreducible = service.stored(characteristics, false);
    const reducible = service.stored(characteristics, true);

    expect(
      BOOLEAN_CHARACTERISTIC_KEYS.filter((key) => key in irreducible),
    ).toStrictEqual([]);
    expect(irreducible).not.toHaveProperty("isReducible");
    expect(reducible.isReducible).toBe(true);
  });

  it("stores true under every boolean key that holds, after every number, then isReducible last", async () => {
    providers = providers.map((provider, index) =>
      CHARACTERISTIC_KEYS[index] === "isDots"
        ? fake("isDots", "boolean", true)
        : provider,
    );
    const fresh = await registry();
    const characteristics = fresh.compute("02x01y2c");

    const stored = fresh.stored(characteristics, true);

    expect(Object.keys(stored).slice(-2)).toStrictEqual([
      "isDots",
      "isReducible",
    ]);
    expect(stored.isDots).toBe(true);
  });
});
