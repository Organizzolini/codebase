import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service";
import { EnumerationService } from "../enumeration/enumeration.service";

import { DrawPoolService } from "./draw-pool.service";

import type { MeanderShape } from "../database/database.types";

/**
 * The draw run's lattice-first half: it enumerates the whole unit space, builds
 * one row per meander found, and writes them to the database.
 *
 * It runs beside the old file-writing halves rather than in place of them.
 * Those still draw the nine procedural families into `output/`, and retiring
 * them is issue #819's work, after the hardcoded corpus has been ingested —
 * so for now the draw run does both and the two corpora sit side by side.
 *
 * Every row it writes is `isHardcoded: false`: found by a search over the
 * space rather than named by a person, which is the whole of what that
 * column distinguishes.
 *
 * Nothing here filters. A meander whose structure satisfies no family's
 * defining combination is written with a null family, exactly as spec #813
 * asks — enumeration produces every structurally distinct repeat within
 * budget, and membership is read off each meander's own structure
 * afterwards rather than decided before by a generator.
 */
@Injectable()
export class DrawEnumerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(DrawPoolService)
    private readonly drawPoolService: DrawPoolService,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(EnumerationService)
    private readonly enumerationService: EnumerationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Every shape the budget admits, drawn and written — which is what `draw` with no drawing named now does. */
  async drawAll(): Promise<number> {
    return this.persist(this.enumerationService.shapes());
  }

  /**
   * Draws the shapes named and writes every meander they hold, one shape's
   * rows at a time, answering with how many were written.
   *
   * A shape at a time rather than the whole draw run at once: the largest
   * shape alone holds 1,049,600 meanders, and holding every shape's rows in
   * memory before writing any of them buys nothing. Each shape is drawn
   * across `DrawPoolService`'s worker threads, which are ended once the last
   * shape is written — or the draw run fails — so none outlives it.
   *
   * A meander whose Code a row of its shape already holds is skipped rather
   * than written: the hardcoded corpus is ingested first, and a hardcoded
   * row keeps its Code and hand-filed family over the enumerated meander
   * that shares it. Only enumerated meanders are folded by symmetry; a
   * hardcoded mirror or flip of one stays a row of its own.
   */
  async persist(shapes: readonly MeanderShape[]): Promise<number> {
    let written = 0;

    try {
      for (const shape of shapes) {
        const held = await this.databaseService.codes(shape);
        const records = await this.drawPoolService.records(shape);

        written += await this.databaseService.saveAll(
          records.filter(({ code }) => !held.has(code)),
        );
      }
    } finally {
      await this.drawPoolService.close();
    }

    return written;
  }
}
