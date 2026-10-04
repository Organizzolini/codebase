import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MEANDER_INSERT_CHUNK_SIZE } from "./database.constants";
import { Meander } from "./entities/Meander.entity";

import type { MeanderRecord } from "./database.types";

/**
 * Persists meanders to the committed sqlite database. Holds no decoding or
 * rendering logic of its own — every field it writes arrives already
 * computed, so this is the one seam between the generic rendering pipeline
 * and TypeORM.
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

  // 🌎 Public Methods

  /**
   * Deletes every meander row and restarts the table's id sequence, so a
   * sweep regenerates the committed database rather than colliding
   * with the rows it already holds.
   *
   * Only the `meanders` table the sweep writes is touched — any other table
   * survives. Resetting its `sqlite_sequence` entry as well is what lets a
   * regenerated sweep number its rows exactly as a sweep into an empty file
   * would, rather than continuing from the old maximum id. One transaction,
   * so a failure leaves the committed rows in place.
   */
  async clear(): Promise<void> {
    const { tableName } = this.meanderRepository.metadata;

    await this.meanderRepository.manager.transaction(async (manager) => {
      await manager.clear(Meander);
      await manager.query("DELETE FROM sqlite_sequence WHERE name = ?", [
        tableName,
      ]);
    });
  }

  /**
   * Reads every meander row committed so far, for `DrawIndexService` to build
   * the static index page from.
   *
   * Whole-table rather than paged: the page it feeds is itself unpaged, per
   * spec #813's own "Out of Scope" section, so reading it in one pass is no
   * more than the page already has to hold in memory to render.
   */
  async findAll(): Promise<Meander[]> {
    return this.meanderRepository.find();
  }

  /**
   * Finds one meander by its lattice address, which is its identity.
   */
  async findOneByLattice(
    lattice: string,
    rows: number,
    columns: number,
  ): Promise<Meander | null> {
    return this.meanderRepository.findOneBy({ columns, lattice, rows });
  }

  /**
   * Writes one meander row, letting the database assign its `id`.
   *
   * Refuses — by rejecting, through the unique index over `code`, `rows`
   * and `columns`, rather than by checking here — a lattice address a row
   * already committed carries, since that triple is a meander's whole
   * identity and two rows sharing one would mean the same meander was
   * recorded twice. See `Meander`'s own doc comment for why the Code alone
   * is not that identity.
   */
  async save(record: MeanderRecord): Promise<Meander> {
    return this.meanderRepository.save(record);
  }

  /**
   * Writes many meander rows, in chunks, and answers with how many were
   * written.
   *
   * `insert` rather than `save`, because these rows are new by
   * construction — the sweep walks a space, it does not revisit one — and
   * `save` would issue a lookup per row to decide whether it was updating.
   * The sweep writes 30,279 of them.
   *
   * One transaction around the whole batch rather than one per chunk. The
   * driver would otherwise commit each statement on its own, and a commit is
   * the expensive part of a write — the sweep's 30,279 rows take about a
   * fifth as long this way. It also makes the refusal below whole: a batch
   * that hits a duplicate leaves no half-written shape behind.
   *
   * Chunked because a single statement's parameter count is bounded, so a
   * whole shape's worth of rows in one statement is a limit nobody declared
   * being reached at some row count nobody chose. The chunk size is a size, not a tuning knob: what
   * matters is that it is bounded.
   *
   * A duplicate lattice address is refused by the unique index over `code`,
   * `rows` and `columns`, exactly as {@link save} is, which is spec #813's
   * thirty-second user story — a duplicate is a build failure rather than a
   * convention nobody checks. The refusal rejects the whole chunk rather
   * than one row, since a sweep that carried on past a colliding address
   * would commit a database missing rows nobody counted.
   */
  async saveAll(records: readonly MeanderRecord[]): Promise<number> {
    await this.meanderRepository.manager.transaction(async (manager) => {
      for (
        let start = 0;
        start < records.length;
        start += MEANDER_INSERT_CHUNK_SIZE
      ) {
        await manager.insert(
          Meander,
          records.slice(start, start + MEANDER_INSERT_CHUNK_SIZE),
        );
      }
    });

    return records.length;
  }
}
