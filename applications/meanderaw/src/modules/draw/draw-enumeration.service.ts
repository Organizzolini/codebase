import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service";
import { EnumerationService } from "../enumeration/enumeration.service";

import { DrawRecordService } from "./draw-record.service";

import type { MeanderRecord, MeanderShape } from "../database/database.types";

/**
 * The sweep's lattice-first half: it enumerates the whole unit space, builds
 * one row per meander found, and writes them to the database.
 *
 * It runs beside the old file-writing halves rather than in place of them.
 * Those still draw the nine procedural families into `output/`, and retiring
 * them is issue #819's work, after the hardcoded corpus has been ingested —
 * so for now the sweep does both and the two corpora sit side by side.
 *
 * Every row it writes is `isHardcoded: false`: found by a search over the
 * space rather than named by a person, which is the whole of what that
 * column distinguishes.
 *
 * Nothing here filters. A meander whose structure satisfies no family's
 * defining combination is written with a null family, exactly as spec #813
 * asks — enumeration produces every structurally distinct repeat within
 * budget, and membership is decided afterwards by
 * `DrawIndexService` rather than before by a generator.
 */
@Injectable()
export class DrawEnumerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(DrawRecordService)
    private readonly drawRecordService: DrawRecordService,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(EnumerationService)
    private readonly enumerationService: EnumerationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Enumerates the shapes named and writes every meander they hold, one
   * shape's rows at a time, answering with how many were written.
   *
   * A shape at a time rather than the whole sweep at once, for the reason
   * the old file-writing half already writes a row count at a time: the
   * widest shape alone holds 16,512 meanders, each carrying its own rendered
   * SVG, and holding every shape's rows in memory before writing any of them
   * buys nothing.
   */
  async persist(shapes: readonly MeanderShape[]): Promise<number> {
    let written = 0;

    for (const shape of shapes) {
      written += await this.databaseService.saveAll(this.records(shape));
    }

    return written;
  }

  /** Every meander of one shape, as the rows the database holds for them. */
  records(shape: MeanderShape): MeanderRecord[] {
    return this.enumerationService
      .enumerate(shape)
      .map(({ code }) => this.drawRecordService.record(code, shape, false));
  }

  /** Every shape the budget admits, swept and written — which is what `draw` with no drawing named now does. */
  async sweep(): Promise<number> {
    return this.persist(this.enumerationService.shapes());
  }
}
