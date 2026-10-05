import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";
import { PointUtilitiesService } from "../../submatrix/point/point-utilities.service";

import { ReversesAtItsTightestTurnCharacteristicService } from "./reverses-at-its-tightest-turn-characteristic.service";

describe(ReversesAtItsTightestTurnCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: ReversesAtItsTightestTurnCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ConnectivityService,
        PointUtilitiesService,
        ReversesAtItsTightestTurnCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      ReversesAtItsTightestTurnCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    {
      code: { columns: 1, digits: "", repeats: 1, rows: 0 },
      expected: false,
      shape: "an empty Code",
    },
    {
      code: { columns: 1, digits: "0", repeats: 1, rows: 1 },
      expected: false,
      shape: "a lone bare point",
    },
    {
      code: { columns: 2, digits: "21", repeats: 1, rows: 1 },
      expected: false,
      shape: "a single straight edge with no turn to judge",
    },
    {
      code: { columns: 2, digits: "2100", repeats: 1, rows: 2 },
      expected: false,
      shape: "an isolated horizontal dash",
    },
    {
      code: { columns: 2, digits: "4080", repeats: 1, rows: 2 },
      expected: false,
      shape: "an isolated vertical dash",
    },
    {
      code: { columns: 2, digits: "4488", repeats: 1, rows: 2 },
      expected: false,
      shape: "an i shape with no turn at all",
    },
    {
      code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 },
      expected: true,
      shape:
        "an L shape, whose single turn lands one step after the walk starts",
    },
    {
      code: { columns: 2, digits: "44a9", repeats: 1, rows: 2 },
      expected: true,
      shape: "a U shape",
    },
    {
      code: { columns: 2, digits: "65a9", repeats: 1, rows: 2 },
      expected: true,
      shape: "a closed O shape",
    },
    {
      code: { columns: 2, digits: "9a56", repeats: 1, rows: 2 },
      expected: false,
      shape: "a plus shape whose four single-edge components never turn",
    },
    {
      code: { columns: 1, digits: "7", repeats: 1, rows: 1 },
      expected: false,
      shape: "a T-junction",
    },
    {
      code: { columns: 1, digits: "f", repeats: 1, rows: 1 },
      expected: false,
      shape: "an X-junction",
    },
    {
      code: { columns: 3, digits: "50690a", repeats: 1, rows: 2 },
      expected: true,
      shape: "a loop whose turn lands one step after the tile crossing",
    },
    {
      code: { columns: 4, digits: "235000c000a1", repeats: 1, rows: 3 },
      expected: true,
      shape:
        "an S-bend whose second turn is the opposite hand from its first, one step later",
    },
    {
      code: { columns: 5, digits: "0000002350000a1", repeats: 1, rows: 3 },
      expected: false,
      shape:
        "a right turn immediately followed by a left turn, with no straight step between them to reset",
    },
  ])("reports $expected for $shape", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });
});
