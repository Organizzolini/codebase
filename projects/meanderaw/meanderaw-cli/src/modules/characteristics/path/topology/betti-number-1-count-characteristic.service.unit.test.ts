import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";

import { BettiNumber1CountCharacteristicService } from "./betti-number-1-count-characteristic.service";

describe(BettiNumber1CountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: BettiNumber1CountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        BettiNumber1CountCharacteristicService,
        CharacteristicContextService,
        ConnectivityService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(BettiNumber1CountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: "02x02y65a9", expected: 1, shape: "a closed unit square loop" },
    {
      code: "03x03y567def9ab",
      expected: 4,
      shape:
        "four unit squares sharing walls, two of them closing across the tile boundary",
    },
    { code: "03x02y2712b1", expected: 0, shape: "a branching tree" },
    { code: "01x03y000", expected: 0, shape: "three isolated dots" },
    {
      code: "01x03y303",
      expected: 2,
      shape:
        "a band of two rules that close only across the tile boundary, with a dot row between them",
    },
    {
      code: "02x02y56a9",
      expected: 1,
      shape: "a zigzag whose ink closes through its own next repeat",
    },
  ])("counts $expected independent loops in $shape", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });
});
