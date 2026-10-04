import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  MEANDER_INSERT_CHUNK_SIZE,
  MEANDER_READ_BATCH_SIZE,
} from "./database.constants";
import { Meander } from "./entities/Meander.entity";

import type { MeanderFamily } from "../classification/classification.types";
import type {
  MeanderFamilyShapeCount,
  MeanderRecord,
  MeanderShape,
} from "./database.types";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata.js";

/**
 * Persists meanders to the Postgres database `MEANDERAW_POSTGRES_DB` names.
 * Holds no decoding or rendering logic of its own — every field it writes
 * arrives already computed, so this is the one seam between the generic
 * rendering pipeline and TypeORM.
 */
@Injectable()
export class DatabaseService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Meander)
    private readonly meanderRepository: Repository<Meander>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * One record's value for one column, in the form the database stores it:
   * a `simple-array` joined, a `simple-json` serialized, exactly as
   * TypeORM's own `insert` would write it. A column the record leaves out
   * takes its declared default, which is what an `insert` naming no value
   * for it would have stored.
   */
  private persistentValue(
    record: MeanderRecord,
    column: ColumnMetadata,
  ): unknown {
    const value: unknown = column.getEntityValue(record);

    if (value === undefined) {
      return column.default;
    }

    return this.meanderRepository.manager.dataSource.driver.preparePersistentValue(
      value,
      column,
    );
  }

  // 🌎 Public Methods

  /**
   * Deletes every meander row, so a sweep regenerates the database rather
   * than colliding with the rows it already holds.
   *
   * Only the `meanders` table the sweep writes is touched — any other table
   * survives. One `TRUNCATE`, which Postgres runs in its own transaction, so
   * a failure leaves the rows in place. Ids are uuidv7s rather than a
   * sequence, so there is no counter to restart.
   */
  async clear(): Promise<void> {
    await this.meanderRepository.clear();
  }

  /**
   * Every Code the rows of one shape hold, for the sweep to skip: a
   * hardcoded row ingested first keeps its Code, and an enumerated meander
   * with the same Code is not written beside it.
   */
  async codes(shape: MeanderShape): Promise<Set<string>> {
    const rows = await this.meanderRepository.find({
      select: { code: true },
      where: { columns: shape.columns, rows: shape.rows },
    });

    return new Set(rows.map(({ code }) => code));
  }

  /**
   * One family's rows in batches of `batchSize`, ordered by rows, then
   * columns, then Code — the order its page lists them in.
   *
   * Each batch resumes after the last row of the one before, through the
   * index over `(family, rows, columns, code)`, so reading a family of a
   * million rows never holds more than one batch in memory or reads a row
   * twice.
   */
  async *familyRows(
    family: MeanderFamily,
    batchSize = MEANDER_READ_BATCH_SIZE,
  ): AsyncGenerator<Meander[]> {
    let after: Meander | undefined;

    do {
      const query = this.meanderRepository
        .createQueryBuilder("meander")
        .where("meander.family = :family", { family })
        .orderBy("meander.rows")
        .addOrderBy("meander.columns")
        .addOrderBy("meander.code")
        .limit(batchSize);

      if (after !== undefined) {
        query.andWhere(
          "(meander.rows, meander.columns, meander.code) > (:rows, :columns, :code)",
          { code: after.code, columns: after.columns, rows: after.rows },
        );
      }

      const batch = await query.getMany();

      after = batch.at(-1);

      if (after !== undefined) {
        yield batch;
      }
    } while (after !== undefined);
  }

  /**
   * How many rows each family holds at each shape, so a page can print every
   * count before it reads a row.
   */
  async familyShapeCounts(): Promise<MeanderFamilyShapeCount[]> {
    const counted = await this.meanderRepository
      .createQueryBuilder("meander")
      .select("meander.family", "family")
      .addSelect("meander.rows", "rows")
      .addSelect("meander.columns", "columns")
      .addSelect("COUNT(*)", "count")
      .groupBy("meander.family")
      .addGroupBy("meander.rows")
      .addGroupBy("meander.columns")
      .getRawMany<{
        columns: number;
        count: string;
        family: MeanderFamily;
        rows: number;
      }>();

    return counted.map(({ columns, count, family, rows }) => ({
      columns,
      count: Number(count),
      family,
      rows,
    }));
  }

  /**
   * Finds one meander by its formatted Code, which is its identity: the
   * Code already spells out its columns, rows, lattice, and repeats.
   */
  async findOneByCode(code: string): Promise<Meander | null> {
    return this.meanderRepository.findOneBy({ code });
  }

  /**
   * Writes one meander row, letting the database assign its `id`.
   *
   * Refuses — by rejecting, through the unique index over `code`, rather
   * than by checking here — a Code a row already committed carries, since
   * the formatted Code is a meander's whole identity and two rows sharing
   * one would mean the same meander was recorded twice.
   */
  async save(record: MeanderRecord): Promise<Meander> {
    return this.meanderRepository.save(record);
  }

  /**
   * Writes many meander rows, in chunks, and answers with how many were
   * written.
   *
   * One prepared multi-row `INSERT` per chunk rather than `insert` or
   * `save`. These rows are new by construction — the sweep walks a space, it
   * does not revisit one — so `save`'s lookup per row is wasted, and
   * `insert` still spends about 100 µs a row building its statement and
   * reading back generated ids nobody uses. The sweep writes 2,331,597 rows,
   * so that bookkeeping alone was minutes. Each value is still converted by
   * the driver's own `preparePersistentValue`, so a row reads back exactly
   * as `save` would have stored it. Placeholders are Postgres's numbered
   * `$n`, and the table is named by its schema-qualified path, because a raw
   * statement resolves an unqualified name through the connection's search
   * path rather than through the entity's schema.
   *
   * One transaction around the whole batch rather than one per chunk. The
   * driver would otherwise commit each statement on its own, and a commit is
   * the expensive part of a write — the sweep's rows took about a fifth as
   * long this way, measured when it wrote 30,279. It also makes the refusal
   * below whole: a batch that hits a duplicate leaves no half-written shape
   * behind.
   *
   * Chunked because a single statement's parameter count is bounded, so a
   * whole shape's worth of rows in one statement is a limit nobody declared
   * being reached at some row count nobody chose. The chunk size is a size,
   * not a tuning knob: what matters is that it is bounded.
   *
   * A duplicate Code is refused by the unique index over `code`, exactly as
   * {@link save} is, which is spec #813's
   * thirty-second user story — a duplicate is a build failure rather than a
   * convention nobody checks. The refusal rejects the whole chunk rather
   * than one row, since a sweep that carried on past a colliding address
   * would commit a database missing rows nobody counted.
   */
  async saveAll(records: readonly MeanderRecord[]): Promise<number> {
    const { columns, tablePath } = this.meanderRepository.metadata;
    // A generated column, or one whose default is a SQL expression such as
    // `id`'s `uuidv7()`, is the database's to fill rather than the row's.
    const written = columns.filter(
      (column) => !column.isGenerated && typeof column.default !== "function",
    );
    const table = tablePath
      .split(".")
      .map((part) => `"${part}"`)
      .join(".");
    const names = written.map(({ databaseName }) => `"${databaseName}"`);

    await this.meanderRepository.manager.transaction(async (manager) => {
      for (
        let start = 0;
        start < records.length;
        start += MEANDER_INSERT_CHUNK_SIZE
      ) {
        const chunk = records.slice(start, start + MEANDER_INSERT_CHUNK_SIZE);
        const parameters = chunk.flatMap((record) =>
          written.map((column) => this.persistentValue(record, column)),
        );
        const rows = chunk.map(
          (_record, row) =>
            `(${written.map((_column, column) => `$${row * written.length + column + 1}`).join(", ")})`,
        );

        await manager.query(
          `INSERT INTO ${table} (${names.join(", ")}) VALUES ${rows.join(", ")}`,
          parameters,
        );
      }
    });

    return records.length;
  }
}
