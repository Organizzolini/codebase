import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { EndUtilitiesService } from "./end-utilities.service";

describe(EndUtilitiesService, () => {
  let service: EndUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [EndUtilitiesService],
    }).compile();

    service = await module.resolve(EndUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds no free ends over no edges", () => {
    expect(service.freeEndPoints([])).toStrictEqual([]);
  });

  it("finds both ends of an open chain", () => {
    const points = service.freeEndPoints([{ from: "0,0", to: "0,1" }]);

    expect(points).toStrictEqual(
      expect.arrayContaining([
        { column: 0, row: 0 },
        { column: 1, row: 0 },
      ]),
    );
    expect(points).toHaveLength(2);
  });

  it("finds no free ends in a closed loop", () => {
    const points = service.freeEndPoints([
      { from: "0,0", to: "0,1" },
      { from: "0,1", to: "1,1" },
      { from: "1,1", to: "1,0" },
      { from: "1,0", to: "0,0" },
    ]);

    expect(points).toStrictEqual([]);
  });

  it("falls back to the origin when a key fails to parse", () => {
    const points = service.freeEndPoints([{ from: "NaN,NaN", to: "1,1" }]);

    expect(points).toStrictEqual(
      expect.arrayContaining([
        { column: 0, row: 0 },
        { column: 1, row: 1 },
      ]),
    );
    expect(points).toHaveLength(2);
  });
});
