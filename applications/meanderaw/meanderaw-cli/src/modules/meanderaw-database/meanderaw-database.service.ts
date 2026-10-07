import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Meander } from "./entities/meander.entity";
import {
  MEANDER_INSERT_CHUNK_SIZE,
  MEANDER_READ_BATCH_SIZE,
} from "./meanderaw-database.constants";

import type { PatternCharacteristicKey } from "../characteristics/characteristics.types";
import type {
  MeanderPatternShapeCount,
  MeanderRecord,
  MeanderShape,
} from "./meanderaw-database.types";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata.js";

/**
 * Persists meanders to the Postgres database `MEANDERAW_POSTGRES_DATABASE` names.
 * Holds no decoding or rendering logic of its own — every field it writes
 * arrives already computed, so this is the one seam between the generic
 * rendering pipeline and TypeORM.
 */
@Injectable()
export class MeanderawDatabaseService {
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
   * Deletes every meander row, so a draw run regenerates the database rather
   * than colliding with the rows it already holds.
   *
   * Only the `meanders` table the draw run writes is touched — any other table
   * survives. One `TRUNCATE`, which Postgres runs in its own transaction, so
   * a failure leaves the rows in place. Ids are uuidv7s rather than a
   * sequence, so there is no counter to restart.
   */
  async clear(): Promise<void> {
    await this.meanderRepository.clear();
  }

  /**
   * Every Code the rows of one shape hold, for the draw run to skip: a
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
   * Finds one meander by its formatted Code, which is its identity: the
   * Code already spells out its columns, rows, lattice, and repeats.
   */
  async findOneByCode(code: string): Promise<Meander | null> {
    return this.meanderRepository.findOneBy({ code });
  }

  /**
   * The rows one pattern characteristic holds for, in batches of
   * `batchSize`, ordered by rows, then columns, then Code — the order its
   * page lists them in.
   *
   * Each batch resumes after the last row of the one before, through the
   * index over `(rows, columns, code)`, so reading a pattern of a million
   * rows never holds more than one batch in memory or reads a row twice. A
   * stored boolean is present only when it holds, so `?` is the whole test.
   */
  async *patternRows(
    key: PatternCharacteristicKey,
    batchSize = MEANDER_READ_BATCH_SIZE,
  ): AsyncGenerator<Meander[]> {
    let after: Meander | undefined;

    do {
      const query = this.meanderRepository
        .createQueryBuilder("meander")
        .where("meander.characteristics ? :key", { key })
        .orderBy("meander.rows")
        .addOrderBy("meander.columns")
        .addOrderBy("meander.code")
        .limit(batchSize);

      if (after !== undefined) {
        query.andWhere(
          "(meander.rows, meander.columns, meander.code) > (:rows, :columns, :code)",
          {
            code: after.code,
            columns: after.columns,
            rows: after.rows,
          },
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
   * How many rows each of `keys` holds for at each shape, in one pass over
   * the table, so a page can print every count before it reads a row. A
   * pattern that holds for no row is absent.
   *
   * Raw SQL rather than the query builder, because a set-returning function
   * has to be joined laterally and the builder would quote it as a table.
   */
  async patternShapeCounts(
    keys: readonly PatternCharacteristicKey[],
  ): Promise<MeanderPatternShapeCount[]> {
    const { tablePath } = this.meanderRepository.metadata;
    const counted: {
      columns: string;
      count: string;
      key: PatternCharacteristicKey;
      rows: string;
    }[] = await this.meanderRepository.query(
      `SELECT pattern AS key, meander.rows, meander.columns, COUNT(*) AS count
       FROM ${tablePath} meander
       CROSS JOIN LATERAL jsonb_object_keys(meander.characteristics) AS pattern
       WHERE pattern = ANY($1)
       GROUP BY pattern, meander.rows, meander.columns`,
      [keys],
    );

    // A raw row skips the entity's column transformers, and `pg` returns a
    // `bigint` as a string, so each number is converted here.
    return counted.map(({ columns, count, key, rows }) => ({
      columns: Number(columns),
      count: Number(count),
      key,
      rows: Number(rows),
    }));
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
   * `save`. These rows are new by construction — the draw run walks a space, it
   * does not revisit one — so `save`'s lookup per row is wasted, and
   * `insert` still spends about 100 µs a row building its statement and
   * reading back generated ids nobody uses. The draw run writes 7,059,159 rows,
   * so that bookkeeping alone was minutes. Each value is still converted by
   * the driver's own `preparePersistentValue`, so a row reads back exactly
   * as `save` would have stored it. Placeholders are Postgres's numbered
   * `$n`, and the table is named by its schema-qualified path, because a raw
   * statement resolves an unqualified name through the connection's search
   * path rather than through the entity's schema.
   *
   * One transaction around the whole batch rather than one per chunk. The
   * driver would otherwise commit each statement on its own, and a commit is
   * the expensive part of a write — the draw run's rows took about a fifth as
   * long this way, measured when it wrote 30,279. It also makes the refusal
   * below whole: a batch that hits a duplicate leaves none of its rows
   * behind, and the draw run fails rather than carrying on past it.
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
   * than one row, since a draw run that carried on past a colliding address
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
