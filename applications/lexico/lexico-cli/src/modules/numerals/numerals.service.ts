import { Injectable } from "@nestjs/common";

import { ROMAN_VALUES } from "./numerals.constants";

/**
 * Converts between Roman numeral notation and decimal values used by ingestion flows.
 */
@Injectable()
export class NumeralsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses a Roman numeral string into its decimal integer value.
   */
  public toDecimal(roman: string): number {
    const upperRoman = roman.toUpperCase();
    let decimal = 0;

    for (let index = 0; index < upperRoman.length; index++) {
      const v1 = ROMAN_VALUES[upperRoman.charAt(index)] || 0;
      const v2 = ROMAN_VALUES[upperRoman.charAt(index + 1)] || 0;
      if (index + 1 < upperRoman.length && v1 < v2) {
        decimal -= v1;
      } else {
        decimal += v1;
      }
    }
    return decimal;
  }

  /**
   * Converts a decimal integer (1-3999) into standard Roman numeral notation.
   */
  public toRoman(decimal: number): string {
    if (decimal < 1 || decimal > 3999) {
      throw new Error(
        `Decimal ${decimal} is out of range for Roman numerals (1–3999)`,
      );
    }

    let roman = "";

    /**
     * Converts one decimal digit place into Roman numeral glyphs.
     */
    function convertDigit(args: {
      digit: number;
      low: string;
      mid: string;
      top: string;
    }): void {
      const { digit, low, mid, top } = args;
      if (digit < 4) roman += low.repeat(digit);
      else if (digit === 4) roman += low + mid;
      else if (digit < 9) roman += mid + low.repeat(digit - 5);
      else if (digit === 9) roman += low + top;
    }

    convertDigit({
      digit: Math.floor((decimal % 10_000) / 1000),
      low: "M",
      mid: "",
      top: "",
    });
    convertDigit({
      digit: Math.floor((decimal % 1000) / 100),
      low: "C",
      mid: "D",
      top: "M",
    });
    convertDigit({
      digit: Math.floor((decimal % 100) / 10),
      low: "X",
      mid: "L",
      top: "C",
    });
    convertDigit({
      digit: Math.floor((decimal % 10) / 1),
      low: "I",
      mid: "V",
      top: "X",
    });

    return roman;
  }
}
