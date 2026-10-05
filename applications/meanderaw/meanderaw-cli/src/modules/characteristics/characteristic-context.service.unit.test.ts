import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../code/code.module";
import { MatrixModule } from "../matrix/matrix.module";

import { CharacteristicContextService } from "./characteristic-context.service";

describe(CharacteristicContextService, () => {
  let service: CharacteristicContextService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [CharacteristicContextService],
    }).compile();

    service = await module.resolve(CharacteristicContextService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a formatted Code into its shape, parsed Code, and decoded matrix", () => {
    const context = service.create("02x01y2c");

    expect(context.rows).toBe(1);
    expect(context.columns).toBe(2);
    expect(context.code).toStrictEqual({
      columns: 2,
      digits: "2c",
      repeats: 1,
      rows: 1,
    });
    expect(context.matrix).toStrictEqual([
      [
        { east: true, north: false, south: false, west: false },
        { east: false, north: true, south: true, west: false },
      ],
    ]);
  });

  it("reduces a repeating Code to its unit", () => {
    const context = service.create("04x01y3c3c");

    expect(context.columns).toBe(2);
    expect(context.code).toStrictEqual({
      columns: 2,
      digits: "3c",
      repeats: 1,
      rows: 1,
    });
    expect(context.matrix[0]).toHaveLength(2);
  });

  it("accepts an already parsed Code", () => {
    const context = service.create({
      columns: 3,
      digits: "303330",
      repeats: 1,
      rows: 2,
    });

    expect(context.rows).toBe(2);
    expect(context.columns).toBe(3);
    expect(context.matrix).toHaveLength(2);
    expect(context.matrix[1]).toHaveLength(3);
  });

  it("re-spells an uppercase parsed Code in lowercase, as the grid predicates read it", () => {
    const context = service.create({
      columns: 3,
      digits: "3C0303",
      repeats: 1,
      rows: 2,
    });

    expect(context.code.digits).toBe("3c0303");
  });

  it("pads a parsed Code short of rows × columns digits with bare points", () => {
    const context = service.create({
      columns: 2,
      digits: "2",
      repeats: 1,
      rows: 1,
    });

    expect(context.code.digits).toBe("20");
    expect(context.code.digits).toHaveLength(context.rows * context.columns);
  });

  it("keeps a repeating Code whole when built unreduced", () => {
    const context = service.createUnreduced("04x01y3c3c");

    expect(context.columns).toBe(4);
    expect(context.code).toStrictEqual({
      columns: 4,
      digits: "3c3c",
      repeats: 1,
      rows: 1,
    });
    expect(context.matrix[0]).toHaveLength(4);
  });

  it("re-spells an unreduced parsed Code the same way", () => {
    const context = service.createUnreduced({
      columns: 2,
      digits: "3C",
      repeats: 2,
      rows: 1,
    });

    expect(context.code).toStrictEqual({
      columns: 2,
      digits: "3c",
      repeats: 2,
      rows: 1,
    });
  });
});
