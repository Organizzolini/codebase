import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CrossCountCharacteristicService } from "../submatrix/cross/cross-count-characteristic.service";
import { ForkCountCharacteristicService } from "../submatrix/fork/fork-count-characteristic.service";

import { CompoundUtilitiesService } from "./compound-utilities.service";

import type { CharacteristicContext } from "../characteristics.types";

describe(CompoundUtilitiesService, () => {
  const context: CharacteristicContext = {
    code: { columns: 1, digits: "0", repeats: 1, rows: 1 },
    columns: 1,
    matrix: [[{ east: false, north: false, south: false, west: false }]],
    rows: 1,
  };
  const counts = { crossCount: 0, forkCount: 0 };
  let service: CompoundUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CompoundUtilitiesService,
        {
          provide: CrossCountCharacteristicService,
          useValue: { compute: (): number => counts.crossCount },
        },
        {
          provide: ForkCountCharacteristicService,
          useValue: { compute: (): number => counts.forkCount },
        },
      ],
    }).compile();

    service = await module.resolve(CompoundUtilitiesService);
  });

  beforeEach(() => {
    Object.assign(counts, { crossCount: 0, forkCount: 0 });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { crossCount: 0, expected: true, forkCount: 0 },
    { crossCount: 0, expected: false, forkCount: 1 },
    { crossCount: 1, expected: false, forkCount: 0 },
    { crossCount: 2, expected: false, forkCount: 3 },
  ])(
    "reports junction-free $expected for $forkCount forks and $crossCount crosses",
    ({ crossCount, expected, forkCount }) => {
      Object.assign(counts, { crossCount, forkCount });

      expect(service.isJunctionFree(context)).toBe(expected);
    },
  );
});
