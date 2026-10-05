import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { FamilyUtilitiesService } from "./family-utilities.service";

import type { CodeObject } from "../../../code/code.types";

describe(FamilyUtilitiesService, () => {
  const code = (digits: string, rows: number, columns: number): CodeObject => ({
    columns,
    digits,
    repeats: 1,
    rows,
  });
  let service: FamilyUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FamilyUtilitiesService],
    }).compile();

    service = await module.resolve(FamilyUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("grid", () => {
    it("splits a Code's digits into one string per row", () => {
      expect(service.grid(code("61e1a1", 3, 2))).toStrictEqual([
        "61",
        "e1",
        "a1",
      ]);
    });

    it("gives no rows for an empty Code", () => {
      expect(service.grid(code("", 0, 0))).toStrictEqual([]);
    });
  });

  describe("hasValidDimensions", () => {
    it.each([
      { code: code("61e1a1", 3, 2), expected: true, minimumRows: 2 },
      { code: code("61e1a1", 3, 2), expected: true, minimumRows: 3 },
      { code: code("61e1a1", 3, 2), expected: false, minimumRows: 4 },
      { code: code("61e", 3, 2), expected: false, minimumRows: 2 },
      { code: code("", 3, 0), expected: true, minimumRows: 3 },
    ])(
      "reports $expected for $code.digits over $code.rows rows at minimum $minimumRows",
      ({ code: tested, expected, minimumRows }) => {
        expect(service.hasValidDimensions(tested, minimumRows)).toBe(expected);
      },
    );
  });

  describe("matchesRails", () => {
    const bars = { bottom: "8", middle: "c", top: "4" };

    it.each([
      { code: code("48", 2, 1), expected: true },
      { code: code("4cc8", 4, 1), expected: true },
      { code: code("44cc88", 3, 2), expected: true },
      { code: code("4588", 2, 2), expected: false },
      { code: code("4", 1, 1), expected: false },
    ])(
      "reports $expected for $code.digits over $code.rows rows",
      ({ code: tested, expected }) => {
        expect(service.matchesRails(tested, bars)).toBe(expected);
      },
    );
  });
});
