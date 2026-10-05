import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";

import { BettiNumber0CountCharacteristicService } from "./betti-number-0-count-characteristic.service";

describe(BettiNumber0CountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: BettiNumber0CountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        BettiNumber0CountCharacteristicService,
        CharacteristicContextService,
        ConnectivityService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(BettiNumber0CountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "02x02y65a9", expected: 1, shape: "a closed unit square loop" },
    { code: "03x02y2712b1", expected: 1, shape: "a branching tree" },
    { code: "03x01y231", expected: 1, shape: "an open path" },
    { code: "01x03y000", expected: 3, shape: "three isolated dots" },
    {
      code: "03x02y404808",
      expected: 4,
      shape: "two separate bars and two isolated dots",
    },
    {
      code: "01x03y303",
      expected: 3,
      shape:
        "a band of two rules that close only across the tile boundary, with a dot row between them",
    },
  ])(
    "counts $expected connected components in $shape",
    ({ code, expected }) => {
      expect(service.compute(contextService.create(code))).toBe(expected);
    },
  );
});
