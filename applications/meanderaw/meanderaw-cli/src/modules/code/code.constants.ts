// ♟️ Constants

/**
 * Matches a self-contained Code string in the format `{columns}x{rows}y{lattice}r{repeats}`
 * (or without the `r` suffix), case-insensitively.
 */
export const CODE_FORMAT_PATTERN =
  /^(?<columns>\d+)x(?<rows>\d+)y(?<digits>[^r]+?)(?:r(?<repeats>\d+))?$/iu;

/** Matches exactly one hexadecimal digit, upper or lower case. */
export const HEXADECIMAL_DIGIT_PATTERN = /^[0-9a-f]$/iu;

// 🚨 Errors

/**
 * Thrown when a Code carries a character outside the hexadecimal alphabet.
 *
 * Named after the whole Code rather than the character's own position,
 * since a decoder reading one digit at a time has nothing more specific to
 * blame a misspelling on.
 */
export class InvalidCodeCharacterError extends Error {
  constructor(character: string, code: string) {
    super(
      `Code "${code}" carries "${character}", which is not a hexadecimal digit`,
    );
    this.name = "InvalidCodeCharacterError";
  }
}

/**
 * Thrown when a Code string cannot be parsed as a self-contained code
 * format (`{columns}x{rows}y{lattice}r{repeats}`).
 */
export class InvalidCodeFormatError extends Error {
  constructor(code: string) {
    super(
      `Code "${code}" is not formatted as "{columns}x{rows}y{lattice}r{repeats}"`,
    );
    this.name = "InvalidCodeFormatError";
  }
}

/**
 * Thrown when a Code's length disagrees with the grid `rows` and `columns`
 * describe: one hexadecimal character per interior lattice point, and a
 * grid of `rows` rows has `rows` of those, `columns` wide.
 */
export class InvalidCodeLengthError extends Error {
  constructor(code: string, rows: number, columns: number) {
    const expected = rows * columns;
    super(
      `Code "${code}" is ${code.length} characters, but ${rows} rows and ${columns} columns need ${expected}`,
    );
    this.name = "InvalidCodeLengthError";
  }
}
