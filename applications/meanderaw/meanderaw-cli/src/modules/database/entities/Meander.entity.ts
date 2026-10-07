import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import type { StoredCharacteristics } from "../../characteristics/characteristics.types";

/**
 * One row of the `meanders` table, in the schema
 * `MEANDERAW_POSTGRES_SCHEMA` names: a single meander addressed by its Code,
 * decoded and rendered by the generic pipeline.
 *
 * `code` is unbounded text, because the widest full Codes outgrow
 * the 255-byte filesystem path component a file per Code once needed.
 *
 * A meander's identity is its formatted Code, `{columns}x{rows}y{lattice}`
 * with an `r{repeats}` suffix past one repeat, so the one unique index over
 * `code` is the whole of it. The bare lattice alone is not: `identify` names
 * a tile by its points, not by its shape, so the same four characters can be
 * two different drawings. `lattice`, `rows`, and `columns` are kept beside it
 * as columns of their own for a reader to filter on.
 *
 * `isHardcoded` says whether the row was ingested from the historical corpus,
 * which is also how a Code named at the command line is recorded, rather
 * than found by the enumerator.
 *
 * Every column describes the row itself; every measured Characteristic
 * lives in the one {@link characteristics} map, and a meander is found by
 * filtering on that map rather than by any label stored beside it. The index
 * over `(rows, columns, code)` is the order a page lists rows in.
 */
@Entity({ name: "meanders" })
@Index(["code"], { unique: true })
@Index(["rows", "columns", "code"])
export class Meander {
  /**
   * Every Characteristic the meander has, as one sparse JSON object: see
   * {@link StoredCharacteristics}. A numeric key holds its nonzero value, and
   * a boolean key — `isReducible` included — holds `true`; a zero or `false`
   * is left out. One map rather than a column each because the letters alone
   * outnumber the 1,600 columns one Postgres table holds, and because one map
   * takes a new or renamed Characteristic with no schema change. `jsonb`
   * rather than text, so one key can be read and indexed in SQL. A raw SQL
   * reader filtering on zero or less than must read
   * `COALESCE((characteristics ->> 'key')::numeric, 0)`, since a missing key
   * reads as NULL.
   */
  @Column({ type: "jsonb" })
  characteristics!: StoredCharacteristics;

  @Column({ type: "text" })
  code!: string;

  @Column({ type: "int" })
  columns!: number;

  /**
   * A uuidv7 the database assigns on insert, so ids sort by when their rows
   * were written. Postgres 18's native `uuidv7()` rather than a
   * TypeORM-generated one: TypeORM only generates version 4, and a bulk
   * `insert` skips any per-entity hook that could generate one here.
   */
  @PrimaryColumn({ default: () => "uuidv7()", type: "uuid" })
  id!: string;

  @Column({ type: "boolean" })
  isHardcoded!: boolean;

  @Column({ type: "text" })
  lattice!: string;

  @Column({ default: 1, type: "int" })
  repeats!: number;

  @Column({ type: "int" })
  rows!: number;

  /**
   * The Codes of every other member of this meander's symmetry class — its
   * mirror, its flip, and both — each at its own canonical phase, sorted.
   * The draw run keeps one row per class, so these are the meanders folded
   * into this one; empty when every reflection maps the meander onto
   * itself. See `CodeService.symmetricalCodes`. Defaults to empty so a
   * database written before the column existed gains it in place when the
   * schema synchronizes, rather than refusing to open.
   */
  @Column({ default: "", type: "simple-array" })
  symmetricalCodes!: string[];
}
