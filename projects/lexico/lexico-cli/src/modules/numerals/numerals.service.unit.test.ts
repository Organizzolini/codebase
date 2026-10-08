import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { NumeralsService } from "./numerals.service";

describe(NumeralsService, () => {
  let service: NumeralsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NumeralsService],
    }).compile();

    service = await module.resolve(NumeralsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("toDecimal", () => {
    it("should correctly convert roman numerals to decimal", () => {
      expect(service.toDecimal("I")).toBe(1);
      expect(service.toDecimal("IV")).toBe(4);
      expect(service.toDecimal("IX")).toBe(9);
      expect(service.toDecimal("XLII")).toBe(42);
      expect(service.toDecimal("MCMXC")).toBe(1990);
      expect(service.toDecimal("MMXXIV")).toBe(2024);
    });

    it("should ignore unknown characters by treating them as zero", () => {
      expect(service.toDecimal("AX")).toBe(10);
      expect(service.toDecimal("I?")).toBe(1);
    });
  });

  describe("toRoman", () => {
    it("should correctly convert decimal to roman numerals", () => {
      expect(service.toRoman(1)).toBe("I");
      expect(service.toRoman(4)).toBe("IV");
      expect(service.toRoman(9)).toBe("IX");
      expect(service.toRoman(8)).toBe("VIII");
      expect(service.toRoman(58)).toBe("LVIII");
      expect(service.toRoman(3888)).toBe("MMMDCCCLXXXVIII");
      expect(service.toRoman(42)).toBe("XLII");
      expect(service.toRoman(1990)).toBe("MCMXC");
      expect(service.toRoman(2024)).toBe("MMXXIV");
    });

    it("should throw for numbers out of range", () => {
      expect(() => service.toRoman(0)).toThrow(
        /Decimal 0 is out of range for Roman numerals/,
      );
      expect(() => service.toRoman(4000)).toThrow(
        /Decimal 4000 is out of range for Roman numerals/,
      );
    });
  });
});
