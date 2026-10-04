import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  LEGACY_FIELD_KEYS,
  LEGACY_FIELDS,
  LEGACY_REDUCIBILITY,
  LEGACY_TILE_CROSSING_COMPONENT_DELTAS,
} from "../../../testing/legacy-characteristics";
import { tiled } from "../../../testing/meanders";
import { CodeService } from "../code/code.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";

import { CHARACTERISTIC_KEYS } from "./characteristics.constants";
import { CharacteristicsModule } from "./characteristics.module";
import { CharacteristicsService } from "./characteristics.service";

import type { Characteristics } from "./characteristics.types";

/** The Codes the retired computation's values were captured for. */
const FIXTURE_CODES = Object.keys(LEGACY_FIELDS);

/** How many times side by side each fixture is drawn when its tilings are read. */
const TILINGS = [1, 2, 3] as const;

/** A fixture's captured legacy fields, keyed by their new record keys. */
function legacyFields(code: string): Record<string, boolean | number> {
  const values = (LEGACY_FIELDS[code] ?? "").split(" ");

  return Object.fromEntries(
    LEGACY_FIELD_KEYS.map((key, index) => [
      key,
      legacyValue(values[index] ?? ""),
    ]),
  );
}

/** One captured value as it was written down: `true`/`false` as booleans, anything else as a number. */
function legacyValue(written: string): boolean | number {
  if (written === "true") return true;
  if (written === "false") return false;

  return Number(written);
}

/** One run of a space-separated capture per tiling, split on ` | ` when the capture holds several values per tiling. */
function perTiling(capture: string | undefined): string[] {
  return (capture ?? "").split(" | ");
}

/** The same fields read off a record, with `tileCrossing` read as the retired flag `tileCrossingCount > 0` replaces. */
function recordFields(
  characteristics: Characteristics,
): Record<string, boolean | number> {
  return Object.fromEntries(
    LEGACY_FIELD_KEYS.map((key) => [
      key,
      key === "tileCrossing"
        ? characteristics.tileCrossingCount > 0
        : characteristics[key],
    ]),
  );
}

/**
 * Pins the evaluators `CharacteristicsService` orchestrates to the values
 * the retired monolithic computation produced for the same Codes, captured
 * in `testing/legacy-characteristics.ts` before that computation was
 * deleted — a golden test rather than a parity test, since there is no
 * longer anything to run beside it.
 */
describe(CharacteristicsService, () => {
  let codeService: CodeService;
  let service: CharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule],
    }).compile();
    await module.init();

    codeService = module.get(CodeService);
    service = module.get(CharacteristicsService);
  });

  it("discovers exactly one evaluator per key in the key list, in its order", () => {
    expect(service.metadata().map((metadata) => metadata.key)).toStrictEqual([
      ...CHARACTERISTIC_KEYS,
    ]);
  });

  it("gives every record exactly the key list's fields", () => {
    const characteristics = service.compute("02x03y56cca9");

    expect(Object.keys(characteristics).toSorted()).toStrictEqual(
      [...CHARACTERISTIC_KEYS].toSorted(),
    );
  });

  it("names the three rotated tilings among its fixtures", () => {
    expect(FIXTURE_CODES).toStrictEqual(
      expect.arrayContaining([
        "04x03y37375a5ab3b3",
        "04x04y4040b7b75a5ab3b3",
        "04x04y5252f3f396963b3b",
      ]),
    );
  });

  describe.each(FIXTURE_CODES)("%s", (code) => {
    it("records every field the retired computation produced, at the value it produced", () => {
      expect(recordFields(service.compute(code))).toStrictEqual(
        legacyFields(code),
      );
    });

    it("reads a parsed Code the same as its formatted string", () => {
      expect(service.compute(codeService.parse(code))).toStrictEqual(
        service.compute(code),
      );
    });

    it.each(TILINGS)(
      "computes the same record for the Code drawn %i times side by side",
      (times) => {
        const filed = tiled(codeService.parse(code), times);

        expect(service.compute(filed)).toStrictEqual(service.compute(code));
      },
    );

    it.each(TILINGS)(
      "scores the tile-crossing component delta of every column rotation as the retired computation did, tiled %i times",
      (times) => {
        const filed = tiled(codeService.parse(code), times);
        const scores = Array.from({ length: filed.columns }, (_unused, shift) =>
          String(
            service.tileCrossingComponentDeltaCount(
              codeService.rotate(filed, shift),
            ),
          ),
        );

        expect(scores.join(" ")).toBe(
          perTiling(LEGACY_TILE_CROSSING_COMPONENT_DELTAS[code])[times - 1],
        );
      },
    );

    it.each(TILINGS)(
      "calls the Code reducible as the retired computation did, tiled %i times",
      (times) => {
        const filed = tiled(codeService.parse(code), times);

        expect(String(service.isReducible(filed))).toBe(
          (LEGACY_REDUCIBILITY[code] ?? "").split(" ")[times - 1],
        );
      },
    );
  });

  /**
   * Restores the breadth the retired `compute` unit test's "historical
   * corpus" suite gave the tiling invariance, over the whole committed
   * corpus rather than the handful of fixtures above.
   */
  it.each(HISTORICAL_CORPUS)(
    "computes the same record for $code drawn twice side by side",
    (entry) => {
      const parsed = codeService.parse(entry.code, entry.rows, entry.columns);
      const doubled = tiled(parsed, 2);

      expect(service.compute(doubled)).toStrictEqual(service.compute(parsed));
    },
  );
});
