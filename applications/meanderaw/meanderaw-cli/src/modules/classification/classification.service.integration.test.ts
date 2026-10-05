import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LEGACY_FAMILIES } from "../../../testing/legacy-characteristics";
import { tiled } from "../../../testing/meanders";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { CodeModule } from "../code/code.module";
import { CodeService } from "../code/code.service";

import { ClassificationModule } from "./classification.module";
import { ClassificationService } from "./classification.service";

import type { CodeObject } from "../code/code.types";
import type { MeanderFamily } from "./classification.types";

/** A double chain whose Code is its own repeating unit. */
const DOUBLE_CHAIN = "04x03y35634884a339";

/** How many times side by side each fixture is drawn when its tilings are classified. */
const TILINGS = [1, 2, 3] as const;

/**
 * Classifies real Codes through the real characteristic evaluators, pinned
 * to the families the retired classifier gave the same Codes before the
 * monolithic computation it read was deleted.
 */
describe(ClassificationService, () => {
  let characteristicsService: CharacteristicsService;
  let codeService: CodeService;
  let service: ClassificationService;

  /** The family of a Code as filed, from its record and its filed shape. */
  function familyOf(code: CodeObject): MeanderFamily {
    return service.classify(characteristicsService.compute(code), {
      isReducible: characteristicsService.isReducible(code),
      rows: code.rows,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule, ClassificationModule, CodeModule],
    }).compile();
    await module.init();

    characteristicsService = module.get(CharacteristicsService);
    codeService = module.get(CodeService);
    service = module.get(ClassificationService);
  });

  it("classifies a double chain that is its own unit as a double chain", () => {
    expect(familyOf(codeService.parse(DOUBLE_CHAIN))).toBe("double-chain");
  });

  it("does not classify the same double chain drawn twice as a double chain, though its unit's predicate still holds", () => {
    const filed = tiled(codeService.parse(DOUBLE_CHAIN), 2);

    expect(codeService.format(filed)).toBe("08x03y3563356348844884a339a339");
    expect(characteristicsService.compute(filed).isDoubleChain).toBe(true);
    expect(characteristicsService.isReducible(filed)).toBe(true);
    expect(familyOf(filed)).not.toBe("double-chain");
  });

  describe.each(Object.keys(LEGACY_FAMILIES))("%s", (code) => {
    it.each(TILINGS)(
      "gets the family the retired classifier gave it, tiled %i times",
      (times) => {
        const filed = tiled(codeService.parse(code), times);

        expect(familyOf(filed)).toBe(
          (LEGACY_FAMILIES[code] ?? "").split(" ")[times - 1],
        );
      },
    );
  });
});
