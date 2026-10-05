import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { GraphModule } from "../../../graph/graph.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { ConnectivityService } from "../../connectivity/connectivity.service";

import { EndUtilitiesService } from "./end-utilities.service";
import { EndsAreLatticeNeighborsCharacteristicService } from "./ends-are-lattice-neighbors-characteristic.service";

describe(EndsAreLatticeNeighborsCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: EndsAreLatticeNeighborsCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, GraphModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ConnectivityService,
        EndsAreLatticeNeighborsCharacteristicService,
        EndUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      EndsAreLatticeNeighborsCharacteristicService,
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
      expected: true,
      shape: "an open chain",
    },
    {
      code: { columns: 2, digits: "2100", repeats: 1, rows: 2 },
      expected: true,
      shape: "an isolated horizontal dash",
    },
    {
      code: { columns: 2, digits: "4080", repeats: 1, rows: 2 },
      expected: true,
      shape: "an isolated vertical dash",
    },
    {
      code: { columns: 2, digits: "4488", repeats: 1, rows: 2 },
      expected: true,
      shape: "an i shape",
    },
    {
      code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 },
      expected: false,
      shape: "an L shape whose ends sit diagonally apart",
    },
    {
      code: { columns: 2, digits: "44a9", repeats: 1, rows: 2 },
      expected: true,
      shape: "a U shape",
    },
    {
      code: { columns: 2, digits: "65a9", repeats: 1, rows: 2 },
      expected: false,
      shape: "a closed O shape with no free ends",
    },
    {
      code: { columns: 2, digits: "9a56", repeats: 1, rows: 2 },
      expected: false,
      shape: "a plus shape with no free ends",
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
      code: { columns: 3, digits: "102", repeats: 1, rows: 1 },
      expected: true,
      shape: "a dash whose ends are neighbors only across the tile crossing",
    },
  ])("reports $expected for $shape", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });
});
