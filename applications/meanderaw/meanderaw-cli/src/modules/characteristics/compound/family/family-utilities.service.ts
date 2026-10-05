import { Injectable } from "@nestjs/common";

import type { CodeObject } from "../../../code/code.types";
import type { FamilyRails } from "./family.types";

/**
 * Shared whole-grid readings the family predicates inject: a Code's rows as
 * digit strings, the dimension check a grid template needs before it is
 * read, and the match against a railed template such as bars or mesh.
 */
@Injectable()
export class FamilyUtilitiesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** The Code's digits split into one string per row. */
  public grid(code: CodeObject): readonly string[] {
    const { columns, digits, rows } = code;

    return Array.from({ length: rows }, (_, row) =>
      digits.slice(row * columns, (row + 1) * columns),
    );
  }

  /** Whether the Code spans at least `minimumRows` rows and spells exactly one digit per point. */
  public hasValidDimensions(code: CodeObject, minimumRows: number): boolean {
    return (
      code.rows >= minimumRows &&
      code.digits.length === code.rows * code.columns
    );
  }

  /**
   * Whether the Code spans at least two rows and spells exactly the railed
   * template: its top digit across the first row, its middle digit across
   * every interior row, and its bottom digit across the last row.
   */
  public matchesRails(code: CodeObject, rails: FamilyRails): boolean {
    if (code.rows < 2) {
      return false;
    }

    const expected =
      rails.top.repeat(code.columns) +
      rails.middle.repeat(code.columns).repeat(code.rows - 2) +
      rails.bottom.repeat(code.columns);

    return code.digits === expected;
  }
}
