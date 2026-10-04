import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { MEANDER_FAMILIES } from "../../classification/classification.constants";

import type { StoredCharacteristics } from "../../characteristics/characteristics.types";
import type { MeanderFamily } from "../../classification/classification.types";

/**
 * One row of the committed `output/meanders.sqlite` database: a single
 * meander addressed by its Code, decoded and rendered by the generic,
 * family-agnostic pipeline.
 *
 * `code` is unbounded text, because several families' full Codes outgrow
 * the 255-byte filesystem path component a file per Code once needed.
 *
 * A meander's identity is its lattice address: the Code together with its
 * `rows` and `columns`. `identify` names a tile by its points, not by its
 * shape, so the same four characters can be two different drawings.
 *
 * `isHardcoded` says whether the row was ingested from the historical corpus,
 * which is also how a Code named at the command line is recorded, rather
 * than found by the enumerator. `family` is `ClassificationService`'s
 * verdict for an enumerated row and the filed family for a hardcoded one.
 *
 * Every column describes the row itself; every measured Characteristic
 * lives in the one {@link characteristics} map.
 */
@Entity({ name: "meanders" })
@Index(["code"], { unique: true })
export class Meander {
  /**
   * Every Characteristic the meander has, as one sparse JSON object: see
   * {@link StoredCharacteristics}. A numeric key holds its nonzero value, and
   * a boolean key — `isReducible` included — holds `true`; a zero or `false`
   * is left out. One map rather than a column each because the letters alone
   * outnumber the 2,000 columns one SQLite table holds, and because one map
   * takes a new or renamed Characteristic with no schema change. A raw SQL
   * reader filtering on zero or less than must read
   * `COALESCE(json_extract(characteristics, '$.key'), 0)`, since a missing
   * key extracts as NULL.
   */
  @Column({ type: "simple-json" })
  characteristics!: StoredCharacteristics;

  @Column({ type: "text" })
  code!: string;

  @Column({ type: "int" })
  columns!: number;

  @Column({ enum: MEANDER_FAMILIES, type: "simple-enum" })
  family!: MeanderFamily;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "boolean" })
  isHardcoded!: boolean;

  @Column({ type: "text" })
  lattice!: string;

  @Column({ default: 1, type: "int" })
  repeats!: number;

  @Column({ type: "int" })
  rows!: number;
}
